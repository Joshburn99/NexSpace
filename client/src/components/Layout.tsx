import { useState } from "react";
import Sidebar from "./Sidebar";
import { ImpersonationIndicator } from "./ImpersonationIndicator";
import { TopBar } from "./TopBar";
import { useAuth } from "@/hooks/use-auth";

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [sidebarExpanded, setSidebarExpanded] = useState(true);
  const { user, impersonatedUser } = useAuth();
  const currentUser = impersonatedUser || user;
  
  // Show TopBar for employees and contractors
  const showTopBar = currentUser?.role === 'employee' || currentUser?.role === 'contractor';

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {showTopBar ? (
        <>
          <TopBar />
          <div className="flex flex-1">
            <main className="flex-1 overflow-auto">{children}</main>
          </div>
        </>
      ) : (
        <>
          <ImpersonationIndicator />
          <div className="flex flex-1">
            <Sidebar expanded={sidebarExpanded} onToggle={() => setSidebarExpanded(!sidebarExpanded)} />
            <main className="flex-1 overflow-auto">{children}</main>
          </div>
        </>
      )}
    </div>
  );
};

export default Layout;
