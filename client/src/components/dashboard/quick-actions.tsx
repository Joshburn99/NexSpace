import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Plus, 
  CalendarPlus, 
  FileUp, 
  BarChart3, 
  Users, 
  Stethoscope,
  ClipboardCheck,
  MessageSquare
} from "lucide-react";
import { UserRole } from "@shared/schema";
import { Link } from "wouter";

interface QuickAction {
  label: string;
  icon: React.ReactNode;
  color: string;
  href?: string;
  onClick?: () => void;
  roles?: UserRole[];
}

export function QuickActions() {
  const { user } = useAuth();

  if (!user) return null;

  const actions: QuickAction[] = [
    {
      label: "Add Staff",
      icon: <Plus className="h-5 w-5" />,
      color: "bg-blue-50 hover:bg-blue-100 text-blue-600",
      href: "/staff/new",
      roles: [UserRole.FACILITY_MANAGER, UserRole.CLIENT_ADMINISTRATOR, UserRole.SUPER_ADMIN]
    },
    {
      label: "Create Shift",
      icon: <CalendarPlus className="h-5 w-5" />,
      color: "bg-green-50 hover:bg-green-100 text-green-600",
      href: "/shifts/new",
      roles: [UserRole.FACILITY_MANAGER, UserRole.CLIENT_ADMINISTRATOR, UserRole.SUPER_ADMIN]
    },
    {
      label: "Upload Docs",
      icon: <FileUp className="h-5 w-5" />,
      color: "bg-purple-50 hover:bg-purple-100 text-purple-600",
      href: "/credentials/upload"
    },
    {
      label: "View Reports",
      icon: <BarChart3 className="h-5 w-5" />,
      color: "bg-amber-50 hover:bg-amber-100 text-amber-600",
      href: "/analytics",
      roles: [UserRole.FACILITY_MANAGER, UserRole.CLIENT_ADMINISTRATOR, UserRole.SUPER_ADMIN]
    },
    {
      label: "Time Clock",
      icon: <ClipboardCheck className="h-5 w-5" />,
      color: "bg-indigo-50 hover:bg-indigo-100 text-indigo-600",
      href: "/time-clock",
      roles: [UserRole.INTERNAL_EMPLOYEE, UserRole.CONTRACTOR_1099]
    },
    {
      label: "Messages",
      icon: <MessageSquare className="h-5 w-5" />,
      color: "bg-pink-50 hover:bg-pink-100 text-pink-600",
      href: "/messages"
    },
    {
      label: "Job Board",
      icon: <Stethoscope className="h-5 w-5" />,
      color: "bg-cyan-50 hover:bg-cyan-100 text-cyan-600",
      href: "/jobs"
    },
    {
      label: "Staff List",
      icon: <Users className="h-5 w-5" />,
      color: "bg-rose-50 hover:bg-rose-100 text-rose-600",
      href: "/staff",
      roles: [UserRole.FACILITY_MANAGER, UserRole.CLIENT_ADMINISTRATOR, UserRole.SUPER_ADMIN]
    }
  ];

  // Filter actions based on user role
  const availableActions = actions.filter(action => {
    if (!action.roles) return true; // No role restriction
    return action.roles.includes(user.role as UserRole) || user.role === UserRole.SUPER_ADMIN;
  });

  // Take first 4 actions for the grid
  const displayActions = availableActions.slice(0, 4);

  const handleActionClick = (action: QuickAction) => {
    if (action.onClick) {
      action.onClick();
    }
    // Navigation will be handled by the Link component
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-gray-900">Quick Actions</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3">
          {displayActions.map((action, index) => (
            <div key={index}>
              {action.href ? (
                <Link href={action.href}>
                  <Button
                    variant="ghost"
                    className={`w-full h-auto flex flex-col items-center p-4 ${action.color} transition-colors group`}
                    onClick={() => handleActionClick(action)}
                  >
                    <div className="mb-2 group-hover:scale-110 transition-transform">
                      {action.icon}
                    </div>
                    <span className="text-sm font-medium text-center">
                      {action.label}
                    </span>
                  </Button>
                </Link>
              ) : (
                <Button
                  variant="ghost"
                  className={`w-full h-auto flex flex-col items-center p-4 ${action.color} transition-colors group`}
                  onClick={() => handleActionClick(action)}
                >
                  <div className="mb-2 group-hover:scale-110 transition-transform">
                    {action.icon}
                  </div>
                  <span className="text-sm font-medium text-center">
                    {action.label}
                  </span>
                </Button>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
