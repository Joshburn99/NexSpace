import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import nexspaceLogo from "@assets/ChatGPT Image Jun 17, 2025, 01_56_58 PM_1750200821645.png";
import { 
  Activity, 
  Calendar, 
  Users, 
  BarChart3, 
  MessageSquare, 
  Settings, 
  ClipboardList, 
  Clock,
  Building,
  DollarSign,
  FileText,
  UserCheck,
  Bell
} from "lucide-react";
import { Link, useLocation } from "wouter";

interface AppLayoutProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
}

const buildings = [
  { id: "1", name: "Willowbrook SNF", address: "1234 Healthcare Drive" },
  { id: "2", name: "Maple Grove Memory Care", address: "5678 Memory Lane" },
  { id: "3", name: "Sunrise Assisted Living", address: "9012 Sunrise Blvd" }
];

export function AppLayout({ children, title, subtitle }: AppLayoutProps) {
  const { user } = useAuth();
  const [location] = useLocation();
  const [selectedBuilding, setSelectedBuilding] = useState("1");

  const navigationItems = [
    { path: "/", icon: Activity, label: "Dashboard", exact: true },
    { path: "/scheduling", icon: Calendar, label: "Scheduling" },
    { path: "/staff", icon: Users, label: "Staff" },
    { path: "/job-board", icon: ClipboardList, label: "Job Board" },
    { path: "/analytics", icon: BarChart3, label: "Analytics" },
    { path: "/messaging", icon: MessageSquare, label: "Messages" },
    { path: "/payroll", icon: DollarSign, label: "Payroll" },
    { path: "/time-clock", icon: Clock, label: "Time Clock" },
    { path: "/invoices", icon: FileText, label: "Invoices" },
    { path: "/credentials", icon: UserCheck, label: "Credentials" },
    { path: "/settings", icon: Settings, label: "Settings" }
  ];

  const isActive = (path: string, exact = false) => {
    if (exact) {
      return location === path;
    }
    return location.startsWith(path);
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Left Navigation Sidebar */}
      <div className="w-64 bg-white border-r border-gray-200 flex flex-col">
        <div className="flex items-center p-6 border-b border-gray-200">
          <img 
            src={nexspaceLogo} 
            alt="NexSpace Logo" 
            className="h-10 w-auto mr-3"
          />
          <div>
            <h1 className="text-xl font-bold text-gray-900">NexSpace</h1>
            <p className="text-sm text-gray-500">Healthcare Staffing</p>
          </div>
        </div>
        
        <nav className="flex-1 mt-6 px-3 overflow-y-auto">
          <div className="space-y-1">
            {navigationItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.path, item.exact);
              
              return (
                <Link key={item.path} href={item.path}>
                  <button
                    className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                      active
                        ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-700'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                    }`}
                  >
                    <Icon className="w-5 h-5 mr-3" />
                    {item.label}
                  </button>
                </Link>
              );
            })}
          </div>
        </nav>
        
        <div className="p-4 border-t border-gray-200 bg-white">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                <span className="text-sm font-medium text-white">
                  {user?.firstName?.[0]}{user?.lastName?.[0]}
                </span>
              </div>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-700">{user?.firstName} {user?.lastName}</p>
              <p className="text-xs text-gray-500">{user?.role?.replace('_', ' ')}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div>
                <h1 className="text-xl font-bold text-gray-900">{title || "Dashboard"}</h1>
                {subtitle && <p className="text-gray-600">{subtitle}</p>}
              </div>
              
              {/* Building Filter */}
              <Select value={selectedBuilding} onValueChange={setSelectedBuilding}>
                <SelectTrigger className="w-48">
                  <Building className="w-4 h-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {buildings.map((building) => (
                    <SelectItem key={building.id} value={building.id}>
                      <div className="flex flex-col">
                        <span>{building.name}</span>
                        <span className="text-xs text-gray-500">{building.address}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-center space-x-3">
              <Button variant="outline" size="sm">
                <Bell className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
        
        {/* Page Content */}
        <div className="flex-1 overflow-auto">
          {children}
        </div>
      </div>
    </div>
  );
}