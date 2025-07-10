import React, { useState } from 'react';
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
  TrendingUp,
  ChevronDown,
  ChevronRight,
  MessageCircle,
  MessageSquare
} from 'lucide-react';

interface SidebarItem {
  label: string;
  href?: string;
  icon: React.ComponentType<{ className?: string }>;
  permissions: string[];
  description?: string;
  children?: SidebarItem[];
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
    label: 'Shift Requests',
    href: '/shift-requests',
    icon: FileText,
    permissions: ['view_schedules'],
    description: 'View and manage shift requests'
  },
  {
    label: 'Messages',
    href: '/messages',
    icon: MessageSquare,
    permissions: [],
    description: 'Communicate with staff and NexSpace team'
  },
  {
    label: 'Billing',
    icon: DollarSign,
    permissions: ['view_billing'],
    description: 'Financial management and invoicing',
    children: [
      {
        label: 'Dashboard',
        href: '/billing-dashboard',
        icon: DollarSign,
        permissions: ['view_billing'],
        description: 'Billing overview and metrics'
      },
      {
        label: 'Rates',
        href: '/billing-rates',
        icon: TrendingUp,
        permissions: ['view_rates'],
        description: 'View and manage billing rates'
      },
      {
        label: 'Professional Invoices',
        href: '/invoices',
        icon: FileText,
        permissions: ['view_billing'],
        description: 'Professional staff invoices'
      },
      {
        label: 'Vendor Invoices',
        href: '/vendor-invoices',
        icon: FileText,
        permissions: ['view_billing'],
        description: 'Vendor and contractor invoices'
      }
    ]
  },
  {
    label: 'Reports',
    icon: BarChart3,
    permissions: ['view_reports'],
    description: 'Analytics and reporting',
    children: [
      {
        label: 'Reports Dashboard',
        href: '/reports',
        icon: BarChart3,
        permissions: ['view_reports'],
        description: 'View facility reports and metrics'
      },
      {
        label: 'Analytics',
        href: '/analytics',
        icon: TrendingUp,
        permissions: ['view_analytics'],
        description: 'Advanced analytics and insights'
      }
    ]
  },
  {
    label: 'Compliance',
    href: '/compliance',
    icon: Shield,
    permissions: ['view_compliance', 'manage_compliance'],
    description: 'Manage compliance and credentials'
  },
  {
    label: 'Facility Profile',
    href: '/facility-profile',
    icon: Building,
    permissions: ['view_facility_profile'],
    description: 'View facility information'
  },
  {
    label: 'Facility Settings',
    href: '/facility-settings',
    icon: Settings,
    permissions: ['manage_facility_settings'],
    description: 'Configure facility operations'
  },
  {
    label: 'Facility Users',
    href: '/facility-users',
    icon: UserCheck,
    permissions: ['manage_facility_users'],
    description: 'Manage facility users and roles'
  },
  {
    label: 'Audit Logs',
    href: '/facility-audit-logs',
    icon: Shield,
    permissions: ['view_audit_logs'],
    description: 'View activity history'
  }
];

export function FacilityUserSidebar() {
  const [location] = useLocation();
  const { hasAnyPermission, getUserPermissions } = useFacilityPermissions();
  const [expandedItems, setExpandedItems] = useState<string[]>([]);

  const toggleExpanded = (itemLabel: string) => {
    setExpandedItems(prev => 
      prev.includes(itemLabel) 
        ? prev.filter(label => label !== itemLabel)
        : [...prev, itemLabel]
    );
  };

  const accessibleItems = SIDEBAR_ITEMS.filter(item => {
    const hasAccess = hasAnyPermission(item.permissions as any[]);
    console.log(`Sidebar item ${item.label}:`, {
      required: item.permissions,
      hasAccess,
      userPermissions: getUserPermissions()
    });
    return hasAccess;
  });

  const renderSidebarItem = (item: SidebarItem, level = 0) => {
    const Icon = item.icon;
    const isExpanded = expandedItems.includes(item.label);
    const isActive = item.href && (location === item.href || location.startsWith(item.href + '/'));
    const hasChildren = item.children && item.children.length > 0;

    if (hasChildren) {
      return (
        <div key={item.label}>
          <button
            onClick={() => toggleExpanded(item.label)}
            className={cn(
              "w-full flex items-center justify-between px-3 py-2 text-sm font-medium rounded-md transition-colors group",
              "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white"
            )}
          >
            <div className="flex items-center">
              <Icon className="mr-3 h-5 w-5 flex-shrink-0 text-gray-400 dark:text-gray-400 group-hover:text-gray-500 dark:group-hover:text-gray-300" />
              <span className="truncate">{item.label}</span>
            </div>
            {isExpanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </button>
          {isExpanded && (
            <div className="ml-6 mt-1 space-y-1">
              {item.children?.filter(child => hasAnyPermission(child.permissions as any[])).map(child => 
                renderSidebarItem(child, level + 1)
              )}
            </div>
          )}
        </div>
      );
    }

    return (
      <Link
        key={item.label}
        href={item.href!}
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
  };

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
          {accessibleItems.map(item => renderSidebarItem(item))}
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