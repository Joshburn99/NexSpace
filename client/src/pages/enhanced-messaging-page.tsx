import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useMessaging } from "@/contexts/MessagingContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  Mail
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function EnhancedMessagingPage() {
  const { user } = useAuth();
  const { getMessagesForUser, getUnreadCount, sendMessage, markAsRead } = useMessaging();
  
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<any>(null);
  const [subject, setSubject] = useState("");
  const [content, setContent] = useState("");
  const [priority, setPriority] = useState<string>("normal");
  const [category, setCategory] = useState<string>("general");

  const userMessages = user ? getMessagesForUser(parseInt(user.id)) : [];
  const unreadCount = user ? getUnreadCount(parseInt(user.id)) : 0;

  const handleSendMessage = () => {
    if (!user || !subject.trim() || !content.trim()) return;

    sendMessage({
      senderId: parseInt(user.id),
      senderName: `${user.firstName} ${user.lastName}`,
      recipientId: 999, // NexSpace Team superuser
      recipientName: "NexSpace Team",
      subject: subject.trim(),
      content: content.trim(),
      priority: priority as any,
      category: category as any
    });

    // Reset form
    setSubject("");
    setContent("");
    setPriority("normal");
    setCategory("general");
    setIsComposeOpen(false);
  };

  const handleMessageClick = (message: any) => {
    setSelectedMessage(message);
    if (!message.isRead && message.recipientId === parseInt(user?.id || "0")) {
      markAsRead(message.id);
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return <Badge variant="destructive">Urgent</Badge>;
      case 'high':
        return <Badge className="bg-orange-100 text-orange-800">High</Badge>;
      case 'normal':
        return <Badge variant="outline">Normal</Badge>;
      case 'low':
        return <Badge variant="secondary">Low</Badge>;
      default:
        return <Badge variant="outline">{priority}</Badge>;
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'support':
        return <AlertCircle className="w-4 h-4" />;
      case 'scheduling':
        return <Clock className="w-4 h-4" />;
      case 'emergency':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      default:
        return <MessageSquare className="w-4 h-4" />;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const inbox = userMessages.filter(msg => msg.recipientId === parseInt(user?.id || "0"));
  const sent = userMessages.filter(msg => msg.senderId === parseInt(user?.id || "0"));

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Messages</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Communicate with the NexSpace team
            {unreadCount > 0 && (
              <Badge className="ml-2 bg-blue-600">{unreadCount} unread</Badge>
            )}
          </p>
        </div>
        <Dialog open={isComposeOpen} onOpenChange={setIsComposeOpen}>
          <DialogTrigger asChild>
            <Button className="bg-blue-600 hover:bg-blue-700">
              <Plus className="w-4 h-4 mr-2" />
              New Message
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Compose Message</DialogTitle>
              <DialogDescription>
                Send a message to the NexSpace team
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="to">To</Label>
                <Input
                  id="to"
                  value="NexSpace Team"
                  disabled
                  className="bg-gray-50"
                />
              </div>

              <div>
                <Label htmlFor="subject">Subject</Label>
                <Input
                  id="subject"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Enter message subject..."
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

              <div>
                <Label htmlFor="content">Message</Label>
                <Textarea
                  id="content"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Type your message here..."
                  rows={4}
                />
              </div>

              <div className="flex gap-2 pt-4">
                <Button 
                  onClick={handleSendMessage} 
                  className="flex-1"
                  disabled={!subject.trim() || !content.trim()}
                >
                  <Send className="w-4 h-4 mr-2" />
                  Send Message
                </Button>
                <Button variant="outline" onClick={() => setIsComposeOpen(false)} className="flex-1">
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="inbox" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="inbox">
            Inbox {unreadCount > 0 && <Badge className="ml-2 bg-blue-600 text-xs">{unreadCount}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="sent">Sent</TabsTrigger>
        </TabsList>

        <TabsContent value="inbox" className="space-y-4">
          {inbox.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center">
                <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 dark:text-gray-400">No messages in your inbox</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="space-y-2">
                {inbox.map((message) => (
                  <Card 
                    key={message.id} 
                    className={cn(
                      "cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-gray-800",
                      !message.isRead && "border-blue-500 bg-blue-50 dark:bg-blue-950",
                      selectedMessage?.id === message.id && "ring-2 ring-blue-500"
                    )}
                    onClick={() => handleMessageClick(message)}
                  >
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-gray-400" />
                          <span className="font-medium text-sm">{message.senderName}</span>
                          {!message.isRead && (
                            <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {getCategoryIcon(message.category)}
                          {getPriorityBadge(message.priority)}
                        </div>
                      </div>
                      <h3 className="font-semibold text-sm mb-1">{message.subject}</h3>
                      <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2">
                        {message.content}
                      </p>
                      <p className="text-xs text-gray-500 mt-2">
                        {formatDate(message.timestamp)}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {selectedMessage && (
                <Card>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-lg">{selectedMessage.subject}</CardTitle>
                        <CardDescription className="flex items-center gap-2 mt-1">
                          <User className="w-4 h-4" />
                          From: {selectedMessage.senderName}
                        </CardDescription>
                      </div>
                      <div className="flex items-center gap-2">
                        {getCategoryIcon(selectedMessage.category)}
                        {getPriorityBadge(selectedMessage.priority)}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                      {formatDate(selectedMessage.timestamp)}
                    </p>
                    <div className="prose prose-sm max-w-none">
                      <p className="whitespace-pre-wrap">{selectedMessage.content}</p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </TabsContent>

        <TabsContent value="sent" className="space-y-4">
          {sent.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center">
                <Send className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 dark:text-gray-400">No sent messages</p>
              </CardContent>
            </Card>
          ) : (
            sent.map((message) => (
              <Card key={message.id}>
                <CardContent className="p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-gray-400" />
                      <span className="font-medium text-sm">To: {message.recipientName}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {getCategoryIcon(message.category)}
                      {getPriorityBadge(message.priority)}
                    </div>
                  </div>
                  <h3 className="font-semibold text-sm mb-1">{message.subject}</h3>
                  <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2">
                    {message.content}
                  </p>
                  <p className="text-xs text-gray-500 mt-2">
                    Sent: {formatDate(message.timestamp)}
                  </p>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}