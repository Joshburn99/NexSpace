import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { 
  MessageCircle, 
  Send, 
  Plus, 
  Search,
  Users,
  User,
  Clock,
  CheckCircle,
  AlertCircle
} from 'lucide-react';

interface Message {
  id: number;
  subject: string;
  content: string;
  senderId: number;
  senderName: string;
  senderRole: string;
  recipientId: number;
  recipientName: string;
  recipientRole: string;
  sentAt: string;
  isRead: boolean;
  isUrgent: boolean;
  threadId?: number;
  facilityId?: number;
  facilityName?: string;
}

interface Contact {
  id: number;
  name: string;
  role: string;
  specialty?: string;
  facilityId?: number;
  facilityName?: string;
  isOnline: boolean;
}

export default function MessagesPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedThread, setSelectedThread] = useState<number | null>(null);
  const [newMessageOpen, setNewMessageOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('inbox');
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch messages
  const { data: messages = [], isLoading } = useQuery<Message[]>({
    queryKey: ['/api/messages'],
  });

  // Fetch contacts (staff and NexSpace team)
  const { data: contacts = [] } = useQuery<Contact[]>({
    queryKey: ['/api/contacts'],
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (messageData: {
      recipientId: number;
      subject: string;
      content: string;
      isUrgent: boolean;
    }) => {
      const response = await apiRequest('POST', '/api/messages', messageData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/messages'] });
      setNewMessageOpen(false);
      toast({
        title: 'Message Sent',
        description: 'Your message has been sent successfully.',
      });
    },
    onError: () => {
      toast({
        title: 'Send Failed',
        description: 'Failed to send message. Please try again.',
        variant: 'destructive',
      });
    },
  });

  // Mark as read mutation
  const markAsReadMutation = useMutation({
    mutationFn: async (messageId: number) => {
      const response = await apiRequest('PATCH', `/api/messages/${messageId}/read`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/messages'] });
    },
  });

  // Filter messages based on tab and search
  const filteredMessages = messages.filter(message => {
    const matchesSearch = message.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         message.senderName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         message.content.toLowerCase().includes(searchTerm.toLowerCase());
    
    switch (activeTab) {
      case 'inbox':
        return message.recipientId === user?.id && matchesSearch;
      case 'sent':
        return message.senderId === user?.id && matchesSearch;
      case 'unread':
        return message.recipientId === user?.id && !message.isRead && matchesSearch;
      case 'urgent':
        return message.recipientId === user?.id && message.isUrgent && matchesSearch;
      default:
        return matchesSearch;
    }
  });

  // Group messages by thread
  const messageThreads = filteredMessages.reduce((threads: { [key: number]: Message[] }, message) => {
    const threadId = message.threadId || message.id;
    if (!threads[threadId]) threads[threadId] = [];
    threads[threadId].push(message);
    return threads;
  }, {});

  const NewMessageDialog = () => {
    const [recipient, setRecipient] = useState('');
    const [subject, setSubject] = useState('');
    const [content, setContent] = useState('');
    const [isUrgent, setIsUrgent] = useState(false);

    const handleSend = () => {
      if (!recipient || !subject || !content) {
        toast({
          title: 'Missing Information',
          description: 'Please fill in all required fields.',
          variant: 'destructive',
        });
        return;
      }

      const recipientContact = contacts.find(c => c.id.toString() === recipient);
      if (!recipientContact) {
        toast({
          title: 'Invalid Recipient',
          description: 'Please select a valid recipient.',
          variant: 'destructive',
        });
        return;
      }

      sendMessageMutation.mutate({
        recipientId: recipientContact.id,
        subject,
        content,
        isUrgent,
      });

      // Reset form
      setRecipient('');
      setSubject('');
      setContent('');
      setIsUrgent(false);
    };

    return (
      <Dialog open={newMessageOpen} onOpenChange={setNewMessageOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>New Message</DialogTitle>
            <DialogDescription>
              Send a message to your staff or the NexSpace team
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">To</label>
              <select
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                className="w-full mt-1 p-2 border rounded-md"
              >
                <option value="">Select recipient...</option>
                <optgroup label="NexSpace Team">
                  {contacts.filter(c => c.role === 'nexspace_team').map(contact => (
                    <option key={contact.id} value={contact.id}>
                      {contact.name} - {contact.role}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="Facility Staff">
                  {contacts.filter(c => c.role !== 'nexspace_team').map(contact => (
                    <option key={contact.id} value={contact.id}>
                      {contact.name} - {contact.specialty} {contact.facilityName && `(${contact.facilityName})`}
                    </option>
                  ))}
                </optgroup>
              </select>
            </div>

            <div>
              <label className="text-sm font-medium">Subject</label>
              <Input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Enter message subject..."
                className="mt-1"
              />
            </div>

            <div>
              <label className="text-sm font-medium">Message</label>
              <Textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Type your message here..."
                rows={6}
                className="mt-1"
              />
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="urgent"
                checked={isUrgent}
                onChange={(e) => setIsUrgent(e.target.checked)}
                className="rounded"
              />
              <label htmlFor="urgent" className="text-sm">Mark as urgent</label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setNewMessageOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSend}
              disabled={sendMessageMutation.isPending}
            >
              <Send className="h-4 w-4 mr-2" />
              Send Message
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading messages...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Messages</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Communicate with your staff and the NexSpace team
          </p>
        </div>
        <Button onClick={() => setNewMessageOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Message
        </Button>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search messages..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Message Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="inbox">Inbox</TabsTrigger>
          <TabsTrigger value="sent">Sent</TabsTrigger>
          <TabsTrigger value="unread">Unread</TabsTrigger>
          <TabsTrigger value="urgent">Urgent</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="space-y-4">
          {Object.keys(messageThreads).length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <MessageCircle className="h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  No messages found
                </h3>
                <p className="text-gray-600 dark:text-gray-400 text-center">
                  {searchTerm 
                    ? "No messages match your search criteria."
                    : `No ${activeTab === 'inbox' ? '' : activeTab} messages at this time.`
                  }
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {Object.entries(messageThreads).map(([threadId, threadMessages]) => {
                const latestMessage = threadMessages[threadMessages.length - 1];
                return (
                  <Card 
                    key={threadId} 
                    className={`hover:shadow-md transition-shadow cursor-pointer ${
                      !latestMessage.isRead && latestMessage.recipientId === user?.id 
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-950' 
                        : ''
                    }`}
                    onClick={() => {
                      setSelectedThread(parseInt(threadId));
                      if (!latestMessage.isRead && latestMessage.recipientId === user?.id) {
                        markAsReadMutation.mutate(latestMessage.id);
                      }
                    }}
                  >
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <CardTitle className="text-lg">{latestMessage.subject}</CardTitle>
                          {latestMessage.isUrgent && (
                            <Badge variant="destructive">Urgent</Badge>
                          )}
                          {!latestMessage.isRead && latestMessage.recipientId === user?.id && (
                            <Badge variant="default">New</Badge>
                          )}
                        </div>
                        <div className="flex items-center space-x-2 text-sm text-gray-500">
                          <Clock className="h-4 w-4" />
                          {new Date(latestMessage.sentAt).toLocaleDateString()}
                        </div>
                      </div>
                      <CardDescription>
                        {activeTab === 'sent' 
                          ? `To: ${latestMessage.recipientName}`
                          : `From: ${latestMessage.senderName} (${latestMessage.senderRole})`
                        }
                        {latestMessage.facilityName && ` • ${latestMessage.facilityName}`}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="text-gray-700 dark:text-gray-300 line-clamp-2">
                        {latestMessage.content}
                      </p>
                      {threadMessages.length > 1 && (
                        <div className="mt-2 text-sm text-gray-500">
                          {threadMessages.length} messages in thread
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <NewMessageDialog />
    </div>
  );
}