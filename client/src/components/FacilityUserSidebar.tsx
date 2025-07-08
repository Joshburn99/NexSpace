import React from 'react';
import { Link, useLocation } from 'wouter';
import { cn } from '@/lib/utils';
import { useFacilityPermissions } from '@/hooks/use-facility-permissions';
import {
  Calendar,
  Users,
  DollarSign,
  BarChart3,
  FileText,
  Shield,
  Settings,
  UserCheck,
  Home,
  Clock,
  Building,
  TrendingUp
} from 'lucide-react';

interface SidebarItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  permissions: string[];
  description?: string;
}

const SIDEBAR_ITEMS: SidebarItem[] = [
  {
    label: 'Dashboard',
    href: '/dashboard',
    icon: Home,
    permissions: ['view_schedules', 'view_staff', 'view_reports'],
    description: 'Overview of facility operations'
  },
  {
    label: 'Schedule',
    href: '/schedule',
    icon: Calendar,
    permissions: ['view_schedules'],
    description: 'View and manage shift schedules'
  },
  {
    label: 'Staff Directory',
    href: '/staff-directory',
    icon: Users,
    permissions: ['view_staff'],
    description: 'View and manage staff members'
  },
  {
    label: 'Open Shifts',
    href: '/open-shifts',
    icon: Clock,
    permissions: ['view_schedules'],
    description: 'View and fill open shifts'
  },
  {
    label: 'My Requests',
    href: '/my-requests',
    icon: FileText,
    permissions: ['view_schedules'],
    description: 'View shift requests and time-off'
  },
  {
    label: 'Billing',
    href: '/billing',
    icon: DollarSign,
    permissions: ['view_billing'],
    description: 'Manage invoices and billing'
  },
  {
    label: 'Reports',
    href: '/reports',
    icon: BarChart3,
    permissions: ['view_reports'],
    description: 'View operational reports'
  },
  {
    label: 'Analytics',
    href: '/analytics',
    icon: TrendingUp,
    permissions: ['view_analytics'],
    description: 'Advanced analytics and insights'
  },
  {
    label: 'Compliance',
    href: '/compliance',
    icon: Shield,
    permissions: ['view_compliance', 'manage_compliance'],
    description: 'Manage compliance and credentials'
  },
  {
    label: 'Facility Settings',
    href: '/facility-settings',
    icon: Building,
    permissions: ['view_facility_profile'],
    description: 'Configure facility settings'
  },
  {
    label: 'User Management',
    href: '/admin/users',
    icon: UserCheck,
    permissions: ['manage_facility_users'],
    description: 'Manage facility users and roles'
  },
  {
    label: 'System Settings',
    href: '/settings',
    icon: Settings,
    permissions: ['edit_facility_profile'],
    description: 'System configuration'
  }
];

export function FacilityUserSidebar() {
  const [location] = useLocation();
  const { hasAnyPermission } = useFacilityPermissions();

  const accessibleItems = SIDEBAR_ITEMS.filter(item => 
    hasAnyPermission(item.permissions as any[])
  );

  return (
    <div className="bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 w-64 min-h-screen">
      <div className="p-6">
        <div className="flex items-center space-x-2 mb-8">
          <div className="h-8 w-8 bg-blue-600 rounded flex items-center justify-center">
            <span className="text-white font-bold text-sm">N</span>
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900 dark:text-white">NexSpace</h1>
            <p className="text-xs text-gray-500 dark:text-gray-400">Facility Portal</p>
          </div>
        </div>
        
        <nav className="space-y-1">
          {accessibleItems.map((item) => {
            const Icon = item.icon;
            const isActive = location === item.href || location.startsWith(item.href + '/');
            
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors group",
                  isActive
                    ? "bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-200"
                    : "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white"
                )}
              >
                <Icon className={cn(
                  "mr-3 h-5 w-5 flex-shrink-0",
                  isActive
                    ? "text-blue-600 dark:text-blue-300"
                    : "text-gray-400 dark:text-gray-400 group-hover:text-gray-500 dark:group-hover:text-gray-300"
                )} />
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}
        </nav>
        
        {/* Role-specific help text */}
        <div className="mt-8 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <p className="text-xs text-gray-600 dark:text-gray-400">
            Your navigation is customized based on your role permissions. Contact your administrator if you need access to additional features.
          </p>
        </div>
      </div>
    </div>
  );
}