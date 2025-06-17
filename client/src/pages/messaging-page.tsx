import { useState } from "react";
import { Send, Search, Plus, Users, Filter, Phone, Mail, ArrowLeft, UserPlus, MessageSquare } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import { Link } from "wouter";

interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  senderRole: string;
  content: string;
  timestamp: Date;
  isRead: boolean;
  messageType: 'direct' | 'group' | 'broadcast';
  priority: 'normal' | 'high' | 'urgent';
}

interface Conversation {
  id: string;
  participants: Participant[];
  lastMessage: Message;
  unreadCount: number;
  type: 'direct' | 'group' | 'broadcast';
  title?: string;
}

interface Participant {
  id: string;
  firstName: string;
  lastName: string;
  role: string;
  unit: string;
  type: 'employee' | 'contractor';
  status: 'online' | 'offline' | 'busy';
  avatar?: string;
  contactInfo: {
    phone: string;
    email: string;
  };
}

// Mock data for messaging
const mockParticipants: Participant[] = [
  {
    id: 'user1', firstName: 'Sarah', lastName: 'Johnson', role: 'RN', unit: 'ICU', type: 'employee',
    status: 'online', contactInfo: { phone: '(555) 123-4567', email: 'sarah.johnson@facility.com' }
  },
  {
    id: 'user2', firstName: 'Michael', lastName: 'Chen', role: 'CNA', unit: 'Med-Surg', type: 'contractor',
    status: 'offline', contactInfo: { phone: '(555) 234-5678', email: 'mchen.contractor@email.com' }
  },
  {
    id: 'user3', firstName: 'Emily', lastName: 'Rodriguez', role: 'LPN', unit: 'Memory Care', type: 'employee',
    status: 'busy', contactInfo: { phone: '(555) 345-6789', email: 'emily.rodriguez@facility.com' }
  },
  {
    id: 'user4', firstName: 'David', lastName: 'Park', role: 'PT', unit: 'Rehabilitation', type: 'contractor',
    status: 'online', contactInfo: { phone: '(555) 456-7890', email: 'david.park@contractor.com' }
  },
  {
    id: 'user5', firstName: 'Lisa', lastName: 'Wang', role: 'Manager', unit: 'Administration', type: 'employee',
    status: 'online', contactInfo: { phone: '(555) 567-8901', email: 'lisa.wang@facility.com' }
  },
  {
    id: 'user6', firstName: 'James', lastName: 'Miller', role: 'CNA', unit: 'ICU', type: 'employee',
    status: 'offline', contactInfo: { phone: '(555) 678-9012', email: 'james.miller@facility.com' }
  },
  {
    id: 'user7', firstName: 'Maria', lastName: 'Garcia', role: 'RN', unit: 'Med-Surg', type: 'employee',
    status: 'online', contactInfo: { phone: '(555) 789-0123', email: 'maria.garcia@facility.com' }
  }
];

const mockMessages: Message[] = [
  {
    id: 'msg1', conversationId: 'conv1', senderId: 'user1', senderName: 'Sarah Johnson', senderRole: 'RN',
    content: 'Hi, can you cover my shift tonight? I have a family emergency.', timestamp: new Date(2025, 5, 17, 14, 30),
    isRead: false, messageType: 'direct', priority: 'urgent'
  },
  {
    id: 'msg2', conversationId: 'conv1', senderId: 'current-user', senderName: 'You', senderRole: 'Manager',
    content: 'Of course! I\'ll find someone to cover. Take care of your family.', timestamp: new Date(2025, 5, 17, 14, 35),
    isRead: true, messageType: 'direct', priority: 'normal'
  },
  {
    id: 'msg3', conversationId: 'conv2', senderId: 'user3', senderName: 'Emily Rodriguez', senderRole: 'LPN',
    content: 'Patient in room 204 needs immediate attention. Vital signs are concerning.', timestamp: new Date(2025, 5, 17, 15, 15),
    isRead: false, messageType: 'direct', priority: 'urgent'
  },
  {
    id: 'msg4', conversationId: 'conv3', senderId: 'user5', senderName: 'Lisa Wang', senderRole: 'Manager',
    content: 'Team meeting tomorrow at 9 AM. Please review the new protocols before attending.', timestamp: new Date(2025, 5, 17, 16, 0),
    isRead: true, messageType: 'group', priority: 'normal'
  },
  {
    id: 'msg5', conversationId: 'conv4', senderId: 'user7', senderName: 'Maria Garcia', senderRole: 'RN',
    content: 'Can someone help with the patient transfer in room 312?', timestamp: new Date(2025, 5, 17, 16, 30),
    isRead: false, messageType: 'direct', priority: 'high'
  }
];

