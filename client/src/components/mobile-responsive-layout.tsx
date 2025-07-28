import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

// Mobile-optimized card component
export function MobileCard({ 
  children, 
  className = "",
  padding = "default" 
}: { 
  children: React.ReactNode; 
  className?: string;
  padding?: "none" | "sm" | "default" | "lg";
}) {
  const paddingClasses = {
    none: "p-0",
    sm: "p-3",
    default: "p-4",
    lg: "p-6"
  };

  return (
    <Card className={cn(
      "w-full border-0 shadow-sm bg-white/95 backdrop-blur-sm",
      "hover:shadow-md transition-all duration-200",
      "touch-manipulation", // Optimize for touch
      className
    )}>
      <CardContent className={paddingClasses[padding]}>
        {children}
      </CardContent>
    </Card>
  );
}

// Mobile-optimized stats display
export function MobileStatsGrid({ 
  stats,
  columns = 2 
}: { 
  stats: Array<{
    label: string;
    value: string | number;
    change?: string;
    trend?: 'up' | 'down' | 'neutral';
    icon?: React.ComponentType<any>;
  }>;
  columns?: 1 | 2 | 3;
}) {
  const gridClasses = {
    1: "grid-cols-1",
    2: "grid-cols-2",
    3: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
  };

  return (
    <div className={cn("grid gap-3", gridClasses[columns])}>
      {stats.map((stat, index) => (
        <MobileCard key={index} padding="sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-600 uppercase tracking-wide">
                {stat.label}
              </p>
              <p className="text-lg font-bold text-gray-900 mt-1">
                {stat.value}
              </p>
              {stat.change && (
                <Badge 
                  variant={stat.trend === 'up' ? 'default' : stat.trend === 'down' ? 'destructive' : 'secondary'}
                  className="text-xs mt-1"
                >
                  {stat.change}
                </Badge>
              )}
            </div>
            {stat.icon && (
              <stat.icon className="h-8 w-8 text-gray-400" />
            )}
          </div>
        </MobileCard>
      ))}
    </div>
  );
}

// Mobile-friendly list component
export function MobileList<T>({ 
  items,
  renderItem,
  emptyMessage = "No items to display",
  className = ""
}: {
  items: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
  emptyMessage?: string;
  className?: string;
}) {
  if (items.length === 0) {
    return (
      <MobileCard className={className}>
        <div className="text-center py-8 text-gray-500">
          {emptyMessage}
        </div>
      </MobileCard>
    );
  }

  return (
    <div className={cn("space-y-2", className)}>
      {items.map((item, index) => (
        <div key={index} className="touch-manipulation">
          {renderItem(item, index)}
        </div>
      ))}
    </div>
  );
}

// Mobile-optimized action buttons
export function MobileActionButtons({ 
  actions,
  orientation = "horizontal" 
}: {
  actions: Array<{
    label: string;
    onClick: () => void;
    variant?: "default" | "outline" | "destructive" | "secondary" | "ghost";
    icon?: React.ComponentType<any>;
    disabled?: boolean;
  }>;
  orientation?: "horizontal" | "vertical";
}) {
  const containerClasses = orientation === "horizontal" 
    ? "flex flex-wrap gap-2" 
    : "flex flex-col gap-2";

  return (
    <div className={containerClasses}>
      {actions.map((action, index) => (
        <Button
          key={index}
          variant={action.variant || "default"}
          onClick={action.onClick}
          disabled={action.disabled}
          className={cn(
            "min-h-[44px]", // 44px minimum touch target
            "touch-manipulation",
            "flex-1 sm:flex-none", // Full width on mobile, auto on larger screens
            orientation === "vertical" && "w-full"
          )}
        >
          {action.icon && <action.icon className="h-4 w-4 mr-2" />}
          {action.label}
        </Button>
      ))}
    </div>
  );
}

// Mobile-responsive container
export function MobileContainer({ 
  children, 
  maxWidth = "2xl",
  padding = true,
  className = ""
}: {
  children: React.ReactNode;
  maxWidth?: "sm" | "md" | "lg" | "xl" | "2xl" | "full";
  padding?: boolean;
  className?: string;
}) {
  const maxWidthClasses = {
    sm: "max-w-sm",
    md: "max-w-md", 
    lg: "max-w-lg",
    xl: "max-w-xl",
    "2xl": "max-w-2xl",
    full: "max-w-full"
  };

  return (
    <div className={cn(
      "w-full mx-auto",
      maxWidthClasses[maxWidth],
      padding && "px-4 sm:px-6 lg:px-8",
      className
    )}>
      {children}
    </div>
  );
}

// Mobile-safe spacing utilities
export const mobileSpacing = {
  section: "space-y-6 sm:space-y-8",
  card: "space-y-4",
  form: "space-y-4 sm:space-y-6",
  list: "space-y-2 sm:space-y-3",
  button: "space-y-3 sm:space-x-3 sm:space-y-0",
};

// Mobile breakpoint utilities
export const mobileBreakpoints = {
  // Typography
  heading: "text-xl sm:text-2xl lg:text-3xl",
  subheading: "text-lg sm:text-xl",
  body: "text-sm sm:text-base",
  caption: "text-xs sm:text-sm",
  
  // Spacing
  padding: {
    sm: "p-3 sm:p-4",
    md: "p-4 sm:p-6", 
    lg: "p-6 sm:p-8"
  },
  margin: {
    sm: "m-2 sm:m-3",
    md: "m-3 sm:m-4",
    lg: "m-4 sm:m-6"
  },
  
  // Layout
  grid: {
    responsive: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
    auto: "grid-cols-1 md:grid-cols-2 xl:grid-cols-3",
    cards: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4"
  },
  
  // Flexbox
  flex: {
    stack: "flex-col sm:flex-row",
    center: "flex-col sm:flex-row sm:items-center",
    between: "flex-col sm:flex-row sm:justify-between"
  }
};

// Touch-friendly form controls
export function TouchFriendlyInput({ 
  className = "",
  ...props 
}: React.InputHTMLAttributes<HTMLInputElement> & { className?: string }) {
  return (
    <input
      {...props}
      className={cn(
        "min-h-[44px]", // Minimum touch target
        "text-base", // Prevents zoom on iOS
        "touch-manipulation",
        className
      )}
    />
  );
}

// Mobile-optimized navigation tabs
export function MobileTabs({ 
  tabs,
  activeTab,
  onTabChange,
  className = ""
}: {
  tabs: Array<{ id: string; label: string; icon?: React.ComponentType<any> }>;
  activeTab: string;
  onTabChange: (tabId: string) => void;
  className?: string;
}) {
  return (
    <div className={cn("overflow-x-auto", className)}>
      <div className="flex border-b border-gray-200 min-w-max">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={cn(
              "flex items-center gap-2 px-4 py-3 min-h-[44px]",
              "border-b-2 font-medium text-sm transition-colors",
              "touch-manipulation whitespace-nowrap",
              activeTab === tab.id
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            )}
          >
            {tab.icon && <tab.icon className="h-4 w-4" />}
            {tab.label}
          </button>
        ))}
      </div>
    </div>
  );
}