import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useMessaging } from "@/contexts/MessagingContext";
import { getDisplayName } from "@/contexts/MessageContext";
import { useStaff } from "@/contexts/StaffContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  AlertCircle,
  CheckCircle,
  Clock,
  User,
  Mail,
  Loader2,
  Check,
  CheckCheck,
  Calendar,
  Search,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import wsManager from "@/lib/websocket";

interface ChatParticipant {
  id: number;
  name: string;
  role?: string;
  avatar?: string;
  lastMessage?: string;
  lastMessageTime?: string;
  unreadCount?: number;
}

export default function EnhancedRealTimeMessagingPage() {
  const { user } = useAuth();
  const { getMessagesForUser, getUnreadCount, sendMessage, markAsRead, messages } = useMessaging();
  const { staff } = useStaff();
  const { toast } = useToast();

  // Helper function to get display name
  const getUserDisplayName = (userObj: any) => {
    if (!userObj) return "Unknown";
    if (userObj.role === "super_admin" || userObj.role === "facility_manager")
      return "NexSpace Team";
    return (
      `${userObj.firstName || ""} ${userObj.lastName || ""}`.trim() || userObj.email || "Unknown"
    );
  };

  const [selectedChat, setSelectedChat] = useState<ChatParticipant | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [selectedRecipient, setSelectedRecipient] = useState<any>(null);
  const [subject, setSubject] = useState("");
  const [content, setContent] = useState("");
  const [priority, setPriority] = useState<string>("normal");
  const [category, setCategory] = useState<string>("general");
  const [isSending, setIsSending] = useState(false);
  const [messageUpdateTrigger, setMessageUpdateTrigger] = useState(0);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  const facilityStaff = staff.filter(
    (staffMember) => staffMember.id !== user?.id && staffMember.compliant
  );

  // Subscribe to WebSocket messages for real-time updates
  useEffect(() => {
    const unsubscribe = wsManager.subscribe("new_message", (data: any) => {
      // Trigger a re-render when new message arrives
      setMessageUpdateTrigger((prev) => prev + 1);

      // Show notification for new messages
      if (data.recipientId === user?.id || (data.recipientId === 999 && user?.id === 3)) {
        toast({
          title: "New Message",
          description: `${data.senderName}: ${data.subject}`,
        });
      }
    });

    return unsubscribe;
  }, [user?.id]);

  // Poll for new messages every 5 seconds as fallback
  useEffect(() => {
    const interval = setInterval(() => {
      setMessageUpdateTrigger((prev) => prev + 1);
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [selectedChat, messageUpdateTrigger]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const userMessages = user ? getMessagesForUser(user.id) : [];
  const unreadCount = user ? getUnreadCount(user.id) : 0;

  // Get unique chat participants from messages
  const getChatParticipants = (): ChatParticipant[] => {
    const participantMap = new Map<number, ChatParticipant>();

    userMessages.forEach((msg: any) => {
      const otherId = msg.senderId === user?.id ? msg.recipientId : msg.senderId;
      const otherName = msg.senderId === user?.id ? msg.recipientName : msg.senderName;

      if (!participantMap.has(otherId)) {
        const participant: ChatParticipant = {
          id: otherId,
          name: otherName,
          lastMessage: msg.content.substring(0, 50) + (msg.content.length > 50 ? "..." : ""),
          lastMessageTime: msg.timestamp,
          unreadCount: 0,
        };

        // Count unread messages
        const unreadFromParticipant = userMessages.filter(
          (m: any) => m.senderId === otherId && m.recipientId === user?.id && !m.isRead
        ).length;

        participant.unreadCount = unreadFromParticipant;
        participantMap.set(otherId, participant);
      }
    });

    return Array.from(participantMap.values()).sort(
      (a, b) =>
        new Date(b.lastMessageTime || 0).getTime() - new Date(a.lastMessageTime || 0).getTime()
    );
  };

  const getConversationMessages = (participantId: number) => {
    if (!user) return [];

    return userMessages
      .filter(
        (msg: any) =>
          (msg.senderId === user.id && msg.recipientId === participantId) ||
          (msg.senderId === participantId && msg.recipientId === user.id)
      )
      .sort((a: any, b: any) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  };

  const handleSendMessage = () => {
    if (!newMessage.trim() || !selectedChat || isSending) return;

    setIsSending(true);

    sendMessage({
      senderId: user?.id || 0,
      senderName: getUserDisplayName(user),
      recipientId: selectedChat.id,
      recipientName: selectedChat.name,
      subject: `Chat with ${selectedChat.name}`,
      content: newMessage,
      priority: "normal",
      category: "general",
    });

    // Broadcast via WebSocket for real-time delivery
    wsManager.send({
      type: "new_message",
      data: {
        senderId: user?.id,
        senderName: getUserDisplayName(user),
        recipientId: selectedChat.id,
        recipientName: selectedChat.name,
        subject: `Chat with ${selectedChat.name}`,
        content: newMessage,
        timestamp: new Date().toISOString(),
      },
    });

    setNewMessage("");
    setIsSending(false);
    scrollToBottom();
  };

  const handleNewConversation = () => {
    setSelectedRecipient(null);
    setSubject("");
    setContent("");
    setPriority("normal");
    setCategory("general");
    setIsComposeOpen(true);
  };

  const handleSendNewMessage = () => {
    if (!selectedRecipient || !subject.trim() || !content.trim()) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    setIsSending(true);

    sendMessage({
      senderId: user?.id || 0,
      senderName: getUserDisplayName(user),
      recipientId: selectedRecipient.id,
      recipientName: `${selectedRecipient.firstName} ${selectedRecipient.lastName}`,
      subject,
      content,
      priority: priority as any,
      category: category as any,
    });

    // Broadcast via WebSocket
    wsManager.send({
      type: "new_message",
      data: {
        senderId: user?.id,
        senderName: getUserDisplayName(user),
        recipientId: selectedRecipient.id,
        recipientName: `${selectedRecipient.firstName} ${selectedRecipient.lastName}`,
        subject,
        content,
        priority,
        category,
        timestamp: new Date().toISOString(),
      },
    });

    toast({
      title: "Message sent",
      description: "Your message has been sent successfully.",
    });

    setIsComposeOpen(false);
    setIsSending(false);
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      // Use native date formatting instead of date-fns to avoid issues
      return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
    } else if (diffInHours < 48) {
      return (
        "Yesterday " +
        date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })
      );
    } else {
      return (
        date.toLocaleDateString("en-US", { month: "short", day: "numeric" }) +
        ", " +
        date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })
      );
    }
  };

  const handleChatSelect = (participant: ChatParticipant) => {
    setSelectedChat(participant);

    // Mark messages as read
    const conversationMessages = getConversationMessages(participant.id);
    conversationMessages.forEach((msg: any) => {
      if (!msg.isRead && msg.recipientId === user?.id) {
        markAsRead(msg.id);
      }
    });
  };

  const filteredParticipants = getChatParticipants().filter((p) =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex h-[calc(100vh-5rem)] bg-gray-50 dark:bg-gray-900">
      {/* Sidebar - Chat List */}
      <div
        className={cn(
          "border-r bg-white dark:bg-gray-950 transition-all duration-300",
          selectedChat ? "w-0 md:w-80 overflow-hidden" : "w-full md:w-80"
        )}
      >
        <div className="p-4 border-b">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Messages</h2>
            {unreadCount > 0 && <Badge className="bg-blue-600">{unreadCount} unread</Badge>}
          </div>

          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search conversations..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          <Button onClick={handleNewConversation} className="w-full">
            <Plus className="w-4 h-4 mr-2" />
            New Message
          </Button>
        </div>

        <ScrollArea className="h-[calc(100%-11rem)]">
          <div className="p-2">
            {filteredParticipants.map((participant) => (
              <div
                key={participant.id}
                onClick={() => handleChatSelect(participant)}
                className={cn(
                  "flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors mb-1",
                  "hover:bg-gray-100 dark:hover:bg-gray-800",
                  selectedChat?.id === participant.id && "bg-blue-50 dark:bg-blue-900/20"
                )}
              >
                <Avatar>
                  <AvatarFallback>{participant.name.charAt(0)}</AvatarFallback>
                </Avatar>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="font-medium truncate">{participant.name}</p>
                    {participant.lastMessageTime && (
                      <span className="text-xs text-gray-500">
                        {formatTimestamp(participant.lastMessageTime)}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500 truncate">{participant.lastMessage}</p>
                </div>

                {participant.unreadCount! > 0 && (
                  <Badge className="bg-blue-600 text-white rounded-full">
                    {participant.unreadCount}
                  </Badge>
                )}
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Chat View */}
      <div
        className={cn(
          "flex-1 flex flex-col bg-white dark:bg-gray-950",
          !selectedChat && "hidden md:flex"
        )}
      >
        {selectedChat ? (
          <>
            {/* Chat Header */}
            <div className="p-4 border-b flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="icon"
                  className="md:hidden"
                  onClick={() => setSelectedChat(null)}
                >
                  <MessageSquare className="w-4 h-4" />
                </Button>
                <Avatar>
                  <AvatarFallback>{selectedChat.name.charAt(0)}</AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-semibold">{selectedChat.name}</h3>
                  <p className="text-sm text-gray-500">Active now</p>
                </div>
              </div>
            </div>

            {/* Messages Area */}
            <ScrollArea ref={scrollAreaRef} className="flex-1 p-4">
              <div className="space-y-4">
                {getConversationMessages(selectedChat.id).map((message: any) => {
                  const isOwnMessage = message.senderId === user?.id;

                  return (
                    <div
                      key={message.id}
                      className={cn("flex gap-3", isOwnMessage && "justify-end")}
                    >
                      {!isOwnMessage && (
                        <Avatar className="w-8 h-8">
                          <AvatarFallback className="text-xs">
                            {message.senderName.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                      )}

                      <div
                        className={cn(
                          "max-w-[70%] rounded-lg p-3",
                          isOwnMessage ? "bg-blue-600 text-white" : "bg-gray-100 dark:bg-gray-800"
                        )}
                      >
                        {!isOwnMessage && (
                          <p className="text-xs font-medium mb-1">{message.senderName}</p>
                        )}
                        <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
                        <div
                          className={cn(
                            "flex items-center gap-1 mt-1",
                            isOwnMessage ? "justify-end" : "justify-start"
                          )}
                        >
                          <span
                            className={cn(
                              "text-xs",
                              isOwnMessage ? "text-blue-100" : "text-gray-500"
                            )}
                          >
                            {formatTimestamp(message.timestamp)}
                          </span>
                          {isOwnMessage &&
                            (message.isRead ? (
                              <CheckCheck className="w-3 h-3 text-blue-100" />
                            ) : (
                              <Check className="w-3 h-3 text-blue-100" />
                            ))}
                        </div>
                      </div>

                      {isOwnMessage && (
                        <Avatar className="w-8 h-8">
                          <AvatarFallback className="text-xs">
                            {getUserDisplayName(user).charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                      )}
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            {/* Message Input */}
            <div className="p-4 border-t">
              <div className="flex gap-2">
                <Input
                  placeholder="Type a message..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && !e.shiftKey && handleSendMessage()}
                  className="flex-1"
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={!newMessage.trim() || isSending}
                  className="min-w-[80px]"
                >
                  {isSending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      Send
                    </>
                  )}
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-500">
            <div className="text-center">
              <MessageSquare className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>Select a conversation to start messaging</p>
            </div>
          </div>
        )}
      </div>

      {/* New Message Dialog */}
      <Dialog open={isComposeOpen} onOpenChange={setIsComposeOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>New Message</DialogTitle>
            <DialogDescription>Start a new conversation with a team member</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="to">To</Label>
              <Select
                value={selectedRecipient?.id.toString() || ""}
                onValueChange={(value) => {
                  const recipient = facilityStaff.find((staff) => staff.id.toString() === value);
                  setSelectedRecipient(recipient || null);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select recipient..." />
                </SelectTrigger>
                <SelectContent>
                  {facilityStaff.map((staff) => (
                    <SelectItem key={staff.id} value={staff.id.toString()}>
                      {staff.firstName} {staff.lastName} ({staff.role})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="subject">Subject</Label>
              <Input
                id="subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Enter subject..."
              />
            </div>

            <div>
              <Label htmlFor="content">Message</Label>
              <Textarea
                id="content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Type your message..."
                rows={4}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="priority">Priority</Label>
                <Select value={priority} onValueChange={setPriority}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="category">Category</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">General</SelectItem>
                    <SelectItem value="support">Support</SelectItem>
                    <SelectItem value="scheduling">Scheduling</SelectItem>
                    <SelectItem value="pto">PTO</SelectItem>
                    <SelectItem value="emergency">Emergency</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsComposeOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSendNewMessage} disabled={isSending}>
                {isSending ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Send className="w-4 h-4 mr-2" />
                )}
                Send
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
