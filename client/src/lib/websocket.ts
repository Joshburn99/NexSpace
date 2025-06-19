import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/hooks/use-auth";

export interface WebSocketMessage {
  type: string;
  data: any;
  timestamp?: string;
}

export interface ChatMessage {
  id: number;
  senderId: number;
  recipientId?: number;
  conversationId?: string;
  content: string;
  messageType: string;
  shiftId?: number;
  createdAt: string;
}

export interface ShiftUpdate {
  id: number;
  status: string;
  assignedStaffIds?: number[];
  [key: string]: any;
}

class WebSocketManager {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private listeners: Map<string, Set<(data: any) => void>> = new Map();
  private isConnected = false;

  constructor() {
    this.connect();
  }

  private connect() {
    try {
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const wsUrl = `${protocol}//${window.location.host}/ws`;
      
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log("WebSocket connected");
        this.isConnected = true;
        this.reconnectAttempts = 0;
        this.notifyListeners("connection", { status: "connected" });
      };

      this.ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          this.handleMessage(message);
        } catch (error) {
          console.error("Failed to parse WebSocket message:", error);
        }
      };

      this.ws.onclose = () => {
        console.log("WebSocket disconnected");
        this.isConnected = false;
        this.notifyListeners("connection", { status: "disconnected" });
        this.handleReconnect();
      };

      this.ws.onerror = (error) => {
        console.error("WebSocket error:", error);
        this.notifyListeners("error", { error });
      };
    } catch (error) {
      console.error("Failed to connect to WebSocket:", error);
      this.handleReconnect();
    }
  }

  private handleMessage(message: WebSocketMessage) {
    console.log("Received WebSocket message:", message);
    this.notifyListeners(message.type, message.data);
  }

  private handleReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
      
      setTimeout(() => {
        this.connect();
      }, this.reconnectDelay * this.reconnectAttempts);
    } else {
      console.error("Max reconnection attempts reached");
      this.notifyListeners("connection", { status: "failed" });
    }
  }

  private notifyListeners(type: string, data: any) {
    const typeListeners = this.listeners.get(type);
    if (typeListeners) {
      typeListeners.forEach(callback => callback(data));
    }
  }

  public subscribe(type: string, callback: (data: any) => void): () => void {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set());
    }
    
    this.listeners.get(type)!.add(callback);

    // Return unsubscribe function
    return () => {
      const typeListeners = this.listeners.get(type);
      if (typeListeners) {
        typeListeners.delete(callback);
        if (typeListeners.size === 0) {
          this.listeners.delete(type);
        }
      }
    };
  }

  public send(message: WebSocketMessage) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      console.warn("WebSocket is not connected. Message not sent:", message);
    }
  }

  public sendChatMessage(recipientId: number, content: string, conversationId?: string, shiftId?: number) {
    this.send({
      type: "chat",
      data: {
        recipientId,
        content,
        conversationId,
        shiftId,
        messageType: "text"
      }
    });
  }

  public sendShiftUpdate(shift: ShiftUpdate) {
    this.send({
      type: "shift_update",
      data: { shift }
    });
  }

  public isConnectedStatus(): boolean {
    return this.isConnected;
  }

  public disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.listeners.clear();
    this.isConnected = false;
  }
}

// Singleton instance
const wsManager = new WebSocketManager();

/**
 * React hook for using WebSocket functionality
 */
export function useWebSocket() {
  const { user } = useAuth();
  const [connectionStatus, setConnectionStatus] = useState<"connecting" | "connected" | "disconnected" | "failed">("connecting");

  useEffect(() => {
    const unsubscribe = wsManager.subscribe("connection", ({ status }) => {
      setConnectionStatus(status);
    });

    return unsubscribe;
  }, []);

  const sendMessage = (recipientId: number, content: string, conversationId?: string, shiftId?: number) => {
    if (!user) {
      console.warn("Cannot send message: user not authenticated");
      return;
    }
    wsManager.sendChatMessage(recipientId, content, conversationId, shiftId);
  };

  const sendShiftUpdate = (shift: ShiftUpdate) => {
    wsManager.sendShiftUpdate(shift);
  };

  const subscribe = (type: string, callback: (data: any) => void) => {
    return wsManager.subscribe(type, callback);
  };

  return {
    connectionStatus,
    isConnected: connectionStatus === "connected",
    sendMessage,
    sendShiftUpdate,
    subscribe,
  };
}

/**
 * React hook for listening to chat messages
 */
export function useChatMessages(conversationId?: string) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  useEffect(() => {
    const unsubscribe = wsManager.subscribe("chat", (message: ChatMessage) => {
      // Filter messages by conversation if specified
      if (!conversationId || message.conversationId === conversationId) {
        setMessages(prev => [...prev, message]);
      }
    });

    return unsubscribe;
  }, [conversationId]);

  return messages;
}

/**
 * React hook for listening to shift updates
 */
export function useShiftUpdates() {
  const [shiftUpdates, setShiftUpdates] = useState<ShiftUpdate[]>([]);

  useEffect(() => {
    const unsubscribe = wsManager.subscribe("shift_update", (update: { shift: ShiftUpdate }) => {
      setShiftUpdates(prev => [...prev, update.shift]);
    });

    return unsubscribe;
  }, []);

  return shiftUpdates;
}

export default wsManager;
