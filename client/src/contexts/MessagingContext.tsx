import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export interface Message {
  id: number;
  senderId: number;
  senderName: string;
  recipientId: number;
  recipientName: string;
  subject: string;
  content: string;
  timestamp: string;
  isRead: boolean;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  category: 'general' | 'support' | 'scheduling' | 'pto' | 'emergency';
}

interface MessagingContextType {
  messages: Message[];
  getMessagesForUser: (userId: number) => Message[];
  getUnreadCount: (userId: number) => number;
  sendMessage: (message: Omit<Message, 'id' | 'timestamp' | 'isRead'>) => void;
  markAsRead: (messageId: number) => void;
  isLoading: boolean;
}

const MessagingContext = createContext<MessagingContextType | undefined>(undefined);

// Sample messages
const sampleMessages: Message[] = [
  {
    id: 1,
    senderId: 1,
    senderName: 'Alice Smith',
    recipientId: 999, // SuperUser ID
    recipientName: 'NexSpace Team',
    subject: 'Schedule Change Request',
    content: 'Hi, I need to request a schedule change for next week due to a family emergency. Please let me know if this is possible.',
    timestamp: '2025-06-20T09:30:00Z',
    isRead: false,
    priority: 'high',
    category: 'scheduling'
  },
  {
    id: 2,
    senderId: 2,
    senderName: 'Bob Johnson',
    recipientId: 999,
    recipientName: 'NexSpace Team',
    subject: 'Credential Update',
    content: 'I have renewed my BLS certification. Please update my profile with the new expiration date.',
    timestamp: '2025-06-19T14:15:00Z',
    isRead: true,
    priority: 'normal',
    category: 'general'
  },
  {
    id: 3,
    senderId: 999,
    senderName: 'NexSpace Team',
    recipientId: 1,
    recipientName: 'Alice Smith',
    subject: 'Schedule Change Approved',
    content: 'Your schedule change request has been approved. Please check your updated schedule in the calendar.',
    timestamp: '2025-06-20T11:00:00Z',
    isRead: false,
    priority: 'normal',
    category: 'scheduling'
  }
];

export const MessagingProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading] = useState(false);

  // Load messages from localStorage on component mount
  useEffect(() => {
    const savedMessages = localStorage.getItem('nexspace-messages');
    if (savedMessages) {
      try {
        const parsedMessages = JSON.parse(savedMessages);
        setMessages([...sampleMessages, ...parsedMessages]);
      } catch (error) {
        console.error('Error parsing saved messages:', error);
        setMessages(sampleMessages);
      }
    } else {
      setMessages(sampleMessages);
    }
  }, []);

  // Save messages to localStorage whenever messages change
  useEffect(() => {
    if (messages.length > 0) {
      const userMessages = messages.filter(msg => !sampleMessages.find(sample => sample.id === msg.id));
      if (userMessages.length > 0) {
        localStorage.setItem('nexspace-messages', JSON.stringify(userMessages));
      }
    }
  }, [messages]);

  const getMessagesForUser = (userId: number): Message[] => {
    return messages.filter(msg => {
      // Include messages sent by user
      if (msg.senderId === userId) return true;
      
      // Include messages addressed to user
      if (msg.recipientId === userId) return true;
      
      // For messages to NexSpace Team (recipientId 999), show in superuser inboxes (user 3)
      if (msg.recipientId === 999 && userId === 3) return true;
      
      return false;
    }).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  };

  const getUnreadCount = (userId: number): number => {
    return messages.filter(msg => {
      if (!msg.isRead) {
        // Count messages directly addressed to user
        if (msg.recipientId === userId) return true;
        
        // Count NexSpace Team messages for superuser (user 3)
        if (msg.recipientId === 999 && userId === 3) return true;
      }
      return false;
    }).length;
  };

  const sendMessage = (messageData: Omit<Message, 'id' | 'timestamp' | 'isRead'>) => {
    const newMessage: Message = {
      ...messageData,
      id: Date.now(),
      timestamp: new Date().toISOString(),
      isRead: false
    };
    setMessages(prev => [newMessage, ...prev]);
  };

  const markAsRead = (messageId: number) => {
    setMessages(prev => prev.map(msg => 
      msg.id === messageId ? { ...msg, isRead: true } : msg
    ));
  };

  const value: MessagingContextType = {
    messages,
    getMessagesForUser,
    getUnreadCount,
    sendMessage,
    markAsRead,
    isLoading
  };

  return <MessagingContext.Provider value={value}>{children}</MessagingContext.Provider>;
};

export const useMessaging = (): MessagingContextType => {
  const context = useContext(MessagingContext);
  if (!context) {
    throw new Error('useMessaging must be used within a MessagingProvider');
  }
  return context;
};