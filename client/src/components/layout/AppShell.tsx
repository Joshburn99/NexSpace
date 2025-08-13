import { ReactNode, useState } from 'react';
import { Link, useLocation } from 'wouter';
import { cn } from '@/lib/utils';
import { 
  Home, 
  Building2, 
  Users, 
  Calendar, 
  Settings, 
  Menu, 
  X,
  Moon,
  Sun,
  Monitor,
  Search,
  Bell,
  ChevronRight
} from 'lucide-react';
import { useTheme } from '@/providers/ThemeProvider';
import { useAuth } from '@/components/ProtectedRoute';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

interface AppShellProps {
  children: ReactNode;
}

const navigation = [
  { name: 'Dashboard', href: '/', icon: Home },
  { name: 'Facilities', href: '/facilities', icon: Building2 },
  { name: 'Staff', href: '/staff', icon: Users },
  { name: 'Shifts', href: '/shifts', icon: Calendar },
  { name: 'Settings', href: '/settings', icon: Settings },
];

export function AppShell({ children }: AppShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [location] = useLocation();
  const { theme, setTheme } = useTheme();
  const { user, loading } = useAuth();

  const currentPage = navigation.find(item => item.href === location)?.name || 'Dashboard';
  const breadcrumbs = [
    { name: 'Home', href: '/' },
    ...(currentPage !== 'Dashboard' ? [{ name: currentPage, href: location }] : []),
  ];

  return (
    <div className="flex h-screen bg-background">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-64 bg-card border-r border-border transform transition-transform duration-200 ease-in-out lg:translate-x-0 lg:static lg:inset-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex h-full flex-col">
          {/* Logo */}
          <div className="flex h-16 items-center justify-between px-6 border-b border-border">
            <h1 className="text-xl font-bold text-primary">NexSpace</h1>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden text-muted-foreground hover:text-foreground"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-1 px-3 py-4">
            {navigation.map((item) => {
              const isActive = location === item.href;
              const Icon = item.icon;
              return (
                <Link key={item.name} href={item.href}>
                  <a
                    className={cn(
                      'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                    )}
                  >
                    <Icon className="h-5 w-5" />
                    {item.name}
                  </a>
                </Link>
              );
            })}
          </nav>

          {/* Theme switcher */}
          <div className="border-t border-border p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Theme</span>
              <div className="flex gap-1">
                <button
                  onClick={() => setTheme('light')}
                  className={cn(
                    'p-2 rounded hover:bg-accent',
                    theme === 'light' && 'bg-accent'
                  )}
                  aria-label="Light theme"
                >
                  <Sun className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setTheme('dark')}
                  className={cn(
                    'p-2 rounded hover:bg-accent',
                    theme === 'dark' && 'bg-accent'
                  )}
                  aria-label="Dark theme"
                >
                  <Moon className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setTheme('system')}
                  className={cn(
                    'p-2 rounded hover:bg-accent',
                    theme === 'system' && 'bg-accent'
                  )}
                  aria-label="System theme"
                >
                  <Monitor className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="h-16 bg-card border-b border-border flex items-center justify-between px-4 lg:px-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden text-muted-foreground hover:text-foreground"
            >
              <Menu className="h-5 w-5" />
            </button>
            
            {/* Search placeholder */}
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-muted rounded-md text-muted-foreground">
              <Search className="h-4 w-4" />
              <span className="text-sm">Search...</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Notifications */}
            <button className="relative p-2 text-muted-foreground hover:text-foreground">
              <Bell className="h-5 w-5" />
              <span className="absolute top-1 right-1 h-2 w-2 bg-danger rounded-full" />
            </button>

            {/* User profile */}
            {loading ? (
              <div className="flex items-center gap-3">
                <Skeleton className="h-8 w-8 rounded-full" />
                <div className="hidden sm:block">
                  <Skeleton className="h-4 w-24 mb-1" />
                  <Skeleton className="h-3 w-16" />
                </div>
              </div>
            ) : user ? (
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-sm font-semibold text-primary">
                    {user.username?.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="hidden sm:block">
                  <div className="text-sm font-medium">{user.username}</div>
                  <Badge className="text-xs">{user.role}</Badge>
                </div>
              </div>
            ) : (
              <Link href="/login">
                <Button size="sm">Login</Button>
              </Link>
            )}
          </div>
        </header>

        {/* Breadcrumb */}
        <div className="px-4 lg:px-6 py-3 bg-muted/50 border-b border-border">
          <nav className="flex items-center gap-2 text-sm">
            {breadcrumbs.map((crumb, index) => (
              <div key={crumb.href} className="flex items-center gap-2">
                {index > 0 && <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                {index === breadcrumbs.length - 1 ? (
                  <span className="font-medium text-foreground">{crumb.name}</span>
                ) : (
                  <Link href={crumb.href}>
                    <a className="text-muted-foreground hover:text-foreground">
                      {crumb.name}
                    </a>
                  </Link>
                )}
              </div>
            ))}
          </nav>
        </div>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}