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

export function RoleBasedSidebar() {
  const { user, impersonatedUser } = useAuth();
  const { unreadCount } = useNotifications();
  const { getTotalUnreadCount } = useMessages();
  const [location] = useLocation();
  
  const currentUser = impersonatedUser || user;
  const userRole = currentUser?.role || 'employee';
  
  const messageUnreadCount = getTotalUnreadCount();
  
  // Define nav items based on role using the specified pattern
  const base = ['Dashboard', 'Calendar', 'My Requests', 'My Schedule', 'Resources', 'Messaging', 'Notifications'];
  const employee = [...base, 'PTO', 'Work Logs'];
  const contractor = [...base, 'Invoices'];
  const superuser = ['Staff Mgmt', 'Facilities', 'Admin', 'Teams', ...base];
  
  const items = userRole === 'employee'
    ? employee
    : userRole === 'contractor'
      ? contractor
      : userRole === 'super_admin' || userRole === 'admin'
        ? superuser
        : base;

  // Map items to NavItem objects
  const navItems: NavItem[] = items.map(item => {
    switch(item) {
      case 'Dashboard':
        return { href: '/dashboard', label: 'Dashboard', icon: Home, roles: [userRole] };
      case 'Calendar':
        return { href: '/calendar', label: 'Open Shifts', icon: Calendar, roles: [userRole] };
      case 'My Requests':
        return { href: '/my-requests', label: 'My Requests', icon: FileText, roles: [userRole] };
      case 'My Schedule':
        return { href: '/my-schedule', label: 'My Schedule', icon: Calendar, roles: [userRole] };
      case 'Resources':
        return { href: '/resources', label: 'Resources', icon: BookOpen, roles: [userRole] };
      case 'Messaging':
        return { href: '/messaging', label: 'Messaging', icon: MessageSquare, roles: [userRole] };
      case 'Notifications':
        return { href: '/notifications', label: 'Notifications', icon: Bell, roles: [userRole] };
      case 'PTO':
        return { href: '/my-pto', label: 'PTO', icon: Calendar, roles: [userRole] };
      case 'Work Logs':
        return { href: '/time-clock', label: 'Time Clock', icon: Clock, roles: [userRole] };
      case 'Invoices':
        return { href: '/invoices', label: 'Invoices', icon: CreditCard, roles: [userRole] };
      case 'Staff Mgmt':
        return { href: '/workforce', label: 'Staff Management', icon: Users, roles: [userRole] };
      case 'Facilities':
        return { href: '/facility-management', label: 'Facilities', icon: Settings, roles: [userRole] };
      case 'Admin':
        return { href: '/analytics', label: 'Analytics', icon: BarChart3, roles: [userRole] };
      case 'Teams':
        return { href: '/teams', label: 'Teams', icon: Users, roles: [userRole] };
      default:
        return { href: '/dashboard', label: 'Dashboard', icon: Home, roles: [userRole] };
    }
  });

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
          {navItems.map((item) => {
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

        {/* Quick Actions for workers */}
        {(userRole === 'employee' || userRole === 'contractor' || userRole === 'clinician') && (
          <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
              Quick Actions
            </h3>
            <div className="space-y-1">
              <Link href="/calendar">
                <div className="flex items-center space-x-3 px-3 py-2 rounded-lg text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800">
                  <Calendar className="h-4 w-4" />
                  <span>View Schedule</span>
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

        {/* Quick Actions for managers/admins */}
        {(userRole === 'manager' || userRole === 'admin' || userRole === 'super_admin') && (
          <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
              Quick Actions
            </h3>
            <div className="space-y-1">
              <Link href="/calendar">
                <div className="flex items-center space-x-3 px-3 py-2 rounded-lg text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800">
                  <PlusCircle className="h-4 w-4" />
                  <span>Post Shift</span>
                </div>
              </Link>
              <Link href="/workforce">
                <div className="flex items-center space-x-3 px-3 py-2 rounded-lg text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800">
                  <Users className="h-4 w-4" />
                  <span>Manage Staff</span>
                </div>
              </Link>
              <Link href="/analytics">
                <div className="flex items-center space-x-3 px-3 py-2 rounded-lg text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800">
                  <BarChart3 className="h-4 w-4" />
                  <span>View Reports</span>
                </div>
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}