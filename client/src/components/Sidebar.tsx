import { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Logo } from '@/components/ui/logo';
import {
  ChevronDown,
  BarChart3,
  Calendar,
  Users,
  Briefcase,
  DollarSign,
  MessageSquare,
  Settings,
  LogOut,
  Menu,
  FileText,
  Shield,
  Clock,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { UserRole } from '@shared/schema';

interface NavItem {
  label: string;
  href?: string;
  icon: React.ReactNode;
  children?: NavItem[];
  roles?: UserRole[];
  badge?: number;
}

const navigationItems: NavItem[] = [
  {
    label: 'Dashboard',
    href: '/',
    icon: <BarChart3 className="w-5 h-5" />,
  },
  {
    label: 'Scheduling',
    icon: <Calendar className="w-5 h-5" />,
    children: [
      {
        label: 'Calendar View',
        href: '/calendar',
        icon: <Calendar className="w-4 h-4" />,
      },
      {
        label: 'Enhanced Calendar',
        href: '/calendar-view',
        icon: <Calendar className="w-4 h-4" />,
      },
      {
        label: 'Scheduling',
        href: '/scheduling',
        icon: <Calendar className="w-4 h-4" />,
      },
      {
        label: 'Advanced Scheduling',
        href: '/advanced-scheduling',
        icon: <Calendar className="w-4 h-4" />,
      },
      {
        label: 'Open Shifts',
        href: '/shifts-open',
        icon: <Clock className="w-4 h-4" />,
      },
      {
        label: 'Shift Requests',
        href: '/shift-requests',
        icon: <Clock className="w-4 h-4" />,
        roles: [
          UserRole.FACILITY_MANAGER,
          UserRole.CLIENT_ADMINISTRATOR,
          UserRole.SUPER_ADMIN,
        ],
      },
      {
        label: 'Time Clock',
        href: '/time-clock',
        icon: <Clock className="w-4 h-4" />,
      },
    ],
  },
  {
    label: 'Workforce',
    icon: <Users className="w-5 h-5" />,
    roles: [
      UserRole.FACILITY_MANAGER,
      UserRole.CLIENT_ADMINISTRATOR,
      UserRole.SUPER_ADMIN,
    ],
    children: [
      {
        label: 'All Staff',
        href: '/staff',
        icon: <Users className="w-4 h-4" />,
      },
      {
        label: '1099 Contractors',
        href: '/staff/contractors',
        icon: <Users className="w-4 h-4" />,
      },
      {
        label: 'Referral System',
        href: '/staff/referrals',
        icon: <Users className="w-4 h-4" />,
      },
      {
        label: 'Credentials',
        href: '/credentials',
        icon: <Shield className="w-4 h-4" />,
      },
      {
        label: 'Facility Management',
        href: '/facility-management',
        icon: <Users className="w-4 h-4" />,
      },
      {
        label: 'Facility Recommendations',
        href: '/facility-recommendations',
        icon: <Users className="w-4 h-4" />,
      },
    ],
  },
  {
    label: 'Hiring',
    icon: <Briefcase className="w-5 h-5" />,
    children: [
      {
        label: 'Job Board',
        href: '/jobs',
        icon: <Briefcase className="w-4 h-4" />,
      },
      {
        label: 'Enhanced Job Board',
        href: '/job-board',
        icon: <Briefcase className="w-4 h-4" />,
      },
      {
        label: 'Job Posting',
        href: '/job-posting',
        icon: <Briefcase className="w-4 h-4" />,
      },
    ],
  },
  {
    label: 'Insights',
    icon: <BarChart3 className="w-5 h-5" />,
    roles: [
      UserRole.FACILITY_MANAGER,
      UserRole.CLIENT_ADMINISTRATOR,
      UserRole.SUPER_ADMIN,
    ],
    children: [
      {
        label: 'Analytics',
        href: '/analytics',
        icon: <BarChart3 className="w-4 h-4" />,
      },
      {
        label: 'Shift Analytics',
        href: '/analytics/shifts',
        icon: <BarChart3 className="w-4 h-4" />,
      },
      {
        label: 'Float Pool Savings',
        href: '/analytics/float-pool',
        icon: <DollarSign className="w-4 h-4" />,
      },
      {
        label: 'Overtime Report',
        href: '/analytics/overtime',
        icon: <FileText className="w-4 h-4" />,
      },
      {
        label: 'Attendance',
        href: '/analytics/attendance',
        icon: <BarChart3 className="w-4 h-4" />,
      },
      {
        label: 'Agency Usage',
        href: '/analytics/agency-usage',
        icon: <BarChart3 className="w-4 h-4" />,
      },
      {
        label: 'Compliance',
        href: '/analytics/compliance',
        icon: <Shield className="w-4 h-4" />,
      },
    ],
  },
  {
    label: 'Billing',
    icon: <DollarSign className="w-5 h-5" />,
    children: [
      {
        label: 'Professional Invoices',
        href: '/invoices',
        icon: <FileText className="w-4 h-4" />,
      },
      {
        label: 'Vendor Invoices',
        href: '/vendor-invoices',
        icon: <FileText className="w-4 h-4" />,
      },
      {
        label: 'Workflow Automation',
        href: '/workflow-automation',
        icon: <FileText className="w-4 h-4" />,
      },
    ],
  },
  {
    label: 'Messages',
    href: '/messages',
    icon: <MessageSquare className="w-5 h-5" />,
    badge: 3,
  },
  {
    label: 'Admin',
    icon: <Shield className="w-5 h-5" />,
    roles: [UserRole.CLIENT_ADMINISTRATOR, UserRole.SUPER_ADMIN],
    children: [
      {
        label: 'Impersonation',
        href: '/admin/impersonation',
        icon: <Shield className="w-4 h-4" />,
      },
      {
        label: 'User Management',
        href: '/admin/users',
        icon: <Users className="w-4 h-4" />,
      },
      {
        label: 'Facility Management',
        href: '/facility-management',
        icon: <Users className="w-4 h-4" />,
      },
      {
        label: 'System Settings',
        href: '/system-settings',
        icon: <Settings className="w-4 h-4" />,
      },
      {
        label: 'Audit Logs',
        href: '/admin/audit',
        icon: <FileText className="w-4 h-4" />,
      },
      {
        label: 'Database Console',
        href: '/admin/database',
        icon: <FileText className="w-4 h-4" />,
      },
    ],
  },
];

interface SidebarProps {
  expanded?: boolean;
  onToggle?: () => void;
}

export default function Sidebar({ expanded = true, onToggle }: SidebarProps) {
  const { user, logoutMutation } = useAuth();
  const [location] = useLocation();
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>(
    {},
  );

  if (!user) return null;

  const toggleItem = (label: string) => {
    setExpandedItems(prev => ({
      ...prev,
      [label]: !prev[label],
    }));
  };

  const hasPermission = (roles?: UserRole[]) => {
    if (!roles || roles.length === 0) return true;
    return roles.includes(user.role as UserRole);
  };

  const isActive = (href: string) => {
    if (href === '/' && location === '/') return true;
    if (href !== '/' && location.startsWith(href)) return true;
    return false;
  };

  const getRoleDisplay = (role: string) => {
    switch (role) {
      case UserRole.FACILITY_MANAGER:
        return 'Facility Manager';
      case UserRole.CLIENT_ADMINISTRATOR:
        return 'Administrator';
      case UserRole.CONTRACTOR_1099:
        return 'Contractor';
      case UserRole.INTERNAL_EMPLOYEE:
        return 'Employee';
      case UserRole.SUPER_ADMIN:
        return 'Super Admin';
      default:
        return 'User';
    }
  };

  const renderNavItem = (item: NavItem, level = 0) => {
    if (!hasPermission(item.roles)) return null;

    const hasChildren = item.children && item.children.length > 0;
    const isExpanded = expandedItems[item.label];
    const itemIsActive = item.href ? isActive(item.href) : false;

    if (hasChildren) {
      return (
        <div key={item.label}>
          <button
            onClick={() => toggleItem(item.label)}
            className={cn(
              'w-full flex items-center justify-between px-3 py-2 text-sm font-medium rounded-lg transition-colors',
              'text-gray-700 hover:bg-gray-100',
              level > 0 && 'ml-8',
            )}
          >
            <div className="flex items-center">
              {level === 0 && item.icon}
              <span
                className={cn('ml-3', !expanded && level === 0 && 'sr-only')}
              >
                {item.label}
              </span>
            </div>
            {expanded && (
              <ChevronDown
                className={cn(
                  'w-4 h-4 transition-transform',
                  isExpanded && 'rotate-180',
                )}
              />
            )}
          </button>
          {isExpanded && expanded && (
            <div className="mt-1">
              {item.children?.map(child => renderNavItem(child, level + 1))}
            </div>
          )}
        </div>
      );
    }

    return (
      <Link key={item.label} href={item.href!}>
        <button
          className={cn(
            'w-full flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors',
            itemIsActive
              ? 'text-blue-700 bg-blue-50'
              : level === 0
                ? 'text-gray-700 hover:bg-gray-100'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50',
            level > 0 && 'ml-8',
          )}
        >
          {level === 0 && item.icon}
          <span className={cn('ml-3', !expanded && level === 0 && 'sr-only')}>
            {item.label}
          </span>
          {item.badge && expanded && (
            <Badge variant="destructive" className="ml-auto">
              {item.badge}
            </Badge>
          )}
        </button>
      </Link>
    );
  };

  return (
    <div
      className={cn(
        'flex flex-col h-full bg-white border-r border-gray-200 transition-all duration-300',
        expanded ? 'w-64' : 'w-16',
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        {expanded ? (
          <div className="flex items-center">
            <Logo className="h-8 w-8 mr-2" />
            <div>
              <h1 className="text-lg font-bold text-gray-900">NexSpace</h1>
              <p className="text-xs text-gray-500">Healthcare Staffing</p>
            </div>
          </div>
        ) : (
          <Logo className="h-8 w-8" />
        )}
        {onToggle && (
          <Button variant="ghost" size="sm" onClick={onToggle} className="p-1">
            <Menu className="w-4 h-4" />
          </Button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 overflow-y-auto">
        <div className="space-y-1">
          {navigationItems.map(item => renderNavItem(item))}
        </div>
      </nav>

      {/* Settings */}
      <div className="p-3 border-t border-gray-200">
        <Link href="/settings">
          <button
            className={cn(
              'w-full flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors',
              isActive('/settings')
                ? 'text-blue-700 bg-blue-50'
                : 'text-gray-700 hover:bg-gray-100',
            )}
          >
            <Settings className="w-5 h-5" />
            <span className={cn('ml-3', !expanded && 'sr-only')}>Settings</span>
          </button>
        </Link>
      </div>

      {/* User Profile */}
      <div className="p-3 border-t border-gray-200">
        <div
          className={cn(
            'flex items-center',
            expanded ? 'space-x-3' : 'justify-center',
          )}
        >
          <Avatar className="h-8 w-8">
            <AvatarImage src={user.avatar || undefined} />
            <AvatarFallback>
              {user.username?.slice(0, 2).toUpperCase() || 'U'}
            </AvatarFallback>
          </Avatar>
          {expanded && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {user.username}
              </p>
              <p className="text-xs text-gray-500 truncate">
                {getRoleDisplay(user.role)}
              </p>
            </div>
          )}
        </div>
        {expanded && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => logoutMutation.mutate()}
            className="w-full mt-2"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </Button>
        )}
      </div>
    </div>
  );
}
