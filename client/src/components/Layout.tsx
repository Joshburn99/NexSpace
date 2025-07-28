import { useState, useEffect } from "react";
import Sidebar from "./Sidebar";
import { ImpersonationIndicator } from "./ImpersonationIndicator";
import { TopBar } from "./TopBar";
import { TopLine } from "./TopLine";
import { RoleBasedSidebar } from "./RoleBasedSidebar";
import { FacilityUserSidebar } from "./FacilityUserSidebar";
import { GlobalSearch } from "./GlobalSearch";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [sidebarExpanded, setSidebarExpanded] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user, impersonatedUser } = useAuth();
  const currentUser = impersonatedUser || user;
  
  // Close mobile menu on route change or window resize
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setMobileMenuOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Close mobile menu when clicking outside
  useEffect(() => {
    if (mobileMenuOpen) {
      const handleClick = (e: MouseEvent) => {
        const target = e.target as HTMLElement;
        if (!target.closest('.mobile-sidebar') && !target.closest('.mobile-menu-btn')) {
          setMobileMenuOpen(false);
        }
      };
      
      document.addEventListener('click', handleClick);
      return () => document.removeEventListener('click', handleClick);
    }
  }, [mobileMenuOpen]);
  
  // Show TopLine for employees and contractors, role-based sidebar for all roles
  const showTopLine = currentUser?.role === 'employee' || currentUser?.role === 'contractor';
  const showAdminLayout = currentUser?.role === 'admin' || currentUser?.role === 'super_admin';
  const isFacilityUser = currentUser?.role && [
    'facility_admin', 'facility_administrator', 'scheduling_coordinator', 'hr_manager', 'corporate', 
    'regional_director', 'billing', 'supervisor', 'director_of_nursing'
  ].includes(currentUser.role);

  const renderSidebar = () => {
    if (showAdminLayout) {
      return <Sidebar expanded={sidebarExpanded} onToggle={() => setSidebarExpanded(!sidebarExpanded)} />;
    } else if (isFacilityUser) {
      return <FacilityUserSidebar expanded={sidebarExpanded} onToggle={() => setSidebarExpanded(!sidebarExpanded)} />;
    } else {
      return <RoleBasedSidebar />;
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Always show impersonation indicator when impersonating */}
      {impersonatedUser && <ImpersonationIndicator />}
      
      {/* Mobile Header */}
      <div className="md:hidden flex items-center justify-between bg-white dark:bg-gray-900 px-4 py-3 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="mobile-menu-btn"
        >
          {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
        
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 bg-blue-600 rounded flex items-center justify-center">
            <span className="text-white font-bold text-sm">N</span>
          </div>
          <span className="font-semibold">NexSpace</span>
        </div>
        
        <GlobalSearch />
      </div>
      
      {showTopLine ? (
        <>
          <div className="hidden md:block">
            <TopBar />
            <TopLine />
          </div>
          <div className="flex flex-1 relative">
            {/* Desktop Sidebar */}
            <div className="hidden md:block">
              <RoleBasedSidebar />
            </div>
            
            {/* Mobile Sidebar Overlay */}
            {mobileMenuOpen && (
              <div className="md:hidden fixed inset-0 z-50 bg-black bg-opacity-50">
                <div className="mobile-sidebar absolute left-0 top-0 h-full w-64 bg-white dark:bg-gray-900 shadow-xl">
                  <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex items-center justify-between">
                      <h2 className="text-lg font-semibold">Menu</h2>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        <X className="h-5 w-5" />
                      </Button>
                    </div>
                  </div>
                  <div className="overflow-y-auto h-full pb-20">
                    <RoleBasedSidebar />
                  </div>
                </div>
              </div>
            )}
            
            <main className="flex-1 overflow-auto">
              <div className="px-4 md:px-6 py-4 md:py-6">
                {children}
              </div>
            </main>
          </div>
        </>
      ) : (
        <>
          {/* Desktop Header for Admin/Facility Users */}
          <div className="hidden md:flex items-center justify-between bg-white dark:bg-gray-900 px-6 py-4 shadow-sm border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-4">
              <img src="/nexspace-logo.png" alt="NexSpace" className="h-8" />
            </div>
            
            <div className="flex-1 max-w-2xl mx-8">
              <GlobalSearch />
            </div>
            
            <div className="flex items-center gap-4">
              {impersonatedUser && (
                <div className="flex items-center gap-2 px-3 py-1 bg-yellow-100 dark:bg-yellow-900 rounded-lg">
                  <span className="text-sm text-yellow-700 dark:text-yellow-300">
                    Viewing as {currentUser?.firstName} {currentUser?.lastName}
                  </span>
                </div>
              )}
              <div className="text-sm text-gray-600 dark:text-gray-400">
                {currentUser?.firstName} {currentUser?.lastName}
              </div>
            </div>
          </div>
          
          <div className="flex flex-1 relative">
            {/* Desktop Sidebar */}
            <div className="hidden md:block">
              {renderSidebar()}
            </div>
            
            {/* Mobile Sidebar Overlay */}
          {mobileMenuOpen && (
            <div className="md:hidden fixed inset-0 z-50 bg-black bg-opacity-50">
              <div className="mobile-sidebar absolute left-0 top-0 h-full w-64 bg-white dark:bg-gray-900 shadow-xl">
                <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold">Menu</h2>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <X className="h-5 w-5" />
                    </Button>
                  </div>
                </div>
                <div className="overflow-y-auto h-full pb-20">
                  {renderSidebar()}
                </div>
              </div>
            </div>
          )}
          
          <main className="flex-1 overflow-auto">
            <div className="px-4 md:px-6 py-4 md:py-6">
              {children}
            </div>
          </main>
        </div>
        </>
      )}
    </div>
  );
};

export default Layout;
