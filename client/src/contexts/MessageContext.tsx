import React, { createContext, useContext, useState, ReactNode } from 'react';
import { useAuth } from '@/hooks/use-auth';

export interface Message {
  id: string;
  threadId: string;
  senderId: number;
  senderName: string;
  content: string;
  timestamp: string;
  attachments?: {
    id: string;
    name: string;
    url: string;
    type: string;
    size: number;
  }[];
  edited?: boolean;
  editedAt?: string;
}

export interface Thread {
  id: string;
  type: 'direct' | 'group' | 'social';
  name: string;
  participants: number[];
  participantNames: string[];
  lastMessage?: Message;
  unreadCount: number;
  createdAt: string;
  updatedAt: string;
  avatar?: string;
}

const sampleThreads: Thread[] = [
  {
    id: 'team-icu',
    type: 'group',
    name: 'ICU Team',
    participants: [1, 2, 3, 4],
    participantNames: ['Alice Smith', 'Bob Johnson', 'Carol Lee', 'David Wilson'],
    unreadCount: 2,
    createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'direct-alice',
    type: 'direct',
    name: 'Alice Smith',
    participants: [1, 3],
    participantNames: ['Alice Smith'],
    unreadCount: 0,
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'social-feed',
    type: 'social',
    name: 'Facility Social Feed',
    participants: [],
    participantNames: [],
    unreadCount: 1,
    createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
  }
];

const sampleMessages: Message[] = [
  {
    id: 'msg-1',
    threadId: 'team-icu',
    senderId: 1,
    senderName: 'Alice Smith',
    content: 'Great job on the night shift everyone! Patient care was excellent.',
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'msg-2',
    threadId: 'team-icu',
    senderId: 2,
    senderName: 'Bob Johnson',
    content: 'Thanks Alice! The new protocols are really helping with efficiency.',
    timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'msg-3',
    threadId: 'direct-alice',
    senderId: 1,
    senderName: 'Alice Smith',
    content: 'Hey, can you cover my shift on Friday? I have a family emergency.',
    timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'msg-4',
    threadId: 'social-feed',
    senderId: 4,
    senderName: 'David Wilson',
    content: 'Congratulations to our ICU team for achieving the highest patient satisfaction scores this quarter! 🎉',
    timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
    attachments: [
      {
        id: 'att-1',
        name: 'Q4_Patient_Satisfaction.pdf',
        url: '/files/Q4_Patient_Satisfaction.pdf',
        type: 'application/pdf',
        size: 2048576
      }
    ]
  }
];

interface MessageContextType {
  threads: Thread[];
  messages: Message[];
  activeThreadId: string | null;
  setActiveThread: (threadId: string | null) => void;
  sendMessage: (threadId: string, content: string, attachments?: File[]) => void;
  createThread: (type: Thread['type'], name: string, participants: number[]) => string;
  getThreadMessages: (threadId: string) => Message[];
  getTotalUnreadCount: () => number;
  markThreadAsRead: (threadId: string) => void;
  isLoading: boolean;
}

const MessageContext = createContext<MessageContextType | null>(null);

export const MessageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [threads, setThreads] = useState<Thread[]>(sampleThreads);
  const [messages, setMessages] = useState<Message[]>(sampleMessages);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const setActiveThread = (threadId: string | null) => {
    setActiveThreadId(threadId);
    if (threadId) {
      markThreadAsRead(threadId);
    }
  };

  const sendMessage = (threadId: string, content: string, attachments?: File[]) => {
    if (!user) return;

    const newMessage: Message = {
      id: `msg-${Date.now()}`,
      threadId,
      senderId: user.id,
      senderName: `${user.firstName} ${user.lastName}`,
      content,
      timestamp: new Date().toISOString(),
      attachments: attachments?.map(file => ({
        id: `att-${Date.now()}-${file.name}`,
        name: file.name,
        url: URL.createObjectURL(file),
        type: file.type,
        size: file.size
      }))
    };

    setMessages(prev => [...prev, newMessage]);
    
    // Update thread's last message and timestamp
    setThreads(prev => prev.map(thread => 
      thread.id === threadId 
        ? { ...thread, lastMessage: newMessage, updatedAt: newMessage.timestamp }
        : thread
    ));
  };

  const createThread = (type: Thread['type'], name: string, participants: number[]): string => {
    const newThreadId = `thread-${Date.now()}`;
    const newThread: Thread = {
      id: newThreadId,
      type,
      name,
      participants,
      participantNames: [], // Would be populated from user data in real implementation
      unreadCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setThreads(prev => [newThread, ...prev]);
    return newThreadId;
  };

  const getThreadMessages = (threadId: string): Message[] => {
    return messages
      .filter(msg => msg.threadId === threadId)
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  };

  const getTotalUnreadCount = (): number => {
    return threads.reduce((total, thread) => total + thread.unreadCount, 0);
  };

  const markThreadAsRead = (threadId: string) => {
    setThreads(prev => prev.map(thread =>
      thread.id === threadId ? { ...thread, unreadCount: 0 } : thread
    ));
  };

  const value: MessageContextType = {
    threads,
    messages,
    activeThreadId,
    setActiveThread,
    sendMessage,
    createThread,
    getThreadMessages,
    getTotalUnreadCount,
    markThreadAsRead,
    isLoading
  };

  return (
    <MessageContext.Provider value={value}>
      {children}
    </MessageContext.Provider>
  );
};

export const useMessages = (): MessageContextType => {
  const context = useContext(MessageContext);
  if (!context) {
    throw new Error('useMessages must be used within a MessageProvider');
  }
  return context;
};