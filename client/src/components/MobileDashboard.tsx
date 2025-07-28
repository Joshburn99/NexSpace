import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import {
  TrendingUp,
  TrendingDown,
  Activity,
  Users,
  CalendarDays,
  AlertTriangle,
  CheckCircle,
  DollarSign,
  Clock,
  Building,
  FileText,
  Shield,
} from "lucide-react";

interface DashboardStat {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ElementType;
  trend?: "up" | "down" | "neutral";
  trendValue?: string;
  permission?: string;
  color?: string;
}

interface MobileDashboardProps {
  stats: DashboardStat[];
  priorityTasks?: Array<{
    id: string;
    title: string;
    type: "urgent" | "warning" | "info";
    count: number;
  }>;
  recentActivity?: Array<{
    id: number;
    action: string;
    resource: string;
    createdAt: string;
    user: { firstName: string; lastName: string };
  }>;
  isLoading?: boolean;
  className?: string;
}

export const MobileDashboard: React.FC<MobileDashboardProps> = ({
  stats,
  priorityTasks = [],
  recentActivity = [],
  isLoading = false,
  className,
}) => {
  if (isLoading) {
    return (
      <div className={cn("space-y-4 sm:space-y-6", className)}>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-20 bg-gray-200 dark:bg-gray-800 rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const getTrendColor = (trend?: "up" | "down" | "neutral") => {
    switch (trend) {
      case "up":
        return "text-green-600 dark:text-green-400";
      case "down":
        return "text-red-600 dark:text-red-400";
      default:
        return "text-gray-600 dark:text-gray-400";
    }
  };

  const getTrendIcon = (trend?: "up" | "down" | "neutral") => {
    switch (trend) {
      case "up":
        return TrendingUp;
      case "down":
        return TrendingDown;
      default:
        return Activity;
    }
  };

  const getTaskTypeColor = (type: "urgent" | "warning" | "info") => {
    switch (type) {
      case "urgent":
        return "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400";
      case "warning":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400";
      case "info":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400";
    }
  };

  return (
    <div className={cn("space-y-4 sm:space-y-6", className)}>
      {/* Stats Grid - Mobile Responsive */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          const TrendIcon = getTrendIcon(stat.trend);

          return (
            <Card
              key={index}
              className="card-shadow card-border transition-all duration-200 hover:shadow-lg"
            >
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm sm:text-base font-medium flex items-center gap-2">
                    <Icon className={cn("h-4 w-4 sm:h-5 sm:w-5", stat.color || "text-blue-500")} />
                    <span className="truncate">{stat.title}</span>
                  </CardTitle>
                  {stat.trend && stat.trendValue && (
                    <div
                      className={cn(
                        "flex items-center gap-1 text-xs sm:text-sm",
                        getTrendColor(stat.trend)
                      )}
                    >
                      <TrendIcon className="h-3 w-3 sm:h-4 sm:w-4" />
                      {stat.trendValue}
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-xl sm:text-2xl lg:text-3xl font-bold">{stat.value}</div>
                {stat.subtitle && (
                  <p className="text-xs sm:text-sm text-muted-foreground mt-1">{stat.subtitle}</p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Priority Tasks and Recent Activity - Mobile Responsive Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Priority Tasks */}
        {priorityTasks.length > 0 && (
          <Card className="card-shadow">
            <CardHeader>
              <CardTitle className="text-lg sm:text-xl flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-orange-500" />
                Priority Tasks
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {priorityTasks.map((task) => (
                <div
                  key={task.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                >
                  <div className="flex-1">
                    <p className="text-sm sm:text-base font-medium">{task.title}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={cn("text-xs font-medium", getTaskTypeColor(task.type))}>
                      {task.count}
                    </Badge>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Recent Activity */}
        {recentActivity.length > 0 && (
          <Card className="card-shadow">
            <CardHeader>
              <CardTitle className="text-lg sm:text-xl flex items-center gap-2">
                <Activity className="h-5 w-5 text-blue-500" />
                Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recentActivity.slice(0, 5).map((activity, index) => (
                  <div key={activity.id} className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">
                        {activity.user.firstName} {activity.user.lastName}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {activity.action} {activity.resource}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(activity.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Empty State for No Data */}
      {priorityTasks.length === 0 && recentActivity.length === 0 && (
        <Card className="card-shadow">
          <CardContent className="text-center py-8">
            <Activity className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No recent activity or priority tasks</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

// Mobile-optimized stats card component
interface MobileStatsCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ElementType;
  trend?: "up" | "down" | "neutral";
  trendValue?: string;
  color?: string;
  onClick?: () => void;
  className?: string;
}

export const MobileStatsCard: React.FC<MobileStatsCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  trendValue,
  color = "text-blue-500",
  onClick,
  className,
}) => {
  const TrendIcon = trend === "up" ? TrendingUp : trend === "down" ? TrendingDown : Activity;

  const getTrendColor = (trend?: "up" | "down" | "neutral") => {
    switch (trend) {
      case "up":
        return "text-green-600 dark:text-green-400";
      case "down":
        return "text-red-600 dark:text-red-400";
      default:
        return "text-gray-600 dark:text-gray-400";
    }
  };

  return (
    <Card
      className={cn(
        "card-shadow card-border transition-all duration-200 hover:shadow-lg",
        onClick && "cursor-pointer hover:scale-[1.02] active:scale-[0.98]",
        className
      )}
      onClick={onClick}
    >
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm sm:text-base font-medium flex items-center gap-2">
            <Icon className={cn("h-4 w-4 sm:h-5 sm:w-5", color)} />
            <span className="truncate">{title}</span>
          </CardTitle>
          {trend && trendValue && (
            <div className={cn("flex items-center gap-1 text-xs sm:text-sm", getTrendColor(trend))}>
              <TrendIcon className="h-3 w-3 sm:h-4 sm:w-4" />
              {trendValue}
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-xl sm:text-2xl lg:text-3xl font-bold">{value}</div>
        {subtitle && <p className="text-xs sm:text-sm text-muted-foreground mt-1">{subtitle}</p>}
      </CardContent>
    </Card>
  );
};
