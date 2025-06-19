import { useState } from "react";
import Sidebar from "./Sidebar";
import { ImpersonationIndicator } from "./ImpersonationIndicator";

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [sidebarExpanded, setSidebarExpanded] = useState(true);

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <ImpersonationIndicator />
      <div className="flex flex-1">
        <Sidebar expanded={sidebarExpanded} onToggle={() => setSidebarExpanded(!sidebarExpanded)} />
        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  );
};

export default Layout;