const mockConversations: Conversation[] = [
  {
    id: 'conv1', participants: [mockParticipants[0]], 
    lastMessage: mockMessages[1], unreadCount: 0, type: 'direct'
  },
  {
    id: 'conv2', participants: [mockParticipants[2]], 
    lastMessage: mockMessages[2], unreadCount: 1, type: 'direct'
  },
  {
    id: 'conv3', participants: mockParticipants.slice(0, 4), 
    lastMessage: mockMessages[3], unreadCount: 0, type: 'group', title: 'ICU Team'
  },
  {
    id: 'conv4', participants: [mockParticipants[6]], 
    lastMessage: mockMessages[4], unreadCount: 1, type: 'direct'
  }
];

// Preset filter groups
const presetGroups = [
  { id: 'icu-team', name: 'ICU Team', filter: { unit: 'ICU' } },
  { id: 'all-rns', name: 'All RNs', filter: { role: 'RN' } },
  { id: 'contractors', name: 'All Contractors', filter: { type: 'contractor' } },
  { id: 'day-shift', name: 'Day Shift Staff', filter: { shift: 'day' } },
  { id: 'managers', name: 'Management Team', filter: { role: 'Manager' } },
  { id: 'med-surg', name: 'Med-Surg Unit', filter: { unit: 'Med-Surg' } }
];

