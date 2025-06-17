import { useState } from "react";
import { MessageSquare, Send, Search, Phone, Video } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { SidebarNav } from "@/components/ui/sidebar-nav";

export default function MessagingPage() {
  const { user } = useAuth();
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState("");

  const { data: messages = [] } = useQuery({
    queryKey: ["/api/messages"],
    enabled: !!user,
  });

  const conversations = (messages as any[]).reduce((acc: any, message: any) => {
    const conversationId = message.conversationId;
    if (!acc[conversationId]) {
      acc[conversationId] = {
        id: conversationId,
        participants: [message.sender, message.recipient].filter(Boolean),
        lastMessage: message,
        messages: []
      };
    }
    acc[conversationId].messages.push(message);
    if (new Date(message.createdAt) > new Date(acc[conversationId].lastMessage.createdAt)) {
      acc[conversationId].lastMessage = message;
    }
    return acc;
  }, {});

  const conversationList = Object.values(conversations);

  const handleSendMessage = () => {
    if (!newMessage.trim() || !selectedConversation) return;
    // TODO: Implement send message mutation
    setNewMessage("");
  };

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      <SidebarNav user={user!} />
      <div className="flex-1 overflow-hidden">
        <div className="flex h-full">
          {/* Conversations List */}
          <div className="w-80 border-r bg-white dark:bg-gray-800 flex flex-col">
            <div className="p-4 border-b">
              <h2 className="text-lg font-semibold mb-3">Messages</h2>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search conversations..."
                  className="pl-10"
                />
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto">
              {conversationList.length === 0 ? (
                <div className="p-4 text-center text-gray-500">
                  No conversations yet
                </div>
              ) : (
                conversationList.map((conversation: any) => (
                  <button
                    key={conversation.id}
                    onClick={() => setSelectedConversation(conversation.id)}
                    className={`w-full p-4 border-b hover:bg-gray-50 dark:hover:bg-gray-700 text-left ${
                      selectedConversation === conversation.id ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <Avatar className="w-10 h-10">
                        <AvatarFallback>
                          {conversation.participants[0]?.firstName?.[0]}
                          {conversation.participants[0]?.lastName?.[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <h3 className="font-medium text-sm truncate">
                            {conversation.participants[0]?.firstName} {conversation.participants[0]?.lastName}
                          </h3>
                          <span className="text-xs text-gray-500">
                            {new Date(conversation.lastMessage.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-300 truncate">
                          {conversation.lastMessage.content}
                        </p>
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Chat Area */}
          <div className="flex-1 flex flex-col bg-white dark:bg-gray-800">
            {selectedConversation ? (
              <>
                {/* Chat Header */}
                <div className="p-4 border-b flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar className="w-8 h-8">
                      <AvatarFallback>
                        {conversations[selectedConversation]?.participants[0]?.firstName?.[0]}
                        {conversations[selectedConversation]?.participants[0]?.lastName?.[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="font-medium">
                        {conversations[selectedConversation]?.participants[0]?.firstName} {conversations[selectedConversation]?.participants[0]?.lastName}
                      </h3>
                      <p className="text-sm text-gray-500">{conversations[selectedConversation]?.participants[0]?.role}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm">
                      <Phone className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="sm">
                      <Video className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {conversations[selectedConversation]?.messages.map((message: any) => (
                    <div
                      key={message.id}
                      className={`flex ${message.senderId === user?.id ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                          message.senderId === user?.id
                            ? 'bg-blue-500 text-white'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white'
                        }`}
                      >
                        <p className="text-sm">{message.content}</p>
                        <p className="text-xs mt-1 opacity-70">
                          {new Date(message.createdAt).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Message Input */}
                <div className="p-4 border-t">
                  <div className="flex items-center gap-2">
                    <Input
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder="Type a message..."
                      onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                      className="flex-1"
                    />
                    <Button onClick={handleSendMessage} size="sm">
                      <Send className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                    Select a conversation
                  </h3>
                  <p className="text-gray-500">
                    Choose a conversation from the sidebar to start messaging
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}