import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
  Bell,
  ChevronDown,
  ChevronRight,
} from "lucide-react";

interface AppLayoutProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
}

interface NavigationItem {
  path: string;
  icon: any;
  label: string;
  exact?: boolean;
  badge?: number;
}

interface NavigationGroup {
  key?: string;
  label?: string;
  icon?: any;
  items: NavigationItem[];
}

const buildings = [
  { id: "1", name: "Willowbrook SNF", address: "1234 Healthcare Drive" },
  { id: "2", name: "Maple Grove Memory Care", address: "5678 Memory Lane" },
  { id: "3", name: "Sunrise Assisted Living", address: "9012 Sunrise Blvd" },
];

export function AppLayout({ children, title, subtitle }: AppLayoutProps) {
  const { user } = useAuth();
  const [location] = useLocation();
  const [selectedBuilding, setSelectedBuilding] = useState("1");
  const [isImpersonating, setIsImpersonating] = useState(false);
  const [originalUser, setOriginalUser] = useState<any>(null);
  const [showImpersonationModal, setShowImpersonationModal] = useState(false);
  const [impersonationSearch, setImpersonationSearch] = useState("");
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch all users for impersonation
  const { data: allUsers = [] } = useQuery({
    queryKey: ["/api/users/all"],
    enabled: user?.role === "super_admin",
  });

  // Impersonation mutations
  const startImpersonationMutation = useMutation({
    mutationFn: async (targetUserId: number) => {
      const res = await apiRequest("POST", "/api/impersonate/start", { targetUserId });
      return await res.json();
    },
    onSuccess: (response) => {
      setOriginalUser(user);
      setIsImpersonating(true);
      queryClient.setQueryData(["/api/user"], response.impersonatedUser);
      setShowImpersonationModal(false);
      toast({
        title: "Impersonation Started",
        description: `Now viewing as ${response.impersonatedUser.firstName} ${response.impersonatedUser.lastName}`,
      });
    },
  });

  const stopImpersonationMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/impersonate/stop");
      return await res.json();
    },
    onSuccess: (response) => {
      queryClient.setQueryData(["/api/user"], response.originalUser);
      setIsImpersonating(false);
      setOriginalUser(null);
      toast({
        title: "Impersonation Ended",
        description: "Returned to your original account",
      });
    },
  });

  // Role switching mutation
  const switchRoleMutation = useMutation({
    mutationFn: async (newRole: string) => {
      const res = await apiRequest("POST", "/api/user/switch-role", { role: newRole });
      return await res.json();
    },
    onSuccess: (updatedUser) => {
      queryClient.setQueryData(["/api/user"], updatedUser);
      toast({
        title: "Role switched successfully",
        description: `Now viewing as ${updatedUser.role.replace("_", " ")}`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to switch role",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const [expandedGroups, setExpandedGroups] = useState<{ [key: string]: boolean }>({
    scheduling: true,
    workforce: true,
    hiring: true,
    insights: true,
    billing: true,
  });

  const navigationGroups: NavigationGroup[] = [
    {
      items: [{ path: "/", icon: Activity, label: "Dashboard", exact: true }],
    },
    {
      key: "scheduling",
      label: "Shift Templates",
      icon: Calendar,
      items: [
        { path: "/shift-templates", icon: Calendar, label: "Shift Templates" },
        { path: "/facility-schedule", icon: Calendar, label: "Facility Schedule" },
        { path: "/shifts-open", icon: ClipboardList, label: "Open Shifts" },
        { path: "/shift-requests", icon: Clock, label: "Shift Requests" },
        { path: "/time-clock", icon: Clock, label: "Time Clock" },
      ],
    },
    {
      key: "workforce",
      label: "Workforce",
      icon: Users,
      items: [
        { path: "/staff", icon: Users, label: "Staff" },
        { path: "/attendance", icon: UserCheck, label: "Attendance" },
        { path: "/time-clock", icon: Clock, label: "Time Clock" },
        { path: "/credentials", icon: UserCheck, label: "Credentials" },
      ],
    },
    {
      key: "hiring",
      label: "Hiring",
      icon: Building,
      items: [
        { path: "/job-board", icon: ClipboardList, label: "Job Board" },
        { path: "/enhanced-job-board", icon: ClipboardList, label: "Enhanced Job Board" },
        { path: "/enhanced-job-posting", icon: FileText, label: "Job Posting" },
        { path: "/referral", icon: Users, label: "Referrals" },
      ],
    },
    {
      key: "insights",
      label: "Insights",
      icon: BarChart3,
      items: [
        { path: "/analytics", icon: BarChart3, label: "Analytics" },
        { path: "/overtime-report", icon: FileText, label: "Overtime Reports" },
      ],
    },
    {
      key: "billing",
      label: "Billing",
      icon: DollarSign,
      items: [
        { path: "/payroll", icon: DollarSign, label: "Payroll" },
        { path: "/invoices", icon: FileText, label: "Invoices" },
      ],
    },
    {
      items: [
        { path: "/messaging", icon: MessageSquare, label: "Messages", badge: 3 },
        { path: "/settings", icon: Settings, label: "Settings" },
      ],
    },
  ];

  const toggleGroup = (groupKey: string) => {
    setExpandedGroups((prev) => ({
      ...prev,
      [groupKey]: !prev[groupKey],
    }));
  };

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
          <img src={nexspaceLogo} alt="NexSpace Logo" className="h-10 w-auto mr-3" />
          <div>
            <h1 className="text-xl font-bold text-gray-900">NexSpace</h1>
            <p className="text-sm text-gray-500">Healthcare Staffing</p>
          </div>
        </div>

        <nav className="flex-1 mt-6 px-3 overflow-y-auto">
          <div className="space-y-1">
            {navigationGroups.map((group, groupIndex) => (
              <div key={groupIndex}>
                {group.label ? (
                  // Group with collapsible header
                  <div>
                    <button
                      onClick={() => toggleGroup(group.key!)}
                      className="w-full flex items-center justify-between px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-md transition-colors"
                    >
                      <div className="flex items-center">
                        <group.icon className="w-5 h-5 mr-3" />
                        {group.label}
                      </div>
                      {expandedGroups[group.key!] ? (
                        <ChevronDown className="w-4 h-4" />
                      ) : (
                        <ChevronRight className="w-4 h-4" />
                      )}
                    </button>
                    {expandedGroups[group.key!] && (
                      <div className="ml-8 space-y-1 mt-1">
                        {group.items.map((item) => {
                          const Icon = item.icon;
                          const active = isActive(item.path, item.exact || false);

                          return (
                            <Link key={item.path} href={item.path}>
                              <button
                                className={`w-full flex items-center justify-between px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                                  active
                                    ? "bg-blue-50 text-blue-700 border-r-2 border-blue-700"
                                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                                }`}
                              >
                                <div className="flex items-center">
                                  <Icon className="w-4 h-4 mr-3" />
                                  {item.label}
                                </div>
                                {item.badge && (
                                  <span className="bg-red-500 text-white text-xs rounded-full px-2 py-1 min-w-[20px] h-5 flex items-center justify-center">
                                    {item.badge}
                                  </span>
                                )}
                              </button>
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ) : (
                  // Direct items without grouping
                  group.items.map((item) => {
                    const Icon = item.icon;
                    const active = isActive(item.path, item.exact || false);

                    return (
                      <Link key={item.path} href={item.path}>
                        <button
                          className={`w-full flex items-center justify-between px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                            active
                              ? "bg-blue-50 text-blue-700 border-r-2 border-blue-700"
                              : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                          }`}
                        >
                          <div className="flex items-center">
                            <Icon className="w-5 h-5 mr-3" />
                            {item.label}
                          </div>
                          {item.badge && (
                            <span className="bg-red-500 text-white text-xs rounded-full px-2 py-1 min-w-[20px] h-5 flex items-center justify-center">
                              {item.badge}
                            </span>
                          )}
                        </button>
                      </Link>
                    );
                  })
                )}
              </div>
            ))}
          </div>
        </nav>

        <div className="p-4 border-t border-gray-200 bg-white">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                <span className="text-sm font-medium text-white">
                  {user?.firstName?.[0]}
                  {user?.lastName?.[0]}
                </span>
              </div>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-700">
                {user?.firstName} {user?.lastName}
              </p>
              <p className="text-xs text-gray-500">{user?.role?.replace("_", " ")}</p>
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
                    <SelectItem key={building.id} value={building.id.toString()}>
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
              {/* Role Switcher for Super Admin */}
              {user?.role === "super_admin" && (
                <Select
                  value={user?.role}
                  onValueChange={(newRole) => {
                    switchRoleMutation.mutate(newRole);
                  }}
                  disabled={switchRoleMutation.isPending}
                >
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Switch Role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="super_admin">Super Admin</SelectItem>
                    <SelectItem value="facility_admin">Facility Admin</SelectItem>
                    <SelectItem value="nurse_manager">Nurse Manager</SelectItem>
                    <SelectItem value="rn">RN</SelectItem>
                    <SelectItem value="lpn">LPN</SelectItem>
                    <SelectItem value="cna">CNA</SelectItem>
                    <SelectItem value="contractor">Contractor</SelectItem>
                  </SelectContent>
                </Select>
              )}

              <Button variant="outline" size="sm">
                <Bell className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Page Content */}
        <div className="flex-1 overflow-auto">{children}</div>
      </div>
    </div>
  );
}