export default function MessagingPage() {
  const { user } = useAuth();
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [showNewMessage, setShowNewMessage] = useState(false);
  const [showMassMessage, setShowMassMessage] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTab, setSelectedTab] = useState('conversations');
  
  const [newMessageData, setNewMessageData] = useState({
    recipient: '',
    subject: '',
    content: '',
    priority: 'normal' as 'normal' | 'high' | 'urgent'
  });

  const [massMessageData, setMassMessageData] = useState({
    selectedGroup: '',
    customFilters: {
      unit: '',
      role: '',
      type: '',
      shift: ''
    },
    selectedIndividuals: [] as string[],
    subject: '',
    content: '',
    priority: 'normal' as 'normal' | 'high' | 'urgent'
  });

  if (!user) return null;

  const filteredParticipants = mockParticipants.filter(participant =>
    participant.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    participant.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    participant.role.toLowerCase().includes(searchTerm.toLowerCase()) ||
    participant.unit.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return 'bg-green-500';
      case 'busy': return 'bg-yellow-500';
      case 'offline': return 'bg-gray-400';
      default: return 'bg-gray-400';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'text-red-600';
      case 'high': return 'text-orange-600';
      case 'normal': return 'text-gray-600';
      default: return 'text-gray-600';
    }
  };

  const handleSendMessage = () => {
    if (!newMessage.trim() || !selectedConversation) return;
    // Handle sending message
    setNewMessage('');
  };

  const handleSendNewMessage = () => {
    console.log('Sending new message:', newMessageData);
    setShowNewMessage(false);
    setNewMessageData({ recipient: '', subject: '', content: '', priority: 'normal' });
  };

  const handleSendMassMessage = () => {
    console.log('Sending mass message:', massMessageData);
    setShowMassMessage(false);
    setMassMessageData({
      selectedGroup: '',
      customFilters: { unit: '', role: '', type: '', shift: '' },
      selectedIndividuals: [],
      subject: '',
      content: '',
      priority: 'normal'
    });
  };

  const getFilteredParticipants = () => {
    let filtered = mockParticipants;
    
    if (massMessageData.selectedGroup) {
      const group = presetGroups.find(g => g.id === massMessageData.selectedGroup);
      if (group) {
        filtered = filtered.filter(p => {
          if (group.filter.unit) return p.unit === group.filter.unit;
          if (group.filter.role) return p.role === group.filter.role;
          if (group.filter.type) return p.type === group.filter.type;
          return true;
        });
      }
    }

    // Apply custom filters
    if (massMessageData.customFilters.unit) {
      filtered = filtered.filter(p => p.unit === massMessageData.customFilters.unit);
    }
    if (massMessageData.customFilters.role) {
      filtered = filtered.filter(p => p.role === massMessageData.customFilters.role);
    }
    if (massMessageData.customFilters.type) {
      filtered = filtered.filter(p => p.type === massMessageData.customFilters.type);
    }

    return filtered;
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-white border-b px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link href="/">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Dashboard
                </Button>
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Messages</h1>
                <p className="text-gray-600">Communicate with your team members</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <Button variant="outline" onClick={() => setShowMassMessage(true)}>
                <Users className="w-4 h-4 mr-2" />
                Mass Message
              </Button>
              <Button onClick={() => setShowNewMessage(true)}>
                <Plus className="w-4 h-4 mr-2" />
                New Message
              </Button>
            </div>
          </div>
        </div>

        <div className="flex-1 flex overflow-hidden">
          {/* Sidebar */}
          <div className="w-80 bg-white border-r flex flex-col">
            <div className="p-4 border-b">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search conversations..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <Tabs value={selectedTab} onValueChange={setSelectedTab} className="flex-1 flex flex-col">
              <TabsList className="grid w-full grid-cols-2 mx-4 mt-2">
                <TabsTrigger value="conversations">Conversations</TabsTrigger>
                <TabsTrigger value="contacts">Contacts</TabsTrigger>
              </TabsList>

              <TabsContent value="conversations" className="flex-1 overflow-auto m-0">
                <div className="space-y-1 p-2">
                  {mockConversations.map((conversation) => (
                    <div
                      key={conversation.id}
                      className={cn(
                        "flex items-center space-x-3 p-3 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors",
                        selectedConversation === conversation.id ? "bg-blue-50 border border-blue-200" : ""
                      )}
                      onClick={() => setSelectedConversation(conversation.id)}
                    >
                      <div className="relative">
                        <Avatar className="h-10 w-10">
                          <AvatarFallback>
                            {conversation.type === 'group' 
                              ? <Users className="h-5 w-5" />
                              : `${conversation.participants[0]?.firstName?.[0]}${conversation.participants[0]?.lastName?.[0]}`
                            }
                          </AvatarFallback>
                        </Avatar>
                        {conversation.type === 'direct' && (
                          <div className={cn(
                            "absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-white",
                            getStatusColor(conversation.participants[0]?.status || 'offline')
                          )} />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <h3 className="text-sm font-medium truncate">
                            {conversation.type === 'group' 
                              ? conversation.title 
                              : `${conversation.participants[0]?.firstName} ${conversation.participants[0]?.lastName}`
                            }
                          </h3>
                          <div className="flex items-center space-x-1">
                            <span className="text-xs text-gray-500">
                              {conversation.lastMessage.timestamp.toLocaleTimeString('en-US', { 
                                hour: 'numeric', 
                                minute: '2-digit' 
                              })}
                            </span>
                            {conversation.unreadCount > 0 && (
                              <Badge className="bg-red-500 text-white text-xs px-1 py-0 min-w-[16px] h-4">
                                {conversation.unreadCount}
                              </Badge>
                            )}
                          </div>
                        </div>
                        <p className="text-sm text-gray-600 truncate mt-1">
                          {conversation.lastMessage.content}
                        </p>
                        <div className="flex items-center space-x-2 mt-1">
                          <Badge variant="outline" className="text-xs">
                            {conversation.type}
                          </Badge>
                          {conversation.lastMessage.priority !== 'normal' && (
                            <Badge className={cn("text-xs", getPriorityColor(conversation.lastMessage.priority))}>
                              {conversation.lastMessage.priority}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="contacts" className="flex-1 overflow-auto m-0">
                <div className="space-y-1 p-2">
                  {filteredParticipants.map((participant) => (
                    <div
                      key={participant.id}
                      className="flex items-center space-x-3 p-3 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
                      onClick={() => {
                        setNewMessageData({...newMessageData, recipient: participant.id});
                        setShowNewMessage(true);
                      }}
                    >
                      <div className="relative">
                        <Avatar className="h-10 w-10">
                          <AvatarFallback>
                            {participant.firstName[0]}{participant.lastName[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div className={cn(
                          "absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-white",
                          getStatusColor(participant.status)
                        )} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-medium">
                          {participant.firstName} {participant.lastName}
                        </h3>
                        <p className="text-sm text-gray-600">
                          {participant.role} • {participant.unit}
                        </p>
                        <div className="flex items-center space-x-4 mt-1 text-xs text-gray-500">
                          <div className="flex items-center space-x-1">
                            <Phone className="w-3 h-3" />
                            <span>{participant.contactInfo.phone}</span>
                          </div>
                          <Badge variant={participant.type === 'employee' ? 'default' : 'secondary'} className="text-xs">
                            {participant.type}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </TabsContent>
            </Tabs>
          </div>

          {/* Main Chat Area */}
          <div className="flex-1 flex flex-col">
            {selectedConversation ? (
              <>
                {/* Chat Header */}
                <div className="bg-white border-b px-6 py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Avatar className="h-10 w-10">
                        <AvatarFallback>
                          {mockConversations.find(c => c.id === selectedConversation)?.type === 'group' 
                            ? <Users className="h-5 w-5" />
                            : 'SJ'
                          }
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <h3 className="font-medium">
                          {mockConversations.find(c => c.id === selectedConversation)?.type === 'group' 
                            ? 'ICU Team'
                            : 'Sarah Johnson'
                          }
                        </h3>
                        <p className="text-sm text-gray-500">RN • ICU</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button variant="outline" size="sm">
                        <Phone className="w-4 h-4" />
                      </Button>
                      <Button variant="outline" size="sm">
                        <Mail className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-auto p-6 space-y-4">
                  {mockMessages.filter(m => m.conversationId === selectedConversation).map((message) => (
                    <div
                      key={message.id}
                      className={cn(
                        "flex space-x-3",
                        message.senderId === 'current-user' ? "flex-row-reverse space-x-reverse" : ""
                      )}
                    >
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="text-xs">
                          {message.senderId === 'current-user' ? 'You' : message.senderName.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      <div className={cn(
                        "max-w-xs lg:max-w-md px-4 py-2 rounded-lg",
                        message.senderId === 'current-user' 
                          ? "bg-blue-500 text-white" 
                          : "bg-gray-100 text-gray-900"
                      )}>
                        <p className="text-sm">{message.content}</p>
                        <div className="flex items-center justify-between mt-1">
                          <span className={cn(
                            "text-xs",
                            message.senderId === 'current-user' ? "text-blue-100" : "text-gray-500"
                          )}>
                            {message.timestamp.toLocaleTimeString('en-US', { 
                              hour: 'numeric', 
                              minute: '2-digit' 
                            })}
                          </span>
                          {message.priority !== 'normal' && (
                            <Badge className={cn(
                              "text-xs ml-2",
                              message.priority === 'urgent' ? "bg-red-100 text-red-800" : "bg-orange-100 text-orange-800"
                            )}>
                              {message.priority}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Message Input */}
                <div className="bg-white border-t px-6 py-4">
                  <div className="flex items-end space-x-3">
                    <div className="flex-1">
                      <Textarea
                        placeholder="Type your message..."
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        className="min-h-[60px] resize-none"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleSendMessage();
                          }
                        }}
                      />
                    </div>
                    <Button onClick={handleSendMessage} disabled={!newMessage.trim()}>
                      <Send className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center bg-gray-50">
                <div className="text-center">
                  <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No conversation selected</h3>
                  <p className="text-gray-500">Choose a conversation from the sidebar to start messaging</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* New Message Dialog */}
        <Dialog open={showNewMessage} onOpenChange={setShowNewMessage}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>New Message</DialogTitle>
              <DialogDescription>Send a direct message to a team member</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Recipient</Label>
                <Select value={newMessageData.recipient} onValueChange={(value) => setNewMessageData({...newMessageData, recipient: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select recipient" />
                  </SelectTrigger>
                  <SelectContent>
                    {mockParticipants.map((participant) => (
                      <SelectItem key={participant.id} value={participant.id}>
                        {participant.firstName} {participant.lastName} - {participant.role}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Priority</Label>
                <Select value={newMessageData.priority} onValueChange={(value: 'normal' | 'high' | 'urgent') => setNewMessageData({...newMessageData, priority: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Subject</Label>
                <Input 
                  value={newMessageData.subject}
                  onChange={(e) => setNewMessageData({...newMessageData, subject: e.target.value})}
                  placeholder="Message subject"
                />
              </div>
              <div>
                <Label>Message</Label>
                <Textarea 
                  value={newMessageData.content}
                  onChange={(e) => setNewMessageData({...newMessageData, content: e.target.value})}
                  placeholder="Type your message..."
                  className="min-h-[100px]"
                />
              </div>
            </div>
            <div className="flex justify-end space-x-2 pt-4">
              <Button variant="outline" onClick={() => setShowNewMessage(false)}>Cancel</Button>
              <Button onClick={handleSendNewMessage}>Send Message</Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Mass Message Dialog */}
        <Dialog open={showMassMessage} onOpenChange={setShowMassMessage}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Mass Message</DialogTitle>
              <DialogDescription>Send a message to multiple team members using filters or groups</DialogDescription>
            </DialogHeader>
            
            <Tabs defaultValue="groups" className="space-y-4">
              <TabsList>
                <TabsTrigger value="groups">Preset Groups</TabsTrigger>
                <TabsTrigger value="filters">Custom Filters</TabsTrigger>
                <TabsTrigger value="individual">Select Individuals</TabsTrigger>
              </TabsList>

              <TabsContent value="groups" className="space-y-4">
                <div>
                  <Label>Select Group</Label>
                  <Select value={massMessageData.selectedGroup} onValueChange={(value) => setMassMessageData({...massMessageData, selectedGroup: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a preset group" />
                    </SelectTrigger>
                    <SelectContent>
                      {presetGroups.map((group) => (
                        <SelectItem key={group.id} value={group.id}>{group.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {massMessageData.selectedGroup && (
                  <div className="bg-blue-50 p-3 rounded-lg">
                    <p className="text-sm font-medium">Recipients: {getFilteredParticipants().length} people</p>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {getFilteredParticipants().slice(0, 5).map((p) => (
                        <Badge key={p.id} variant="secondary" className="text-xs">
                          {p.firstName} {p.lastName}
                        </Badge>
                      ))}
                      {getFilteredParticipants().length > 5 && (
                        <Badge variant="secondary" className="text-xs">
                          +{getFilteredParticipants().length - 5} more
                        </Badge>
                      )}
                    </div>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="filters" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Unit</Label>
                    <Select value={massMessageData.customFilters.unit} onValueChange={(value) => setMassMessageData({
                      ...massMessageData, 
                      customFilters: {...massMessageData.customFilters, unit: value}
                    })}>
                      <SelectTrigger>
                        <SelectValue placeholder="All Units" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Units</SelectItem>
                        <SelectItem value="ICU">ICU</SelectItem>
                        <SelectItem value="Med-Surg">Med-Surg</SelectItem>
                        <SelectItem value="Memory Care">Memory Care</SelectItem>
                        <SelectItem value="Rehabilitation">Rehabilitation</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Role</Label>
                    <Select value={massMessageData.customFilters.role} onValueChange={(value) => setMassMessageData({
                      ...massMessageData, 
                      customFilters: {...massMessageData.customFilters, role: value}
                    })}>
                      <SelectTrigger>
                        <SelectValue placeholder="All Roles" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Roles</SelectItem>
                        <SelectItem value="RN">RN</SelectItem>
                        <SelectItem value="LPN">LPN</SelectItem>
                        <SelectItem value="CNA">CNA</SelectItem>
                        <SelectItem value="PT">PT</SelectItem>
                        <SelectItem value="Manager">Manager</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Employment Type</Label>
                    <Select value={massMessageData.customFilters.type} onValueChange={(value) => setMassMessageData({
                      ...massMessageData, 
                      customFilters: {...massMessageData.customFilters, type: value}
                    })}>
                      <SelectTrigger>
                        <SelectValue placeholder="All Types" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Types</SelectItem>
                        <SelectItem value="employee">Employees</SelectItem>
                        <SelectItem value="contractor">Contractors</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="bg-blue-50 p-3 rounded-lg">
                  <p className="text-sm font-medium">Recipients: {getFilteredParticipants().length} people</p>
                </div>
              </TabsContent>

              <TabsContent value="individual" className="space-y-4">
                <div className="max-h-48 overflow-auto space-y-2">
                  {mockParticipants.map((participant) => (
                    <div key={participant.id} className="flex items-center space-x-3 p-2 border rounded">
                      <Checkbox 
                        checked={massMessageData.selectedIndividuals.includes(participant.id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setMassMessageData({
                              ...massMessageData,
                              selectedIndividuals: [...massMessageData.selectedIndividuals, participant.id]
                            });
                          } else {
                            setMassMessageData({
                              ...massMessageData,
                              selectedIndividuals: massMessageData.selectedIndividuals.filter(id => id !== participant.id)
                            });
                          }
                        }}
                      />
                      <div className="flex-1">
                        <p className="text-sm font-medium">{participant.firstName} {participant.lastName}</p>
                        <p className="text-xs text-gray-500">{participant.role} • {participant.unit}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </TabsContent>
            </Tabs>

            <div className="space-y-4 pt-4 border-t">
              <div>
                <Label>Priority</Label>
                <Select value={massMessageData.priority} onValueChange={(value: 'normal' | 'high' | 'urgent') => setMassMessageData({...massMessageData, priority: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Subject</Label>
                <Input 
                  value={massMessageData.subject}
                  onChange={(e) => setMassMessageData({...massMessageData, subject: e.target.value})}
                  placeholder="Message subject"
                />
              </div>
              <div>
                <Label>Message</Label>
                <Textarea 
                  value={massMessageData.content}
                  onChange={(e) => setMassMessageData({...massMessageData, content: e.target.value})}
                  placeholder="Type your message..."
                  className="min-h-[100px]"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-4">
              <Button variant="outline" onClick={() => setShowMassMessage(false)}>Cancel</Button>
              <Button onClick={handleSendMassMessage}>Send to Recipients</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}