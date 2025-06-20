import React, { createContext, useContext, useState, ReactNode } from 'react';

export type NotificationType = 
  | 'shift_request' | 'assignment_change' | 'message' 
  | 'credential_update' | 'favorite_shift' | 'social_post';

export type Notification = {
  id: string;
  type: NotificationType;
  message: string;
  timestamp: string;
  read: boolean;
  meta?: any;
};

export type Preferences = Record<NotificationType, {
  email: boolean;
  sms: boolean;
  push: boolean;
}>;

const samplePrefs: Preferences = {
  shift_request: { email: true, sms: false, push: true },
  assignment_change: { email: true, sms: false, push: true },
  message: { email: true, sms: false, push: true },
  credential_update: { email: true, sms: false, push: true },
  favorite_shift: { email: true, sms: false, push: true },
  social_post: { email: true, sms: false, push: true },
};

const sampleNotifications: Notification[] = [
  {
    id: '1',
    type: 'shift_request',
    message: 'Your shift request for ICU Night Shift has been approved',
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    read: false,
    meta: { shiftId: 1 }
  },
  {
    id: '2',
    type: 'message',
    message: 'New message from Sarah Johnson in ICU Team',
    timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
    read: false,
    meta: { threadId: 'team-icu' }
  },
  {
    id: '3',
    type: 'credential_update',
    message: 'Your CPR certification expires in 30 days',
    timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    read: true,
    meta: { credentialId: 'cpr-cert' }
  }
];

const NotificationContext = createContext<{
  notifications: Notification[];
  prefs: Preferences;
  unreadCount: number;
  add: (n: Notification) => void;
  markRead: (id: string) => void;
  markAllRead: () => void;
  updatePref: (type: NotificationType, changes: Partial<Preferences[NotificationType]>) => void;
} | null>(null);

export const NotificationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<Notification[]>(sampleNotifications);
  const [prefs, setPrefs] = useState<Preferences>(samplePrefs);
  
  const unreadCount = notifications.filter(n => !n.read).length;
  
  const add = (n: Notification) => setNotifications(prev => [n, ...prev]);
  
  const markRead = (id: string) => 
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  
  const markAllRead = () =>
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  
  const updatePref = (type: NotificationType, changes: Partial<Preferences[NotificationType]>) => 
    setPrefs(prev => ({ ...prev, [type]: { ...prev[type], ...changes } }));

  return (
    <NotificationContext.Provider value={{
      notifications,
      prefs,
      unreadCount,
      add,
      markRead,
      markAllRead,
      updatePref
    }}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotifications must be used within NotificationProvider');
  return ctx;
};