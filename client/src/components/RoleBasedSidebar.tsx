import React from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useNotifications } from '@/contexts/NotificationContext';
import { useMessages } from '@/contexts/MessageContext';
import { Link, useLocation } from 'wouter';
import { 
  Calendar, 
  Clock, 
  FileText, 
  MessageSquare, 
  Bell, 
  User, 
  Briefcase,
  CreditCard,
  PlusCircle,
  Shield,
  BookOpen,
  Users,
  Settings,
  Home,
  BarChart3
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
  roles: string[];
}

const navItems: NavItem[] = [
  {
    href: '/dashboard',
    label: 'Dashboard',
    icon: Home,
    roles: ['employee', 'contractor', 'clinician', 'manager', 'admin']
  },
  {
    href: '/calendar',
    label: 'Open Shifts',
    icon: Calendar,
    roles: ['employee', 'contractor', 'clinician']
  },
  {
    href: '/my-requests',
    label: 'My Requests',
    icon: FileText,
    roles: ['employee', 'contractor', 'clinician']
  },
  {
    href: '/time-clock',
    label: 'Time Clock',
    icon: Clock,
    roles: ['employee', 'contractor', 'clinician']
  },
  {
    href: '/my-pto',
    label: 'PTO',
    icon: Calendar,
    roles: ['employee', 'clinician'] // Only employees get PTO
  },
  {
    href: '/invoices',
    label: 'Invoices',
    icon: CreditCard,
    roles: ['contractor'] // Only contractors see invoices
  },
  {
    href: '/resources',
    label: 'Resources',
    icon: BookOpen,
    roles: ['employee', 'contractor', 'clinician']
  },
  {
    href: '/messaging',
    label: 'Messaging',
    icon: MessageSquare,
    roles: ['employee', 'contractor', 'clinician', 'manager', 'admin']
  },
  {
    href: '/job-board',
    label: 'Job Board',
    icon: Briefcase,
    roles: ['employee', 'contractor', 'clinician']
  },
  {
    href: '/profile',
    label: 'My Profile',
    icon: User,
    roles: ['employee', 'contractor', 'clinician']
  },
  {
    href: '/credentials',
    label: 'Credentials',
    icon: Shield,
    roles: ['employee', 'contractor', 'clinician']
  },
  {
    href: '/teams',
    label: 'Teams',
    icon: Users,
    roles: ['employee', 'contractor', 'clinician', 'manager', 'admin']
  },
  {
    href: '/notifications',
    label: 'Notifications',
    icon: Bell,
    roles: ['employee', 'contractor', 'clinician', 'manager', 'admin']
  },
  // Manager/Admin only sections
  {
    href: '/workforce',
    label: 'Staff Management',
    icon: Users,
    roles: ['manager', 'admin']
  },
  {
    href: '/analytics',
    label: 'Analytics',
    icon: BarChart3,
    roles: ['manager', 'admin']
  },
  {
    href: '/settings',
    label: 'Settings',
    icon: Settings,
    roles: ['manager', 'admin']
  }
];

export function RoleBasedSidebar() {
  const { user, impersonatedUser } = useAuth();
  const { unreadCount } = useNotifications();
  const { getTotalUnreadCount } = useMessages();
  const [location] = useLocation();
  
  const currentUser = impersonatedUser || user;
  const userRole = currentUser?.role || 'employee';
  
  const messageUnreadCount = getTotalUnreadCount();
  
  const filteredNavItems = navItems.filter(item => 
    item.roles.includes(userRole)
  );

  const getBadgeCount = (href: string) => {
    if (href === '/notifications') return unreadCount;
    if (href === '/messaging') return messageUnreadCount;
    return undefined;
  };

  return (
    <div className="w-64 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 h-full">
      <div className="p-4">
        <div className="flex items-center space-x-3 mb-6">
          <div className="h-8 w-8 bg-blue-600 rounded flex items-center justify-center">
            <span className="text-white font-bold text-sm">N</span>
          </div>
          <div>
            <h2 className="font-semibold text-gray-900 dark:text-white">NexSpace</h2>
            <p className="text-xs text-gray-500 capitalize">{userRole} Portal</p>
          </div>
        </div>

        <nav className="space-y-1">
          {filteredNavItems.map((item) => {
            const isActive = location === item.href;
            const badgeCount = getBadgeCount(item.href);
            
            return (
              <Link key={item.href} href={item.href}>
                <div
                  className={cn(
                    "flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                    isActive
                      ? "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200"
                      : "text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
                  )}
                >
                  <div className="flex items-center space-x-3">
                    <item.icon className="h-4 w-4" />
                    <span>{item.label}</span>
                  </div>
                  {badgeCount && badgeCount > 0 && (
                    <Badge variant="destructive" className="h-5 text-xs">
                      {badgeCount > 99 ? '99+' : badgeCount}
                    </Badge>
                  )}
                </div>
              </Link>
            );
          })}
        </nav>

        {/* Quick Actions for specific roles */}
        {(userRole === 'employee' || userRole === 'contractor' || userRole === 'clinician') && (
          <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
              Quick Actions
            </h3>
            <div className="space-y-1">
              <Link href="/calendar">
                <div className="flex items-center space-x-3 px-3 py-2 rounded-lg text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800">
                  <PlusCircle className="h-4 w-4" />
                  <span>Request Shift</span>
                </div>
              </Link>
              <Link href="/time-clock">
                <div className="flex items-center space-x-3 px-3 py-2 rounded-lg text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800">
                  <Clock className="h-4 w-4" />
                  <span>Clock In/Out</span>
                </div>
              </Link>
              <Link href="/messaging">
                <div className="flex items-center space-x-3 px-3 py-2 rounded-lg text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800">
                  <MessageSquare className="h-4 w-4" />
                  <span>Send Message</span>
                </div>
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}