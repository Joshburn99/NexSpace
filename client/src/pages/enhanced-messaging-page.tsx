import { useState } from "react";
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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

export default function EnhancedMessagingPage() {
  const { user } = useAuth();
  const { getMessagesForUser, getUnreadCount, sendMessage, markAsRead } = useMessaging();
  const { staff } = useStaff();
  const { toast } = useToast();
  const facilityStaff = staff.filter(
    (staffMember) => staffMember.id !== user?.id && staffMember.compliant
  );

  // Define preset groups for mass messaging
  const presetGroups = [
    {
      id: "all_users",
      label: "All Users",
      description: "Everyone in the system",
      getRecipients: () => staff.filter((s) => s.id !== user?.id),
    },
    {
      id: "all_employees",
      label: "All Employees",
      description: "All internal employees",
      getRecipients: () =>
        staff.filter(
          (s) => s.id !== user?.id && (s.role === "nurse" || s.role === "cna" || s.role === "lpn")
        ),
    },
    {
      id: "all_facility_users",
      label: "All Facility Users",
      description: "All facility staff members",
      getRecipients: () => staff.filter((s) => s.id !== user?.id && s.compliant),
    },
    {
      id: "all_contractors",
      label: "All Contractors",
      description: "All 1099 contractors",
      getRecipients: () => staff.filter((s) => s.id !== user?.id && s.role === "contractor"),
    },
    {
      id: "all_rns",
      label: "All RNs",
      description: "All Registered Nurses",
      getRecipients: () =>
        staff.filter((s) => s.id !== user?.id && s.role === "nurse" && s.specialty?.includes("RN")),
    },
    {
      id: "all_lpns",
      label: "All LPNs",
      description: "All Licensed Practical Nurses",
      getRecipients: () => staff.filter((s) => s.id !== user?.id && s.role === "lpn"),
    },
    {
      id: "all_cnas",
      label: "All CNAs",
      description: "All Certified Nursing Assistants",
      getRecipients: () => staff.filter((s) => s.id !== user?.id && s.role === "cna"),
    },
    {
      id: "day_shift",
      label: "Day Shift Staff",
      description: "Staff working day shifts",
      getRecipients: () => staff.filter((s) => s.id !== user?.id && s.department?.includes("Day")),
    },
    {
      id: "night_shift",
      label: "Night Shift Staff",
      description: "Staff working night shifts",
      getRecipients: () =>
        staff.filter((s) => s.id !== user?.id && s.department?.includes("Night")),
    },
  ];

  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [isNexSpaceMessage, setIsNexSpaceMessage] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<any>(null);
  const [subject, setSubject] = useState("");
  const [content, setContent] = useState("");
  const [priority, setPriority] = useState<string>("normal");
  const [category, setCategory] = useState<string>("general");
  const [selectedRecipient, setSelectedRecipient] = useState<any>(null);
  const [selectedRecipients, setSelectedRecipients] = useState<any[]>([]);
  const [isMassMessage, setIsMassMessage] = useState(false);
  const [selectedPresetGroup, setSelectedPresetGroup] = useState<string>("");
  const [showAllHistory, setShowAllHistory] = useState(false);
  const [chatView, setChatView] = useState(false);
  const [chatParticipant, setChatParticipant] = useState<any>(null);
  const [isSending, setIsSending] = useState(false);

  const userMessages = user ? getMessagesForUser(user.id) : [];
  const unreadCount = user ? getUnreadCount(user.id) : 0;

  // Separate inbox and sent messages
  const inboxMessages = userMessages.filter((msg) => {
    // Inbox contains messages where user is recipient or NexSpace Team messages for superusers
    if (msg.recipientId === user?.id) return true;
    if (msg.recipientId === 999 && user?.id === 3) return true;
    return false;
  });

  const sentMessages = userMessages.filter((msg) => msg.senderId === user?.id);

  const handleSendMessage = async () => {
    if (!user) {
      toast({
        title: "Not authenticated",
        description: "Please log in to send messages.",
        variant: "destructive",
      });
      return;
    }

    if (!subject.trim() || !content.trim()) {
      toast({
        title: "Missing information",
        description: "Please enter both subject and message content.",
        variant: "destructive",
      });
      return;
    }

    if (!isNexSpaceMessage && !selectedRecipient && selectedRecipients.length === 0) {
      toast({
        title: "No recipient selected",
        description: "Please select at least one recipient.",
        variant: "destructive",
      });
      return;
    }

    setIsSending(true);

    try {
      if (isNexSpaceMessage) {
        sendMessage({
          senderId: user.id,
          senderName: `${user.firstName} ${user.lastName}`,
          recipientId: 999, // NexSpace Team superuser
          recipientName: "NexSpace Team",
          subject: subject.trim(),
          content: content.trim(),
          priority: priority as any,
          category: category as any,
        });

        toast({
          title: "Message sent",
          description: "Your message has been sent to the NexSpace Team.",
        });
      } else if (isMassMessage && selectedRecipients.length > 0) {
        // Send mass message to multiple recipients
        selectedRecipients.forEach((recipient) => {
          sendMessage({
            senderId: user.id,
            senderName:
              user.id === 3 || user.role === "super_admin" || user.role === "facility_manager"
                ? "NexSpace Team"
                : `${user.firstName} ${user.lastName}`,
            recipientId: recipient.id,
            recipientName: `${recipient.firstName} ${recipient.lastName}`,
            subject: subject.trim(),
            content: content.trim(),
            priority: priority as any,
            category: category as any,
          });
        });

        toast({
          title: "Mass message sent",
          description: `Message sent to ${selectedRecipients.length} recipient${selectedRecipients.length > 1 ? "s" : ""}.`,
        });
      } else if (selectedRecipient) {
        sendMessage({
          senderId: user.id,
          senderName:
            user.id === 3 || user.role === "super_admin" || user.role === "facility_manager"
              ? "NexSpace Team"
              : `${user.firstName} ${user.lastName}`,
          recipientId: selectedRecipient.id,
          recipientName: `${selectedRecipient.firstName} ${selectedRecipient.lastName}`,
          subject: subject.trim(),
          content: content.trim(),
          priority: priority as any,
          category: category as any,
        });

        toast({
          title: "Message sent",
          description: `Message sent to ${selectedRecipient.firstName} ${selectedRecipient.lastName}.`,
        });
      }

      // Reset form
      setSubject("");
      setContent("");
      setPriority("normal");
      setCategory("general");
      setSelectedRecipient(null);
      setSelectedRecipients([]);
      setIsNexSpaceMessage(false);
      setIsMassMessage(false);
      setIsComposeOpen(false);
    } catch (error) {
      console.error("Error sending message:", error);
      toast({
        title: "Failed to send message",
        description: "Please try again. If the problem persists, contact support.",
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  };

  const handleNexSpaceMessage = () => {
    setIsNexSpaceMessage(true);
    setSelectedRecipient(null);
    setIsMassMessage(false);
    setSelectedRecipients([]);
    setSelectedPresetGroup("");
    setSubject("");
    setContent("");
    setPriority("normal");
    setCategory("general");
    setIsComposeOpen(true);
  };

  const handleNewMessage = () => {
    setIsNexSpaceMessage(false);
    setSelectedRecipient(null);
    setIsMassMessage(false);
    setSelectedRecipients([]);
    setSelectedPresetGroup("");
    setSubject("");
    setContent("");
    setPriority("normal");
    setCategory("general");
    setIsComposeOpen(true);
  };

  const handleMassMessage = () => {
    setIsNexSpaceMessage(false);
    setSelectedRecipient(null);
    setIsMassMessage(true);
    setSelectedRecipients([]);
    setSelectedPresetGroup("");
    setSubject("");
    setContent("");
    setPriority("normal");
    setCategory("general");
    setIsComposeOpen(true);
  };

  const toggleRecipientSelection = (staffMember: any) => {
    setSelectedRecipients((prev) => {
      const isSelected = prev.some((r) => r.id === staffMember.id);
      if (isSelected) {
        return prev.filter((r) => r.id !== staffMember.id);
      } else {
        return [...prev, staffMember];
      }
    });
  };

  const handlePresetGroupSelection = (groupId: string) => {
    setSelectedPresetGroup(groupId);
    if (groupId && groupId !== "custom") {
      const group = presetGroups.find((g) => g.id === groupId);
      if (group) {
        setSelectedRecipients(group.getRecipients());
      }
    } else {
      setSelectedRecipients([]);
    }
  };

  const handleMessageClick = (message: any) => {
    setSelectedMessage(message);
    // Mark as read if unread and user is recipient
    if (
      !message.isRead &&
      (message.recipientId === user?.id || (message.recipientId === 999 && user?.id === 3))
    ) {
      markAsRead(message.id);
    }
  };

  const handleChatClick = (message: any) => {
    // Determine chat participant based on current user
    const participant =
      message.senderId === user?.id
        ? { id: message.recipientId, name: message.recipientName }
        : { id: message.senderId, name: message.senderName };

    setChatParticipant(participant);
    setChatView(true);
  };

  const getConversationHistory = (participantId: number) => {
    if (!user) return [];

    const allMessages = getMessagesForUser(user.id);
    return allMessages
      .filter(
        (msg: any) =>
          (msg.senderId === user.id && msg.recipientId === participantId) ||
          (msg.senderId === participantId && msg.recipientId === user.id)
      )
      .sort((a: any, b: any) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  };

  const getAllMessageHistory = () => {
    if (!user) return [];

    const allMessages = getMessagesForUser(user.id);
    return allMessages
      .filter((msg: any) => msg.senderId === user.id || msg.recipientId === user.id)
      .sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case "urgent":
        return <Badge variant="destructive">Urgent</Badge>;
      case "high":
        return <Badge className="bg-orange-100 text-orange-800">High</Badge>;
      case "normal":
        return <Badge variant="outline">Normal</Badge>;
      case "low":
        return <Badge variant="secondary">Low</Badge>;
      default:
        return <Badge variant="outline">{priority}</Badge>;
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "support":
        return <AlertCircle className="w-4 h-4" />;
      case "scheduling":
        return <Clock className="w-4 h-4" />;
      case "emergency":
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      default:
        return <MessageSquare className="w-4 h-4" />;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  return (
    <div className="w-full space-y-4 md:space-y-6">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <div>
          <h1 className="text-xl md:text-3xl font-bold text-gray-900 dark:text-white">Messages</h1>
          <div className="text-sm md:text-base text-gray-600 dark:text-gray-400 mt-1 flex items-center flex-wrap gap-2">
            <span className="hidden md:inline">
              Communicate with facility team and NexSpace support
            </span>
            {unreadCount > 0 && <Badge className="bg-blue-600">{unreadCount} unread</Badge>}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={handleNewMessage}
            className="bg-blue-600 hover:bg-blue-700 min-h-[44px] touch-manipulation"
          >
            <Plus className="w-4 h-4 mr-1 md:mr-2" />
            <span className="hidden md:inline">New Message</span>
            <span className="md:hidden">New</span>
          </Button>
          {(user?.role === "super_admin" || user?.role === "facility_manager") && (
            <Button
              onClick={handleMassMessage}
              variant="outline"
              className="border-purple-600 text-purple-600 hover:bg-purple-50 min-h-[44px] touch-manipulation"
            >
              <Mail className="w-4 h-4 mr-1 md:mr-2" />
              <span className="hidden md:inline">Mass Message</span>
              <span className="md:hidden">Mass</span>
            </Button>
          )}
          <Button
            onClick={handleNexSpaceMessage}
            variant="outline"
            className="border-green-600 text-green-600 hover:bg-green-50 min-h-[44px] touch-manipulation"
          >
            <MessageSquare className="w-4 h-4 mr-1 md:mr-2" />
            <span className="hidden md:inline">Message NexSpace</span>
            <span className="md:hidden">Support</span>
          </Button>
        </div>

        <Dialog open={isComposeOpen} onOpenChange={setIsComposeOpen}>
          <DialogTrigger asChild>
            <div style={{ display: "none" }} />
          </DialogTrigger>
          <DialogContent className="sm:max-w-md w-[95vw] md:w-full max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-lg md:text-xl">Compose Message</DialogTitle>
              <DialogDescription className="text-sm">
                {isNexSpaceMessage
                  ? "Send a message to the NexSpace support team"
                  : isMassMessage
                    ? "Send a message to multiple facility staff members"
                    : "Send a message"}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="to">To</Label>
                {isNexSpaceMessage ? (
                  <Input id="to" value="NexSpace Team" disabled className="bg-gray-50" />
                ) : isMassMessage ? (
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="presetGroup">Preset Groups</Label>
                      <Select
                        value={selectedPresetGroup}
                        onValueChange={handlePresetGroupSelection}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Choose a preset group or select manually..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="custom">Custom Selection</SelectItem>
                          {presetGroups.map((group) => (
                            <SelectItem key={group.id} value={group.id}>
                              {group.label} - {group.description}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          Recipients ({selectedRecipients.length} selected)
                        </div>
                        {selectedPresetGroup && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedPresetGroup("");
                              setSelectedRecipients([]);
                            }}
                          >
                            Clear Selection
                          </Button>
                        )}
                      </div>
                      <div className="max-h-40 overflow-y-auto border rounded-md p-2 space-y-1">
                        {facilityStaff.map((staff) => (
                          <div
                            key={staff.id}
                            className={cn(
                              "flex items-center p-2 rounded cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800",
                              selectedRecipients.some((r) => r.id === staff.id)
                                ? "bg-blue-50 dark:bg-blue-900"
                                : ""
                            )}
                            onClick={() => toggleRecipientSelection(staff)}
                          >
                            <input
                              type="checkbox"
                              checked={selectedRecipients.some((r) => r.id === staff.id)}
                              onChange={() => toggleRecipientSelection(staff)}
                              className="mr-3"
                            />
                            <div className="flex-1">
                              <div className="font-medium">
                                {staff.firstName} {staff.lastName}
                              </div>
                              <div className="text-sm text-gray-500">
                                {staff.role} - {staff.department}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <Select
                    value={selectedRecipient?.id.toString() || ""}
                    onValueChange={(value) => {
                      const recipient = facilityStaff.find(
                        (staff) => staff.id.toString() === value
                      );
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
                )}
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
                  disabled={
                    isSending ||
                    !subject.trim() ||
                    !content.trim() ||
                    (!isNexSpaceMessage && !isMassMessage && !selectedRecipient) ||
                    (isMassMessage && selectedRecipients.length === 0)
                  }
                >
                  {isSending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      Send Message
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setIsComposeOpen(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="inbox" className="space-y-6">
        <div className="flex justify-between items-center">
          <TabsList className="grid w-full grid-cols-2 max-w-md">
            <TabsTrigger value="inbox">
              Inbox{" "}
              {unreadCount > 0 && <Badge className="ml-2 bg-blue-600 text-xs">{unreadCount}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="sent">Sent</TabsTrigger>
          </TabsList>

          <div className="flex gap-2">
            <Button
              variant={showAllHistory ? "default" : "outline"}
              size="sm"
              onClick={() => setShowAllHistory(!showAllHistory)}
            >
              {showAllHistory ? "Current Messages" : "All History"}
            </Button>
            {chatView && (
              <Button variant="outline" size="sm" onClick={() => setChatView(false)}>
                Back to Messages
              </Button>
            )}
          </div>
        </div>

        <TabsContent value="inbox" className="space-y-4">
          {chatView && chatParticipant ? (
            <Card>
              <CardHeader>
                <CardTitle>Chat with {chatParticipant.name}</CardTitle>
                <CardDescription>Conversation history</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {getConversationHistory(chatParticipant.id).map((message: any) => (
                    <div
                      key={message.id}
                      className={cn(
                        "p-3 rounded-lg max-w-sm",
                        message.senderId === user?.id
                          ? "bg-blue-100 dark:bg-blue-900 ml-auto text-right"
                          : "bg-gray-100 dark:bg-gray-800"
                      )}
                    >
                      <p className="text-sm font-medium mb-1">
                        {message.senderId === user?.id
                          ? "You"
                          : getDisplayName(message.senderId, user, staff)}
                      </p>
                      <p className="text-sm">{message.content}</p>
                      <p className="text-xs text-gray-500 mt-1">{formatDate(message.timestamp)}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : showAllHistory ? (
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="space-y-2">
                {getAllMessageHistory().map((message: any) => (
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
                          <span className="font-medium text-sm">
                            {message.senderId === user?.id
                              ? `To: ${message.recipientName}`
                              : `From: ${getDisplayName(message.senderId, user, staff)}`}
                          </span>
                          {!message.isRead && message.recipientId === user?.id && (
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
                      <p className="text-xs text-gray-500 mt-2">{formatDate(message.timestamp)}</p>
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
                          From: {getDisplayName(selectedMessage.senderId, user, staff)}
                          <span className="mx-2">→</span>
                          To: {getDisplayName(selectedMessage.recipientId, user, staff)}
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
                    <div className="flex gap-2 mt-4 pt-4 border-t">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleChatClick(selectedMessage)}
                      >
                        <MessageSquare className="w-4 h-4 mr-2" />
                        Chat
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          ) : inboxMessages.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center">
                <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 dark:text-gray-400">No messages in your inbox</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="space-y-2">
                {inboxMessages.map((message) => (
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
                          <span className="font-medium text-sm">
                            {getDisplayName(message.senderId, user, staff)}
                          </span>
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
                      <p className="text-xs text-gray-500 mt-2">{formatDate(message.timestamp)}</p>
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
                          From: {getDisplayName(selectedMessage.senderId, user, staff)}
                          <span className="mx-2">→</span>
                          To: {getDisplayName(selectedMessage.recipientId, user, staff)}
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
                    <div className="flex gap-2 mt-4 pt-4 border-t">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleChatClick(selectedMessage)}
                      >
                        <MessageSquare className="w-4 h-4 mr-2" />
                        Chat
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </TabsContent>

        <TabsContent value="sent" className="space-y-4">
          {showAllHistory ? (
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="space-y-2">
                {getAllMessageHistory()
                  .filter((msg: any) => msg.senderId === user?.id)
                  .map((message: any) => (
                    <Card
                      key={message.id}
                      className={cn(
                        "cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-gray-800",
                        selectedMessage?.id === message.id && "ring-2 ring-blue-500"
                      )}
                      onClick={() => handleMessageClick(message)}
                    >
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
                          From: {getDisplayName(selectedMessage.senderId, user, staff)}
                          <span className="mx-2">→</span>
                          To: {getDisplayName(selectedMessage.recipientId, user, staff)}
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
                    <div className="flex gap-2 mt-4 pt-4 border-t">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleChatClick(selectedMessage)}
                      >
                        <MessageSquare className="w-4 h-4 mr-2" />
                        Chat
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          ) : sentMessages.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center">
                <Send className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 dark:text-gray-400">No sent messages</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="space-y-2">
                {sentMessages.map((message) => (
                  <Card
                    key={message.id}
                    className={cn(
                      "cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-gray-800",
                      selectedMessage?.id === message.id && "ring-2 ring-blue-500"
                    )}
                    onClick={() => handleMessageClick(message)}
                  >
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
                          From: {getDisplayName(selectedMessage.senderId, user, staff)}
                          <span className="mx-2">→</span>
                          To: {getDisplayName(selectedMessage.recipientId, user, staff)}
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
                    <div className="flex gap-2 mt-4 pt-4 border-t">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleChatClick(selectedMessage)}
                      >
                        <MessageSquare className="w-4 h-4 mr-2" />
                        Chat
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
