import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Logo } from "@/components/ui/logo";
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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { User, UserRole } from "@shared/schema";

interface SidebarNavProps {
  user: User;
  expanded?: boolean;
  onToggle?: () => void;
}

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
    label: "Dashboard",
    href: "/",
    icon: <BarChart3 className="w-5 h-5" />,
  },
  {
    label: "Scheduling",
    icon: <Calendar className="w-5 h-5" />,
    children: [
      { label: "Calendar View", href: "/calendar", icon: <></> },
      { label: "Open Shifts", href: "/shifts/open", icon: <></> },
      {
        label: "Shift Requests",
        href: "/shifts/requests",
        icon: <></>,
        roles: [UserRole.FACILITY_MANAGER, UserRole.CLIENT_ADMINISTRATOR, UserRole.SUPER_ADMIN],
      },
      {
        label: "Shift Templates",
        href: "/shifts/templates",
        icon: <></>,
        roles: [UserRole.FACILITY_MANAGER, UserRole.CLIENT_ADMINISTRATOR, UserRole.SUPER_ADMIN],
      },
      { label: "Time Clock", href: "/time-clock", icon: <></> },
    ],
  },
  {
    label: "Workforce",
    icon: <Users className="w-5 h-5" />,
    roles: [UserRole.FACILITY_MANAGER, UserRole.CLIENT_ADMINISTRATOR, UserRole.SUPER_ADMIN],
    children: [
      { label: "All Staff", href: "/staff", icon: <></> },
      { label: "1099 Contractors", href: "/staff/contractors", icon: <></> },
      { label: "Referral System", href: "/staff/referrals", icon: <></> },
      { label: "Credentials", href: "/credentials", icon: <></> },
      { label: "Onboarding", href: "/staff/onboarding", icon: <></> },
    ],
  },
  {
    label: "Hiring",
    href: "/jobs",
    icon: <Briefcase className="w-5 h-5" />,
  },
  {
    label: "Insights",
    icon: <BarChart3 className="w-5 h-5" />,
    roles: [UserRole.FACILITY_MANAGER, UserRole.CLIENT_ADMINISTRATOR, UserRole.SUPER_ADMIN],
    children: [
      { label: "Overtime Report", href: "/analytics/overtime", icon: <></> },
      { label: "Attendance", href: "/analytics/attendance", icon: <></> },
      { label: "Agency Usage", href: "/analytics/agency", icon: <></> },
      { label: "Compliance", href: "/analytics/compliance", icon: <></> },
    ],
  },
  {
    label: "Billing",
    icon: <DollarSign className="w-5 h-5" />,
    children: [
      { label: "Invoices", href: "/invoices", icon: <></> },
      { label: "Work Logs", href: "/work-logs", icon: <></> },
      {
        label: "Payroll Export",
        href: "/payroll",
        icon: <></>,
        roles: [UserRole.FACILITY_MANAGER, UserRole.CLIENT_ADMINISTRATOR, UserRole.SUPER_ADMIN],
      },
    ],
  },
  {
    label: "Messages",
    href: "/messages",
    icon: <MessageSquare className="w-5 h-5" />,
    badge: 3,
  },
];

