import React, { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { 
  Calendar, 
  Users, 
  BarChart3, 
  Settings, 
  Building2,
  Menu,
  X,
  ChevronRight,
  Bell,
  Search
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';

interface NavItem {
  icon: React.ElementType;
  label: string;
  href: string;
  badge?: string;
}

const navItems: NavItem[] = [
  { icon: Building2, label: 'Overview', href: '/facilities' },
  { icon: Calendar, label: 'Shifts', href: '/facilities/shifts', badge: '12' },
  { icon: Users, label: 'Staff', href: '/facilities/staff' },
  { icon: BarChart3, label: 'Analytics', href: '/facilities/analytics' },
  { icon: Settings, label: 'Settings', href: '/facilities/settings' },
];

export function FacilityDashboardLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Check if user has facility access
  const hasFacilityAccess = user?.role === 'super_admin' || 
    user?.role === 'facility_manager' || 
    user?.role === 'admin';

  if (!hasFacilityAccess) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-semibold mb-2">Access Denied</h2>
          <p className="text-muted-foreground">You don't have permission to access facility management.</p>
        </div>
      </div>
    );
  }

  const currentFacility = user?.associatedFacilities?.[0] || { 
    id: 1, 
    name: 'General Hospital' 
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className={cn(
        "bg-white border-r transition-all duration-300 flex flex-col",
        sidebarOpen ? "w-64" : "w-16"
      )}>
        {/* Facility Header */}
        <div className="p-4 border-b">
          <div className="flex items-center justify-between">
            <div className={cn("flex items-center", !sidebarOpen && "justify-center")}>
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Building2 className="w-6 h-6 text-blue-600" />
              </div>
              {sidebarOpen && (
                <div className="ml-3">
                  <h3 className="font-semibold text-sm">{currentFacility.name}</h3>
                  <p className="text-xs text-muted-foreground">Facility #{currentFacility.id}</p>
                </div>
              )}
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="ml-auto"
            >
              {sidebarOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        {/* Quick Stats (collapsible) */}
        {sidebarOpen && (
          <div className="p-4 space-y-3">
            <div className="bg-blue-50 rounded-lg p-3">
              <p className="text-xs text-blue-600 font-medium">Open Shifts</p>
              <p className="text-2xl font-bold text-blue-900">24</p>
            </div>
            <div className="bg-green-50 rounded-lg p-3">
              <p className="text-xs text-green-600 font-medium">Active Staff</p>
              <p className="text-2xl font-bold text-green-900">186</p>
            </div>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 p-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.startsWith(item.href);
            
            return (
              <Link key={item.href} href={item.href}>
                <a className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-lg transition-colors mb-1",
                  isActive 
                    ? "bg-blue-50 text-blue-700" 
                    : "hover:bg-gray-100 text-gray-700",
                  !sidebarOpen && "justify-center"
                )}>
                  <Icon className="w-5 h-5" />
                  {sidebarOpen && (
                    <>
                      <span className="flex-1 text-sm font-medium">{item.label}</span>
                      {item.badge && (
                        <Badge variant="secondary" className="ml-auto">
                          {item.badge}
                        </Badge>
                      )}
                    </>
                  )}
                </a>
              </Link>
            );
          })}
        </nav>

        {/* User Menu */}
        <div className="p-4 border-t">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                className={cn(
                  "w-full justify-start",
                  !sidebarOpen && "justify-center px-2"
                )}
              >
                <Avatar className="h-8 w-8">
                  <AvatarImage src={user?.avatar} />
                  <AvatarFallback>{user?.name?.[0] || user?.email?.[0]}</AvatarFallback>
                </Avatar>
                {sidebarOpen && (
                  <div className="ml-3 text-left">
                    <p className="text-sm font-medium">{user?.name || user?.email}</p>
                    <p className="text-xs text-muted-foreground">{user?.role}</p>
                  </div>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>My Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>Profile</DropdownMenuItem>
              <DropdownMenuItem>Settings</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={logout}>
                Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Top Bar */}
        <header className="bg-white border-b px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4 flex-1">
              {/* Breadcrumb */}
              <nav className="flex items-center text-sm">
                <Link href="/facilities">
                  <a className="text-muted-foreground hover:text-foreground">Facilities</a>
                </Link>
                <ChevronRight className="w-4 h-4 mx-2 text-muted-foreground" />
                <span className="font-medium">Overview</span>
              </nav>

              {/* Search */}
              <div className="relative max-w-md ml-auto">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search shifts, staff, or facilities..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3 ml-6">
              <Button variant="ghost" size="icon">
                <Bell className="w-5 h-5" />
              </Button>
              <Button variant="default">
                Create Shift
              </Button>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto bg-gray-50">
          {children}
        </main>
      </div>
    </div>
  );
}