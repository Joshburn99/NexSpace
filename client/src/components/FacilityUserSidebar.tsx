import React, { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { cn } from '@/lib/utils';
import { useFacilityPermissions } from '@/hooks/use-facility-permissions';
import { CanAccess } from './PermissionWrapper';
// Using direct URL for logo
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
  MessageSquare,
  Menu,
  X
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
    href: '/facility-dashboard',
    icon: Home,
    permissions: ['view_schedules', 'view_staff', 'view_reports'],
    description: 'Overview of facility operations'
  },
  {
    label: 'Schedule',
    icon: Calendar,
    permissions: ['view_schedules'],
    description: 'Schedule management and planning',
    children: [
      {
        label: 'Calendar View',
        href: '/schedule',
        icon: Calendar,
        permissions: ['view_schedules'],
        description: 'View and manage shift schedules'
      },
      {
        label: 'Shift Requests',
        href: '/shift-requests',
        icon: FileText,
        permissions: ['view_schedules'],
        description: 'View and manage shift requests'
      },
      {
        label: 'Shift Templates',
        href: '/shift-templates',
        icon: Clock,
        permissions: ['view_schedules'],
        description: 'Create and manage shift templates'
      }
    ]
  },
  {
    label: 'Staff Directory',
    href: '/staff-directory',
    icon: Users,
    permissions: ['view_staff'],
    description: 'View and manage staff members'
  },
  {
    label: 'Job Board',
    icon: Building,
    permissions: ['view_job_openings'],
    description: 'Job postings and recruitment',
    children: [
      {
        label: 'View Postings',
        href: '/job-postings',
        icon: FileText,
        permissions: ['view_job_openings'],
        description: 'View current job postings'
      },
      {
        label: 'Create Posting',
        href: '/create-job-posting',
        icon: Users,
        permissions: ['manage_job_openings'],
        description: 'Create new job postings'
      }
    ]
  },
  {
    label: 'Messages',
    href: '/messaging',
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
      },
      {
        label: 'Attendance',
        href: '/attendance',
        icon: UserCheck,
        permissions: ['view_attendance_reports'],
        description: 'Staff attendance tracking and reports'
      },
      {
        label: 'Overtime Report',
        href: '/overtime-report',
        icon: Clock,
        permissions: ['view_overtime_reports'],
        description: 'Overtime hours and cost analysis'
      },
      {
        label: 'Float Pool Savings',
        href: '/float-pool-analytics',
        icon: TrendingUp,
        permissions: ['view_float_pool_savings'],
        description: 'Float pool cost savings analysis'
      },
      {
        label: 'Agency Usage',
        href: '/agency-usage',
        icon: Building,
        permissions: ['view_agency_usage'],
        description: 'Agency staffing usage and costs'
      }
    ]
  },
  {
    label: 'Workflow Automation',
    href: '/workflow-automation',
    icon: Settings,
    permissions: ['view_workflow_automation'],
    description: 'Automated workflow management'
  },
  {
    label: 'Referral System',
    href: '/referral-system',
    icon: Users,
    permissions: ['view_referral_system'],
    description: 'Staff and facility referral management'
  },
  {
    label: 'Compliance',
    href: '/compliance',
    icon: Shield,
    permissions: ['view_compliance'],
    description: 'Manage compliance and credentials'
  },
  {
    label: 'Facility',
    icon: Building,
    permissions: ['view_facility_profile'],
    description: 'Facility management and settings',
    children: [
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
      }
    ]
  },
  {
    label: 'Audit Logs',
    href: '/facility-audit-logs',
    icon: Shield,
    permissions: ['view_audit_logs'],
    description: 'View activity history'
  },
  {
    label: 'My Profile',
    href: '/user-profile',
    icon: Users,
    permissions: [],
    description: 'View and edit your profile'
  }
];

interface FacilityUserSidebarProps {
  expanded?: boolean;
  onToggle?: () => void;
}

export function FacilityUserSidebar({ expanded = true, onToggle }: FacilityUserSidebarProps) {
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

  // Filter sidebar items based on permissions using permission wrapper logic
  const filterSidebarItems = (items: SidebarItem[]): SidebarItem[] => {
    return items.filter(item => {
      // Messages tab should always be visible
      if (item.label === 'Messages') return true;
      
      // Check if user has any of the required permissions
      const hasAccess = item.permissions.length === 0 || hasAnyPermission(item.permissions as any[]);
      
      console.log(`[SIDEBAR] Permission check for ${item.label}:`, {
        required: item.permissions,
        hasAccess,
        userPermissions: getUserPermissions(),
        userPermissionsCount: getUserPermissions().length
      });
      
      // If item has children, filter them recursively
      if (item.children) {
        const accessibleChildren = filterSidebarItems(item.children);
        // Only show parent if it has accessible children or user has direct access
        return hasAccess || accessibleChildren.length > 0;
      }
      
      return hasAccess;
    }).map(item => ({
      ...item,
      // Filter children if they exist
      children: item.children ? filterSidebarItems(item.children) : undefined
    }));
  };

  const accessibleItems = filterSidebarItems(SIDEBAR_ITEMS);

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
              "w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors group",
              "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white",
              !expanded ? "justify-center" : "justify-between"
            )}
            title={!expanded ? item.label : undefined}
          >
            <div className={cn("flex items-center", !expanded && "justify-center")}>
              <Icon className={cn(
                "h-5 w-5 flex-shrink-0 text-gray-400 dark:text-gray-400 group-hover:text-gray-500 dark:group-hover:text-gray-300",
                expanded && "mr-3"
              )} />
              {expanded && <span className="truncate">{item.label}</span>}
            </div>
            {expanded && (
              isExpanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )
            )}
          </button>
          {expanded && isExpanded && (
            <div className="ml-6 mt-1 space-y-1">
              {item.children?.map(child => 
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
            : "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white",
          !expanded && "justify-center"
        )}
        title={!expanded ? item.label : undefined}
      >
        <Icon className={cn(
          "h-5 w-5 flex-shrink-0",
          expanded && "mr-3",
          isActive
            ? "text-blue-600 dark:text-blue-300"
            : "text-gray-400 dark:text-gray-400 group-hover:text-gray-500 dark:group-hover:text-gray-300"
        )} />
        {expanded && <span className="truncate">{item.label}</span>}
      </Link>
    );
  };

  return (
    <div className={cn(
      "bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 min-h-screen transition-all duration-300",
      expanded ? "w-64" : "w-16"
    )}>
      <div className={cn("p-6", !expanded && "p-3")}>
        {/* Header with toggle */}
        <div className={cn("flex items-center mb-8", expanded ? "space-x-2" : "justify-center")}>
          <img 
            src="/nexspace-logo.png" 
            alt="NexSpace" 
            className={cn("object-contain", expanded ? "h-12 w-auto max-w-full" : "h-10 w-10")}
          />
          {onToggle && (
            <button
              onClick={onToggle}
              className="ml-auto p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              title={expanded ? "Collapse sidebar" : "Expand sidebar"}
            >
              {expanded ? (
                <ChevronRight className="h-4 w-4 text-gray-500" />
              ) : (
                <Menu className="h-4 w-4 text-gray-500" />
              )}
            </button>
          )}
        </div>
        
        <nav className="space-y-1">
          {accessibleItems.map(item => renderSidebarItem(item))}
        </nav>
        
        {/* Role-specific help text - only show when expanded */}
        {expanded && (
          <div className="mt-8 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Your navigation is customized based on your role permissions. Contact your administrator if you need access to additional features.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}