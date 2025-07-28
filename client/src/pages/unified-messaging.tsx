import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  MessageSquare, 
  Send, 
  Plus, 
  Search,
  Users,
  User,
  Clock,
  CheckCheck
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { apiRequest } from "@/lib/queryClient";
import { useWebSocket, useChatMessages } from "@/lib/websocket";
import { useToast } from "@/hooks/use-toast";

interface Conversation {
  id: number;
  type: string;
  subject: string | null;
  lastMessageAt: Date;
  unreadCount: number;
  participants: {
    id: number;
    name: string;
    role: string;
    avatar: string | null;
  }[];
  lastMessage: Message | null;
}

interface Message {
  id: number;
  conversationId: number;
  senderId: number;
  senderName: string;
  senderRole: string;
  content: string;
  messageType: string;
  createdAt: Date;
}

export default function UnifiedMessagingPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [selectedConversation, setSelectedConversation] = useState<number | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [showNewConversation, setShowNewConversation] = useState(false);
  const [selectedParticipants, setSelectedParticipants] = useState<number[]>([]);
  const [conversationSubject, setConversationSubject] = useState("");
  const [localMessages, setLocalMessages] = useState<Message[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { subscribe, isConnected } = useWebSocket();

  // Fetch conversations
  const { data: conversations = [], isLoading: loadingConversations } = useQuery<Conversation[]>({
    queryKey: ['/api/conversations'],
  });

  // Fetch messages for selected conversation with polling fallback
  const { data: messages = [], isLoading: loadingMessages } = useQuery<Message[]>({
    queryKey: [`/api/conversations/${selectedConversation}/messages`],
    enabled: !!selectedConversation,
    // Poll every 5 seconds if WebSocket is disconnected
    refetchInterval: !isConnected ? 5000 : false,
  });

  // Fetch staff for new conversation dialog
  const { data: staff = [] } = useQuery({
    queryKey: ['/api/staff'],
  });

  // Get total unread count
  const { data: unreadCountData } = useQuery({
    queryKey: ['/api/messages/unread-count'],
  });
  const totalUnreadCount = unreadCountData?.count || 0;

  // Create conversation mutation
  const createConversationMutation = useMutation({
    mutationFn: (data: { subject: string; participantIds: number[]; type: string }) =>
      apiRequest('/api/conversations', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/conversations'] });
      setSelectedConversation(data.id);
      setShowNewConversation(false);
      setSelectedParticipants([]);
      setConversationSubject("");
    },
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: (data: { content: string; messageType: string }) =>
      apiRequest(`/api/conversations/${selectedConversation}/messages`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: [`/api/conversations/${selectedConversation}/messages`] 
      });
      queryClient.invalidateQueries({ queryKey: ['/api/conversations'] });
      setNewMessage("");
    },
  });

  // Merge local messages with fetched messages
  useEffect(() => {
    setLocalMessages(messages);
  }, [messages]);

  // WebSocket subscription for real-time updates
  useEffect(() => {
    const unsubscribe = subscribe('new_message', (data) => {
      const newMsg = data.data;
      
      // Add message to local state immediately for instant UI update
      if (data.conversationId === selectedConversation) {
        setLocalMessages(prev => {
          // Check if message already exists to avoid duplicates
          if (prev.some(m => m.id === newMsg.id)) {
            return prev;
          }
          return [...prev, newMsg];
        });
      }
      
      // Show toast notification for new messages (not from current user)
      if (newMsg.senderId !== user?.id) {
        toast({
          title: "New message",
          description: `${newMsg.senderName}: ${newMsg.content.substring(0, 50)}${newMsg.content.length > 50 ? '...' : ''}`,
        });
      }
      
      // Refresh conversation list to update last message
      queryClient.invalidateQueries({ queryKey: ['/api/conversations'] });
      queryClient.invalidateQueries({ queryKey: ['/api/messages/unread-count'] });
      
      // Also refresh messages from server after a short delay to ensure consistency
      setTimeout(() => {
        if (data.conversationId === selectedConversation) {
          queryClient.invalidateQueries({ 
            queryKey: [`/api/conversations/${selectedConversation}/messages`] 
          });
        }
      }, 500);
    });

    return unsubscribe;
  }, [selectedConversation, queryClient, subscribe, user?.id, toast]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [localMessages]);

  const handleSendMessage = () => {
    if (!newMessage.trim() || !selectedConversation) return;
    
    sendMessageMutation.mutate({
      content: newMessage.trim(),
      messageType: 'text'
    });
  };

  const handleCreateConversation = () => {
    if (!conversationSubject.trim() || selectedParticipants.length === 0) return;
    
    createConversationMutation.mutate({
      subject: conversationSubject,
      participantIds: selectedParticipants,
      type: selectedParticipants.length > 1 ? 'group' : 'direct'
    });
  };

  const filteredConversations = conversations.filter(conv => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return (
      conv.subject?.toLowerCase().includes(searchLower) ||
      conv.participants.some(p => p.name.toLowerCase().includes(searchLower))
    );
  });

  const getConversationTitle = (conversation: Conversation) => {
    if (conversation.subject) return conversation.subject;
    
    const otherParticipants = conversation.participants.filter(p => p.id !== user?.id);
    if (otherParticipants.length === 1) {
      return otherParticipants[0].name;
    } else if (otherParticipants.length > 1) {
      return `${otherParticipants[0].name} and ${otherParticipants.length - 1} others`;
    }
    
    return "Unknown Conversation";
  };

  const getConversationAvatar = (conversation: Conversation) => {
    const otherParticipants = conversation.participants.filter(p => p.id !== user?.id);
    
    if (conversation.type === 'group' || otherParticipants.length > 1) {
      return <Users className="h-5 w-5" />;
    } else if (otherParticipants.length === 1) {
      const initials = otherParticipants[0].name
        .split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase();
      return initials;
    }
    
    return "?";
  };

  return (
    <div className="h-[calc(100vh-4rem)] flex">
      {/* Conversation List */}
      <div className="w-80 border-r flex flex-col">
        <div className="p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-semibold">Messages</h2>
              {totalUnreadCount > 0 && (
                <Badge variant="destructive">{totalUnreadCount}</Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              {/* Connection Status Indicator */}
              <div className="flex items-center gap-1">
                <div className={cn(
                  "w-2 h-2 rounded-full",
                  isConnected ? "bg-green-500" : "bg-red-500"
                )} />
                <span className="text-xs text-gray-500">
                  {isConnected ? "Live" : "Offline"}
                </span>
              </div>
              <Dialog open={showNewConversation} onOpenChange={setShowNewConversation}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="w-4 h-4 mr-1" />
                  New
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Start New Conversation</DialogTitle>
                  <DialogDescription>
                    Create a new conversation with one or more team members.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 mt-4">
                  <div>
                    <label className="text-sm font-medium">Subject (Optional)</label>
                    <Input
                      placeholder="e.g., Schedule Discussion"
                      value={conversationSubject}
                      onChange={(e) => setConversationSubject(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Select Participants</label>
                    <Select
                      value=""
                      onValueChange={(value) => {
                        const id = parseInt(value);
                        if (!selectedParticipants.includes(id)) {
                          setSelectedParticipants([...selectedParticipants, id]);
                        }
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Add participants" />
                      </SelectTrigger>
                      <SelectContent>
                        {staff
                          .filter((s: any) => s.id !== user?.id)
                          .map((staffMember: any) => (
                            <SelectItem 
                              key={staffMember.id} 
                              value={staffMember.id.toString()}
                              disabled={selectedParticipants.includes(staffMember.id)}
                            >
                              {staffMember.firstName || ''} {staffMember.lastName || ''} - {staffMember.specialty}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                    <div className="mt-2 space-y-1">
                      {selectedParticipants.map(id => {
                        const staffMember = staff.find((s: any) => s.id === id);
                        return (
                          <div key={id} className="flex items-center justify-between bg-gray-100 rounded px-2 py-1">
                            <span className="text-sm">{staffMember?.firstName || ''} {staffMember?.lastName || ''}</span>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setSelectedParticipants(
                                selectedParticipants.filter(p => p !== id)
                              )}
                            >
                              ×
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  <Button 
                    onClick={handleCreateConversation}
                    disabled={selectedParticipants.length === 0}
                    className="w-full"
                  >
                    Start Conversation
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
            </div>
          </div>
          
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search conversations..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>
        
        <ScrollArea className="flex-1">
          <div className="p-2">
            {loadingConversations ? (
              <div className="text-center p-4 text-gray-500">Loading...</div>
            ) : filteredConversations.length === 0 ? (
              <div className="text-center p-4 text-gray-500">
                No conversations found
              </div>
            ) : (
              filteredConversations.map((conversation) => (
                <button
                  key={conversation.id}
                  onClick={() => setSelectedConversation(conversation.id)}
                  className={cn(
                    "w-full p-3 rounded-lg mb-2 text-left transition-colors",
                    selectedConversation === conversation.id
                      ? "bg-blue-50 border-blue-200 border"
                      : "hover:bg-gray-50"
                  )}
                >
                  <div className="flex items-start space-x-3">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback>
                        {getConversationAvatar(conversation)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="font-medium truncate">
                          {getConversationTitle(conversation)}
                        </p>
                        {conversation.unreadCount > 0 && (
                          <Badge className="ml-2">{conversation.unreadCount}</Badge>
                        )}
                      </div>
                      {conversation.lastMessage && (
                        <>
                          <p className="text-sm text-gray-600 truncate">
                            {conversation.lastMessage.content}
                          </p>
                          <p className="text-xs text-gray-400 mt-1">
                            {formatDistanceToNow(new Date(conversation.lastMessage.createdAt), { 
                              addSuffix: true 
                            })}
                          </p>
                        </>
                      )}
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Message Area */}
      {selectedConversation ? (
        <div className="flex-1 flex flex-col">
          {/* Header */}
          <div className="p-4 border-b">
            <div className="flex items-center space-x-3">
              <Avatar className="h-10 w-10">
                <AvatarFallback>
                  {getConversationAvatar(
                    conversations.find(c => c.id === selectedConversation)!
                  )}
                </AvatarFallback>
              </Avatar>
              <div>
                <h3 className="font-medium">
                  {getConversationTitle(
                    conversations.find(c => c.id === selectedConversation)!
                  )}
                </h3>
                <p className="text-sm text-gray-500">
                  {conversations.find(c => c.id === selectedConversation)?.participants
                    .filter(p => p.id !== user?.id)
                    .map(p => p.role)
                    .join(', ')}
                </p>
              </div>
            </div>
          </div>

          {/* Messages */}
          <ScrollArea className="flex-1 p-4">
            {loadingMessages ? (
              <div className="text-center text-gray-500">Loading messages...</div>
            ) : localMessages.length === 0 ? (
              <div className="text-center text-gray-500">No messages yet. Start the conversation!</div>
            ) : (
              <div className="space-y-4">
                {localMessages.map((message) => {
                  const isOwn = message.senderId === user?.id;
                  
                  return (
                    <div
                      key={message.id}
                      className={cn(
                        "flex",
                        isOwn ? "justify-end" : "justify-start"
                      )}
                    >
                      <div
                        className={cn(
                          "max-w-xs lg:max-w-md px-4 py-2 rounded-lg",
                          isOwn
                            ? "bg-blue-500 text-white"
                            : "bg-gray-100 text-gray-900"
                        )}
                      >
                        {!isOwn && (
                          <p className="text-xs font-medium mb-1">
                            {message.senderName}
                          </p>
                        )}
                        <p className="text-sm">{message.content}</p>
                        <p className={cn(
                          "text-xs mt-1",
                          isOwn ? "text-blue-100" : "text-gray-500"
                        )}>
                          {formatDistanceToNow(new Date(message.createdAt), { 
                            addSuffix: true 
                          })}
                        </p>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>
            )}
          </ScrollArea>

          {/* Input */}
          <div className="p-4 border-t">
            <div className="flex space-x-2">
              <Input
                placeholder="Type a message..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
              />
              <Button 
                onClick={handleSendMessage}
                disabled={!newMessage.trim() || sendMessageMutation.isPending}
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center text-gray-500">
          Select a conversation to start messaging
        </div>
      )}
    </div>
  );
}