import React, { useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useLocation, Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from '@/components/ui/navigation-menu';
import { cn } from '@/lib/utils';
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
  Home
} from 'lucide-react';
import { GlobalSearch } from './GlobalSearch';
import { NotificationDropdown } from './NotificationDropdown';
import { ImpersonationIndicator } from './ImpersonationIndicator';

// Type for navigation items
type NavigationItem = {
  label: string;
  href?: string;
  icon: any;
  items?: { label: string; href: string }[];
};

// Navigation items based on user role and permissions
const getNavigationItems = (user: any): NavigationItem[] => {
  const isSuperAdmin = user?.role === 'super_admin';
  const isAdmin = user?.role === 'admin' || isSuperAdmin;
  const isFacilityUser = user?.role && [
    'facility_admin', 'facility_administrator', 'scheduling_coordinator', 
    'hr_manager', 'corporate', 'regional_director', 'billing', 
    'supervisor', 'director_of_nursing'
  ].includes(user.role);
  const isEmployee = user?.role === 'employee';
  const isContractor = user?.role === 'contractor';

  if (isAdmin) {
    return [
      { label: 'Dashboard', href: '/', icon: Home },
      { label: 'Calendar', href: '/calendar', icon: Calendar },
      { 
        label: 'Facilities', 
        icon: Building2,
        items: [
          { label: 'All Facilities', href: '/facility-management' },
          { label: 'Facility Profiles', href: '/enhanced-facilities' },
          { label: 'Teams', href: '/teams' },
        ]
      },
      {
        label: 'Workforce',
        icon: Users,
        items: [
          { label: 'Staff Directory', href: '/enhanced-staff' },
          { label: 'Staff Management', href: '/superuser-staff-management' },
          { label: 'Shift Requests', href: '/shift-requests' },
          { label: 'Time Off', href: '/time-off-management' },
        ]
      },
      {
        label: 'Scheduling',
        icon: Calendar,
        items: [
          { label: 'Shift Templates', href: '/shift-templates' },
          { label: 'Job Board', href: '/job-board' },
        ]
      },
      {
        label: 'Analytics',
        icon: BarChart3,
        items: [
          { label: 'Dashboard', href: '/analytics' },
          { label: 'Reports', href: '/reports' },
          { label: 'Insights', href: '/analytics/insights' },
        ]
      },
      { label: 'Messages', href: '/messaging', icon: MessageSquare },
      {
        label: 'Admin',
        icon: Shield,
        items: [
          { label: 'User Management', href: '/admin/users' },
          { label: 'Audit Logs', href: '/admin/audit-logs' },
          { label: 'Database Console', href: '/admin/database' },
        ]
      },
    ];
  }

  if (isFacilityUser) {
    const items: NavigationItem[] = [
      { label: 'Dashboard', href: '/', icon: Home },
    ];

    // Add items based on permissions
    if (user?.permissions?.includes('view_schedules')) {
      items.push({ label: 'Calendar', href: '/calendar', icon: Calendar });
    }

    const workforceItems: { label: string; href: string }[] = [];
    if (user?.permissions?.includes('view_staff')) {
      workforceItems.push({ label: 'Staff Directory', href: '/enhanced-staff' });
    }
    if (user?.permissions?.includes('view_shift_requests')) {
      workforceItems.push({ label: 'Shift Requests', href: '/shift-requests' });
    }
    if (user?.permissions?.includes('view_timeoff_requests')) {
      workforceItems.push({ label: 'Time Off', href: '/time-off-management' });
    }
    if (workforceItems.length > 0) {
      items.push({
        label: 'Workforce',
        icon: Users,
        items: workforceItems
      });
    }

    const billingItems: { label: string; href: string }[] = [];
    if (user?.permissions?.includes('view_billing')) {
      billingItems.push({ label: 'Billing Dashboard', href: '/billing' });
      billingItems.push({ label: 'Invoices', href: '/billing/professional' });
    }
    if (user?.permissions?.includes('view_rates')) {
      billingItems.push({ label: 'Rates', href: '/billing/rates' });
    }
    if (billingItems.length > 0) {
      items.push({
        label: 'Billing',
        icon: CreditCard,
        items: billingItems
      });
    }

    const facilityItems: { label: string; href: string }[] = [];
    if (user?.permissions?.includes('view_facility_profile')) {
      facilityItems.push({ label: 'Facility Profile', href: '/facility-profile' });
    }
    if (user?.permissions?.includes('manage_facility_settings')) {
      facilityItems.push({ label: 'Settings', href: '/facility-settings' });
    }
    if (user?.permissions?.includes('manage_facility_users')) {
      facilityItems.push({ label: 'Users', href: '/facility-users' });
    }
    if (facilityItems.length > 0) {
      items.push({
        label: 'Facility',
        icon: Building2,
        items: facilityItems
      });
    }

    items.push({ label: 'Messages', href: '/messaging', icon: MessageSquare });

    return items;
  }

  if (isEmployee || isContractor) {
    return [
      { label: 'Dashboard', href: '/', icon: Home },
      { label: 'My Schedule', href: '/my-schedule', icon: Calendar },
      { label: 'Time Clock', href: '/time-clock', icon: Clock },
      { label: 'Messages', href: '/messaging', icon: MessageSquare },
      { label: 'Job Board', href: '/job-board', icon: Briefcase },
      { label: 'Credentials', href: '/credentials', icon: FileText },
      { label: 'My Requests', href: '/my-requests', icon: ClipboardList },
    ];
  }

  return [];
};

