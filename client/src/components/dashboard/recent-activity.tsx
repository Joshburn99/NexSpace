import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Clock, UserCheck, FileText, AlertCircle, Settings } from "lucide-react";
import { type AuditLog } from "@/types";

interface ActivityItem {
  id: string;
  type: "user" | "system";
  avatar?: string;
  name: string;
  action: string;
  time: string;
  icon?: React.ReactNode;
}

export function RecentActivity() {
  const { user } = useAuth();

  const { data: auditLogs = [], isLoading } = useQuery<AuditLog[]>({
    queryKey: ["/api/dashboard/recent-activity"],
    enabled: !!user?.facilityId,
  });

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));

    if (diffInMinutes < 1) return "Just now";
    if (diffInMinutes < 60) return `${diffInMinutes} minutes ago`;

    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours} hours ago`;

    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays} days ago`;
  };

  const transformAuditLogsToActivities = (logs: AuditLog[]): ActivityItem[] => {
    return logs.map((log) => {
      let action = "";
      let icon: React.ReactNode | undefined;

      switch (log.action) {
        case "CREATE":
          action = `created a new ${log.resource}`;
          icon = <FileText className="h-4 w-4 text-green-600" />;
          break;
        case "UPDATE":
          action = `updated ${log.resource}`;
          icon = <Settings className="h-4 w-4 text-blue-600" />;
          break;
        case "DELETE":
          action = `deleted ${log.resource}`;
          icon = <AlertCircle className="h-4 w-4 text-red-600" />;
          break;
        case "LOGIN":
          action = "logged in";
          icon = <UserCheck className="h-4 w-4 text-green-600" />;
          break;
        case "LOGOUT":
          action = "logged out";
          icon = <UserCheck className="h-4 w-4 text-gray-600" />;
          break;
        case "IMPERSONATE":
          action = "started user impersonation";
          icon = <AlertCircle className="h-4 w-4 text-orange-600" />;
          break;
        default:
          action = log.action.toLowerCase();
          icon = <Settings className="h-4 w-4 text-gray-600" />;
      }

      return {
        id: log.id.toString(),
        type: "user" as const,
        name: `User ${log.userId}`, // This would be populated with actual user data in a real app
        action,
        time: formatTimeAgo(log.createdAt),
        icon,
      };
    });
  };

  // Mock some additional activities for demonstration
  const mockActivities: ActivityItem[] = [
    {
      id: "mock-1",
      type: "user",
      name: "Jennifer Wilson",
      action: "clocked in for ICU shift",
      time: "2 minutes ago",
      avatar:
        "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?ixlib=rb-4.0.3&w=32&h=32&fit=crop&crop=face",
    },
    {
      id: "mock-2",
      type: "user",
      name: "Dr. Michael Chen",
      action: "approved overtime request",
      time: "15 minutes ago",
      avatar:
        "https://images.unsplash.com/photo-1582750433449-648ed127bb54?ixlib=rb-4.0.3&w=32&h=32&fit=crop&crop=face",
    },
    {
      id: "mock-3",
      type: "system",
      name: "System",
      action: "generated weekly compliance report",
      time: "1 hour ago",
      icon: <Settings className="h-4 w-4 text-blue-600" />,
    },
  ];

  const activities = transformAuditLogsToActivities(auditLogs);
  const allActivities = [...activities, ...mockActivities].slice(0, 5);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-start space-x-3 animate-pulse">
                <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-3 bg-gray-200 rounded w-32"></div>
                  <div className="h-2 bg-gray-200 rounded w-20"></div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-gray-900">Recent Activity</CardTitle>
      </CardHeader>
      <CardContent>
        {allActivities.length === 0 ? (
          <div className="text-center py-8">
            <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No recent activity</h3>
            <p className="text-gray-500">Activity will appear here as it happens.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {allActivities.map((activity) => (
              <div key={activity.id} className="flex items-start space-x-3">
                {activity.type === "user" ? (
                  <Avatar className="w-8 h-8">
                    <AvatarImage src={activity.avatar} />
                    <AvatarFallback className="text-xs">
                      {activity.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")}
                    </AvatarFallback>
                  </Avatar>
                ) : (
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    {activity.icon || <Settings className="h-4 w-4 text-blue-600" />}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-900">
                    <span className="font-medium">{activity.name}</span> {activity.action}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">{activity.time}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