function NavItemComponent({
  item,
  userRole,
  expanded,
  level = 0,
}: {
  item: NavItem;
  userRole: string;
  expanded: boolean;
  level?: number;
}) {
  const [location] = useLocation();
  const [isOpen, setIsOpen] = useState(false);

  // Check if user has permission to see this item
  if (
    item.roles &&
    !item.roles.includes(userRole as UserRole) &&
    userRole !== UserRole.SUPER_ADMIN
  ) {
    return null;
  }

  const isActive = item.href === location;
  const hasChildren = item.children && item.children.length > 0;

  if (hasChildren) {
    return (
      <div className="space-y-1">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={cn(
            "w-full flex items-center justify-between px-3 py-2 text-sm font-medium rounded-lg transition-colors",
            level === 0
              ? "text-gray-700 hover:bg-gray-100"
              : "text-gray-600 hover:text-gray-900 hover:bg-gray-50",
            level > 0 && "ml-8"
          )}
        >
          <div className="flex items-center">
            {level === 0 && item.icon}
            <span className={cn("ml-3", !expanded && level === 0 && "sr-only")}>{item.label}</span>
          </div>
          {expanded && (
            <ChevronDown className={cn("w-4 h-4 transition-transform", isOpen && "rotate-180")} />
          )}
        </button>

        {isOpen && expanded && (
          <div className="space-y-1">
            {item.children?.map((child, index) => (
              <NavItemComponent
                key={index}
                item={child}
                userRole={userRole}
                expanded={expanded}
                level={level + 1}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <Link href={item.href!}>
      <button
        className={cn(
          "w-full flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors",
          isActive
            ? "text-blue-700 bg-blue-50"
            : level === 0
              ? "text-gray-700 hover:bg-gray-100"
              : "text-gray-600 hover:text-gray-900 hover:bg-gray-50",
          level > 0 && "ml-8"
        )}
      >
        {level === 0 && item.icon}
        <span className={cn("ml-3", !expanded && level === 0 && "sr-only")}>{item.label}</span>
        {item.badge && expanded && (
          <Badge variant="destructive" className="ml-auto">
            {item.badge}
          </Badge>
        )}
      </button>
    </Link>
  );
}

export function SidebarNav({ user, expanded = true, onToggle }: SidebarNavProps) {
  const { logoutMutation } = useAuth();

  const getRoleDisplay = (role: string) => {
    switch (role) {
      case UserRole.FACILITY_MANAGER:
        return "Facility Manager";
      case UserRole.CLIENT_ADMINISTRATOR:
        return "Administrator";
      case UserRole.CONTRACTOR_1099:
        return "Contractor";
      case UserRole.INTERNAL_EMPLOYEE:
        return "Employee";
      case UserRole.SUPER_ADMIN:
        return "Super Admin";
      default:
        return "User";
    }
  };

  return (
    <aside
      className={cn(
        "bg-white border-r border-gray-200 transition-all duration-300 ease-in-out flex-shrink-0",
        expanded ? "w-64" : "w-16"
      )}
    >
      <div className="flex flex-col h-full">
        {/* Logo Header */}
        <div className="flex items-center px-6 py-4 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <Logo size="sm" />
            {expanded && (
              <div>
                <h1 className="text-xl font-bold text-gray-900">NexSpace</h1>
                <p className="text-xs text-gray-500">{getRoleDisplay(user.role)}</p>
              </div>
            )}
          </div>

          <Button variant="ghost" size="sm" onClick={onToggle} className="ml-auto lg:hidden">
            <Menu className="h-4 w-4" />
          </Button>
        </div>

        {/* User Profile Section */}
        {expanded && (
          <div className="px-6 py-4 border-b border-gray-100">
            <div className="flex items-center space-x-3">
              <Avatar>
                <AvatarImage src={user.avatar || undefined} />
                <AvatarFallback>
                  {user.firstName[0]}
                  {user.lastName[0]}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {user.firstName} {user.lastName}
                </p>
                <p className="text-xs text-gray-500 truncate">
                  {/* Facility name would go here */}
                  Healthcare Professional
                </p>
              </div>
              <Link href="/settings">
                <Button variant="ghost" size="sm">
                  <Settings className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        )}

        {/* Navigation Menu */}
        <nav className="flex-1 px-4 py-4 space-y-2 overflow-y-auto">
          {navigationItems.map((item, index) => (
            <NavItemComponent key={index} item={item} userRole={user.role} expanded={expanded} />
          ))}
        </nav>

        {/* Bottom section */}
        <div className="px-4 py-4 border-t border-gray-200">
          <Button
            variant="ghost"
            onClick={() => logoutMutation.mutate()}
            className="w-full justify-start"
            disabled={logoutMutation.isPending}
          >
            <LogOut className="w-5 h-5" />
            {expanded && <span className="ml-3">Sign Out</span>}
          </Button>
        </div>
      </div>
    </aside>
  );
}
