import { useState } from "react";
import Sidebar from "./Sidebar";
import { ImpersonationIndicator } from "./ImpersonationIndicator";
import { TopBar } from "./TopBar";
import { TopLine } from "./TopLine";
import { RoleBasedSidebar } from "./RoleBasedSidebar";
import { FacilityUserSidebar } from "./FacilityUserSidebar";
import { useAuth } from "@/hooks/use-auth";

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [sidebarExpanded, setSidebarExpanded] = useState(true);
  const { user, impersonatedUser } = useAuth();
  const currentUser = impersonatedUser || user;
  
  // Show TopLine for employees and contractors, role-based sidebar for all roles
  const showTopLine = currentUser?.role === 'employee' || currentUser?.role === 'contractor';
  const showAdminLayout = currentUser?.role === 'admin' || currentUser?.role === 'super_admin';
  const isFacilityUser = currentUser?.role && [
    'facility_admin', 'facility_administrator', 'scheduling_coordinator', 'hr_manager', 'corporate', 
    'regional_director', 'billing', 'supervisor', 'director_of_nursing'
  ].includes(currentUser.role);

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Always show impersonation indicator when impersonating */}
      {impersonatedUser && <ImpersonationIndicator />}
      
      {showTopLine ? (
        <>
          <TopBar />
          <TopLine />
          <div className="flex flex-1">
            <RoleBasedSidebar />
            <main className="flex-1 overflow-auto">{children}</main>
          </div>
        </>
      ) : showAdminLayout ? (
        <>
          <div className="flex flex-1">
            <Sidebar expanded={sidebarExpanded} onToggle={() => setSidebarExpanded(!sidebarExpanded)} />
            <main className="flex-1 overflow-auto">{children}</main>
          </div>
        </>
      ) : isFacilityUser ? (
        <>
          <TopBar />
          <div className="flex flex-1">
            <FacilityUserSidebar />
            <main className="flex-1 overflow-auto">{children}</main>
          </div>
        </>
      ) : (
        <>
          <div className="flex flex-1">
            <RoleBasedSidebar />
            <main className="flex-1 overflow-auto">{children}</main>
          </div>
        </>
      )}
    </div>
  );
};

export default Layout;