export function UnifiedHeader() {
  const { user, impersonatedUser, quitImpersonation, originalUser, logoutMutation } = useAuth();
  const [location] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  const currentUser = impersonatedUser || user;
  const isImpersonating = !!impersonatedUser && !!originalUser;
  const navigationItems = getNavigationItems(currentUser);

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  const isActiveRoute = (href: string) => {
    if (href === '/') return location === '/';
    return location.startsWith(href);
  };

  return (
    <>
      {/* Impersonation Indicator */}
      {isImpersonating && <ImpersonationIndicator />}

      {/* Main Header */}
      <header className="sticky top-0 z-40 w-full border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80 dark:bg-gray-950/95 dark:supports-[backdrop-filter]:bg-gray-950/80">
        <div className="container flex h-16 items-center px-4 sm:px-6 lg:px-8">
          {/* Logo and Brand */}
          <div className="flex items-center gap-2 mr-4 lg:mr-8">
            <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
              <img 
                src="/nexspace-logo.png" 
                alt="NexSpace" 
                className="h-8 w-auto"
              />
              <span className="hidden sm:block text-xl font-semibold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
                NexSpace
              </span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex flex-1 items-center gap-1">
            {navigationItems.map((item) => (
              item.items ? (
                <DropdownMenu key={item.label}>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      className={cn(
                        "gap-2 px-3 font-medium",
                        item.items.some(subItem => isActiveRoute(subItem.href))
                          ? "bg-gray-100 dark:bg-gray-800 text-blue-600 dark:text-blue-400"
                          : "text-gray-700 hover:text-gray-900 dark:text-gray-300 dark:hover:text-gray-100"
                      )}
                    >
                      <item.icon className="h-4 w-4" />
                      {item.label}
                      <ChevronDown className="h-3 w-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-48">
                    {item.items.map((subItem) => (
                      <DropdownMenuItem key={subItem.href} asChild>
                        <Link
                          href={subItem.href}
                          className={cn(
                            "w-full cursor-pointer",
                            isActiveRoute(subItem.href) && "bg-gray-100 dark:bg-gray-800"
                          )}
                        >
                          {subItem.label}
                        </Link>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : item.href ? (
                <Link key={item.label} href={item.href}>
                  <Button
                    variant="ghost"
                    className={cn(
                      "gap-2 px-3 font-medium",
                      isActiveRoute(item.href)
                        ? "bg-gray-100 dark:bg-gray-800 text-blue-600 dark:text-blue-400"
                        : "text-gray-700 hover:text-gray-900 dark:text-gray-300 dark:hover:text-gray-100"
                    )}
                  >
                    <item.icon className="h-4 w-4" />
                    {item.label}
                  </Button>
                </Link>
              ) : null
            ))}
          </nav>

          {/* Search */}
          <div className="flex-1 max-w-md mx-4 hidden md:block">
            <GlobalSearch />
          </div>

          {/* Right Side Actions */}
          <div className="flex items-center gap-2 sm:gap-4">
            {/* Notifications */}
            <NotificationDropdown />

            {/* User Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative gap-2 px-2 sm:px-3">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-gradient-to-br from-blue-500 to-cyan-500 text-white">
                      {currentUser?.firstName?.[0]}{currentUser?.lastName?.[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div className="hidden sm:block text-left">
                    <p className="text-sm font-medium leading-none">
                      {currentUser?.firstName} {currentUser?.lastName}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {currentUser?.role?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </p>
                  </div>
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
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
              className="lg:hidden"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t">
            <nav className="container py-4 px-4 sm:px-6">
              <div className="space-y-1">
                {navigationItems.map((item) => (
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
                ))}
              </div>
            </nav>
          </div>
        )}
      </header>
    </>
  );
}