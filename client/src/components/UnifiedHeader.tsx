import React, { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "@/components/ui/navigation-menu";
import { cn } from "@/lib/utils";
import {
  LogOut,
  User,
  Settings,
  Building2,
  Calendar,
  MessageSquare,
  BarChart3,
  Users,
  ClipboardList,
  Menu,
  X,
  ChevronDown,
  Shield,
  CreditCard,
  FileText,
  Briefcase,
  Clock,
  UserCheck,
  Home,
  HelpCircle,
} from "lucide-react";
import { GlobalSearch } from "./GlobalSearch";
import { NotificationDropdown } from "./NotificationDropdown";
import { ImpersonationIndicator } from "./ImpersonationIndicator";
import { EnhancedMobileNavigation } from "./enhanced-mobile-navigation";
import { CompactNavigationDropdown } from "./CompactNavigationDropdown";

// Type for navigation items
type NavigationItem = {
  label: string;
  href?: string;
  icon: any;
  items?: { label: string; href: string }[];
};

// Streamlined navigation with improved hierarchy and UX
const getNavigationItems = (user: any): NavigationItem[] => {
  const isSuperAdmin = user?.role === "super_admin";
  const isAdmin = user?.role === "admin" || isSuperAdmin;
  const isFacilityUser =
    user?.role &&
    [
      "facility_admin",
      "facility_administrator",
      "scheduling_coordinator", 
      "hr_manager",
      "corporate",
      "regional_director",
      "billing",
      "supervisor",
      "director_of_nursing",
    ].includes(user.role);
  const isEmployee = user?.role === "employee";
  const isContractor = user?.role === "contractor";

  if (isAdmin) {
    return [
      { label: "Dashboard", href: "/", icon: Home },
      {
        label: "Facilities",
        icon: Building2,
        items: [
          { label: "All Facilities", href: "/enhanced-facilities" },
          { label: "Facility Profiles", href: "/enhanced-facilities" },
          { label: "Teams", href: "/admin/teams" },
        ],
      },
      {
        label: "Workforce",
        icon: Users,
        items: [
          { label: "Staff Directory", href: "/staff-directory" },
          { label: "Staff Management", href: "/staff" },
          { label: "Shift Requests", href: "/shift-requests" },
          { label: "Credentials", href: "/credentials" },
          { label: "Time Off", href: "/time-off-management" },
        ],
      },
      {
        label: "Scheduling",
        icon: Calendar,
        items: [
          { label: "Calendar", href: "/enhanced-calendar" },
          { label: "Shift Templates", href: "/shift-templates" },
          { label: "Open Shifts", href: "/shifts-open" },
          { label: "Time Clock", href: "/time-clock" },
        ],
      },
      {
        label: "Analytics",
        icon: BarChart3,
        items: [
          { label: "Dashboard", href: "/analytics" },
          { label: "Shift Analytics", href: "/analytics/shifts" },
          { label: "Float Pool Savings", href: "/analytics/float-pool" },
          { label: "Overtime Report", href: "/analytics/overtime" },
          { label: "Attendance", href: "/analytics/attendance" },
          { label: "Agency Usage", href: "/analytics/agency-usage" },
          { label: "Compliance", href: "/analytics/compliance" },
        ],
      },
      {
        label: "Billing",
        icon: CreditCard,
        items: [
          { label: "Professional Invoices", href: "/invoices" },
          { label: "Vendor Invoices", href: "/vendor-invoices" },
          { label: "Workflow Automation", href: "/workflow-automation" },
        ],
      },
      { label: "Messages", href: "/messaging", icon: MessageSquare },
      {
        label: "Hiring",
        icon: Briefcase,
        items: [
          { label: "Job Board", href: "/job-board" },
          { label: "Job Posting", href: "/job-posting" },
        ],
      },
      {
        label: "Admin",
        icon: Shield,
        items: [
          { label: "Impersonation", href: "/admin/impersonation" },
          { label: "User Management", href: "/admin/users" },
          { label: "Audit Logs", href: "/admin/audit-logs" },
          { label: "Database Console", href: "/admin/database" },
          { label: "System Settings", href: "/system-settings" },
        ],
      },
    ];
  }

  if (isFacilityUser) {
    const items: NavigationItem[] = [{ label: "Dashboard", href: "/facility-dashboard", icon: Home }];

    // Schedule dropdown
    const scheduleItems: { label: string; href: string }[] = [];
    if (user?.permissions?.includes("view_schedules")) {
      scheduleItems.push({ label: "Calendar View", href: "/schedule" });
      scheduleItems.push({ label: "Shift Requests", href: "/shift-requests" });
      scheduleItems.push({ label: "Shift Templates", href: "/shift-templates" });
    }
    if (scheduleItems.length > 0) {
      items.push({
        label: "Schedule",
        icon: Calendar,
        items: scheduleItems,
      });
    }

    // Staff Directory
    if (user?.permissions?.includes("view_staff")) {
      items.push({ label: "Staff Directory", href: "/staff-directory", icon: Users });
    }

    // Job Board dropdown
    const jobBoardItems: { label: string; href: string }[] = [];
    if (user?.permissions?.includes("view_job_openings")) {
      jobBoardItems.push({ label: "View Postings", href: "/job-postings" });
    }
    if (user?.permissions?.includes("manage_job_openings")) {
      jobBoardItems.push({ label: "Create Posting", href: "/create-job-posting" });
    }
    if (jobBoardItems.length > 0) {
      items.push({
        label: "Job Board",
        icon: Briefcase,
        items: jobBoardItems,
      });
    }

    // Billing dropdown
    const billingItems: { label: string; href: string }[] = [];
    if (user?.permissions?.includes("view_billing")) {
      billingItems.push({ label: "Dashboard", href: "/billing-dashboard" });
      billingItems.push({ label: "Professional Invoices", href: "/billing-professional-invoices" });
      billingItems.push({ label: "Vendor Invoices", href: "/billing-vendor-invoices" });
    }
    if (user?.permissions?.includes("view_rates")) {
      billingItems.push({ label: "Rates", href: "/billing-rates" });
    }
    if (billingItems.length > 0) {
      items.push({
        label: "Billing",
        icon: CreditCard,
        items: billingItems,
      });
    }

    // Reports dropdown
    const reportsItems: { label: string; href: string }[] = [];
    if (user?.permissions?.includes("view_reports")) {
      reportsItems.push({ label: "Analytics Dashboard", href: "/analytics-dashboard" });
      reportsItems.push({ label: "Custom Reports", href: "/custom-reports" });
    }
    if (user?.permissions?.includes("view_attendance_reports")) {
      reportsItems.push({ label: "Attendance", href: "/reports/attendance" });
    }
    if (user?.permissions?.includes("view_overtime_reports")) {
      reportsItems.push({ label: "Overtime Report", href: "/reports/overtime" });
    }
    if (user?.permissions?.includes("view_float_pool_savings")) {
      reportsItems.push({ label: "Float Pool Savings", href: "/reports/float-pool-savings" });
    }
    if (user?.permissions?.includes("view_agency_usage")) {
      reportsItems.push({ label: "Agency Usage", href: "/reports/agency-usage" });
    }
    if (reportsItems.length > 0) {
      items.push({
        label: "Reports",
        icon: BarChart3,
        items: reportsItems,
      });
    }

    // Facility dropdown
    const facilityItems: { label: string; href: string }[] = [];
    if (user?.permissions?.includes("view_facility_profile")) {
      facilityItems.push({ label: "Facility Profile", href: "/facility-profile" });
    }
    if (user?.permissions?.includes("manage_facility_settings")) {
      facilityItems.push({ label: "Settings", href: "/facility-settings" });
    }
    if (user?.permissions?.includes("manage_facility_users")) {
      facilityItems.push({ label: "Users", href: "/facility-users" });
    }
    if (facilityItems.length > 0) {
      items.push({
        label: "Facility",
        icon: Building2,
        items: facilityItems,
      });
    }

    // Messages (always visible)
    items.push({ label: "Messages", href: "/messaging", icon: MessageSquare });

    return items;
  }

  if (isEmployee || isContractor) {
    return [
      { label: "Dashboard", href: "/", icon: Home },
      { label: "My Schedule", href: "/my-schedule", icon: Calendar },
      { label: "Time Clock", href: "/time-clock", icon: Clock },
      { label: "Messages", href: "/messaging", icon: MessageSquare },
      { label: "Job Board", href: "/job-board", icon: Briefcase },
      { label: "Credentials", href: "/credentials", icon: FileText },
      { label: "My Requests", href: "/my-requests", icon: ClipboardList },
    ];
  }

  return [];
};

export function UnifiedHeader() {
  const { user, impersonatedUser, quitImpersonation, originalUser, logoutMutation } = useAuth();
  const [location] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [desktopMenuOpen, setDesktopMenuOpen] = useState(false);

  const currentUser = impersonatedUser || user;
  const isImpersonating = !!impersonatedUser && !!originalUser;
  const navigationItems = getNavigationItems(currentUser);

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  const isActiveRoute = (href: string) => {
    if (href === "/") return location === "/";
    return location.startsWith(href);
  };

  return (
    <>
      {/* Impersonation Indicator */}
      {isImpersonating && <ImpersonationIndicator />}

      {/* Main Header */}
      <header className="sticky top-0 z-40 w-full border-b border-gray-200 dark:border-gray-800 bg-white/95 backdrop-blur-md supports-[backdrop-filter]:bg-white/90 dark:bg-gray-950/95 dark:supports-[backdrop-filter]:bg-gray-950/90 shadow-sm">
        <div className="container flex h-14 items-center px-4 sm:px-6 lg:px-8">
          {/* Logo and Brand */}
          <div className="flex items-center gap-3 mr-6 lg:mr-10">
            <Link href="/" className="flex items-center gap-2.5 hover:opacity-80 transition-opacity">
              <img src="/nexspace-logo.png" alt="NexSpace" className="h-7 w-auto" />
              <span className="hidden sm:block text-lg font-semibold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
                NexSpace
              </span>
            </Link>
          </div>

          {/* Desktop Navigation Button */}
          <div className="hidden lg:flex items-center">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setDesktopMenuOpen(!desktopMenuOpen)}
              className="gap-2 px-3 h-9 font-medium text-sm text-gray-700 hover:text-gray-900 hover:bg-gray-50"
            >
              <Menu className="h-4 w-4" />
              Menu
              <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", desktopMenuOpen && "rotate-180")} />
            </Button>
          </div>

          {/* Search - Hidden on small screens */}
          <div className="flex-1 max-w-md mx-4 hidden lg:block">
            <GlobalSearch />
          </div>

          {/* Mobile Navigation */}
          <div className="lg:hidden mr-2">
            <EnhancedMobileNavigation 
              navigationItems={navigationItems}
              currentUser={currentUser}
              isImpersonating={isImpersonating}
            />
          </div>

          {/* Right Side Actions */}
          <div className="flex items-center gap-1 sm:gap-2 lg:gap-3">
            {/* Help Button - Hidden on mobile */}
            <Button
              variant="ghost"
              size="icon"
              className="relative hidden sm:flex h-9 w-9"
              onClick={() => {
                // Dispatch custom event to trigger tour
                window.dispatchEvent(new CustomEvent("startProductTour"));
              }}
              title="Start product tour"
            >
              <HelpCircle className="h-4 w-4" />
            </Button>

            {/* Notifications */}
            <NotificationDropdown />

            {/* User Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="relative gap-2 px-2 sm:px-3 h-9">
                  <Avatar className="h-7 w-7">
                    <AvatarFallback className="bg-gradient-to-br from-blue-500 to-cyan-500 text-white text-xs">
                      {currentUser?.firstName?.[0]}
                      {currentUser?.lastName?.[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div className="hidden sm:block text-left">
                    <p className="text-sm font-medium leading-none">
                      {currentUser?.firstName} {currentUser?.lastName}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {currentUser?.role
                        ?.replace(/_/g, " ")
                        .replace(/\b\w/g, (l) => l.toUpperCase())}
                    </p>
                  </div>
                  <ChevronDown className="h-3.5 w-3.5 text-muted-foreground opacity-70" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/profile" className="cursor-pointer">
                    <User className="mr-2 h-4 w-4" />
                    Profile
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/settings" className="cursor-pointer">
                    <Settings className="mr-2 h-4 w-4" />
                    Settings
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-red-600 dark:text-red-400">
                  <LogOut className="mr-2 h-4 w-4" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Mobile Menu Toggle */}
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden h-9 w-9"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t">
            <nav className="container py-4 px-4 sm:px-6">
              <div className="space-y-1">
                {navigationItems.map((item) =>
                  item.items ? (
                    <div key={item.label} className="space-y-1">
                      <div className="px-3 py-2 text-sm font-medium text-gray-900 dark:text-gray-100">
                        <div className="flex items-center gap-2">
                          <item.icon className="h-4 w-4" />
                          {item.label}
                        </div>
                      </div>
                      <div className="pl-8 space-y-1">
                        {item.items.map((subItem) => (
                          <Link
                            key={subItem.href}
                            href={subItem.href}
                            onClick={() => setMobileMenuOpen(false)}
                            className={cn(
                              "block px-3 py-2 text-sm rounded-md transition-colors",
                              isActiveRoute(subItem.href)
                                ? "bg-gray-100 dark:bg-gray-800 text-blue-600 dark:text-blue-400"
                                : "text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800"
                            )}
                          >
                            {subItem.label}
                          </Link>
                        ))}
                      </div>
                    </div>
                  ) : item.href ? (
                    <Link
                      key={item.label}
                      href={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={cn(
                        "flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-colors",
                        isActiveRoute(item.href)
                          ? "bg-gray-100 dark:bg-gray-800 text-blue-600 dark:text-blue-400"
                          : "text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800"
                      )}
                    >
                      <item.icon className="h-4 w-4" />
                      {item.label}
                    </Link>
                  ) : null
                )}

                {/* Help Button in Mobile Menu */}
                <div className="mt-4 pt-4 border-t">
                  <Button
                    variant="ghost"
                    className="flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md w-full text-left"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      window.dispatchEvent(new CustomEvent("startProductTour"));
                    }}
                  >
                    <HelpCircle className="h-4 w-4" />
                    Start Product Tour
                  </Button>
                </div>
              </div>
            </nav>
          </div>
        )}
      </header>

      {/* Compact Navigation Dropdown */}
      {desktopMenuOpen && (
        <CompactNavigationDropdown
          navigationItems={navigationItems}
          onClose={() => setDesktopMenuOpen(false)}
        />
      )}
    </>
  );
}
