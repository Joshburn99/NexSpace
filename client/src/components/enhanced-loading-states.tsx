import React from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Loader2, AlertCircle, Wifi, WifiOff } from "lucide-react";
import { cn } from "@/lib/utils";

// Enhanced loading spinner with size variations
export function LoadingSpinner({ 
  size = "default", 
  className = "" 
}: { 
  size?: "sm" | "default" | "lg"; 
  className?: string;
}) {
  const sizeClasses = {
    sm: "h-4 w-4",
    default: "h-6 w-6", 
    lg: "h-8 w-8"
  };

  return (
    <Loader2 className={cn("animate-spin", sizeClasses[size], className)} />
  );
}

// Page-level loading state
export function PageLoadingState({ message = "Loading..." }: { message?: string }) {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center space-y-4">
        <LoadingSpinner size="lg" className="mx-auto text-blue-600" />
        <div className="space-y-2">
          <h3 className="text-lg font-semibold text-gray-900">{message}</h3>
          <p className="text-gray-600">Please wait while we load your data...</p>
        </div>
      </div>
    </div>
  );
}

// Card loading skeleton
export function CardLoadingSkeleton({ count = 1 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i} className="animate-pulse">
          <CardHeader>
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </CardHeader>
          <CardContent className="space-y-3">
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-5/6" />
            <Skeleton className="h-8 w-24" />
          </CardContent>
        </Card>
      ))}
    </>
  );
}

// Table loading skeleton
export function TableLoadingSkeleton({ rows = 5, columns = 4 }: { rows?: number; columns?: number }) {
  return (
    <div className="space-y-3">
      {/* Table header */}
      <div className="flex space-x-4">
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={i} className="h-4 flex-1" />
        ))}
      </div>
      
      {/* Table rows */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="flex space-x-4">
          {Array.from({ length: columns }).map((_, colIndex) => (
            <Skeleton key={colIndex} className="h-8 flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}

// Navigation loading skeleton
export function NavigationLoadingSkeleton() {
  return (
    <div className="space-y-2 p-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex items-center space-x-3">
          <Skeleton className="h-5 w-5" />
          <Skeleton className="h-4 w-24" />
        </div>
      ))}
    </div>
  );
}

// Empty state component
export function EmptyState({ 
  icon: Icon = AlertCircle,
  title = "No data available",
  description = "There's nothing to show here yet.",
  action
}: {
  icon?: React.ComponentType<any>;
  title?: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="text-center py-12 px-4">
      <div className="mx-auto w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-4">
        <Icon className="h-6 w-6 text-gray-400" />
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-600 mb-6 max-w-sm mx-auto">{description}</p>
      {action}
    </div>
  );
}

// Connection status indicator
export function ConnectionStatus({ isOnline = true }: { isOnline?: boolean }) {
  if (isOnline) {
    return (
      <div className="flex items-center gap-2 text-green-600 text-sm">
        <Wifi className="h-4 w-4" />
        <span>Connected</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 text-red-600 text-sm">
      <WifiOff className="h-4 w-4" />
      <span>Offline</span>
    </div>
  );
}

// Loading button state
export function LoadingButton({ 
  isLoading = false, 
  children, 
  ...props 
}: { 
  isLoading?: boolean; 
  children: React.ReactNode;
  [key: string]: any;
}) {
  return (
    <button 
      {...props} 
      disabled={isLoading || props.disabled}
      className={cn(
        "inline-flex items-center justify-center",
        props.className
      )}
    >
      {isLoading && <LoadingSpinner size="sm" className="mr-2" />}
      {children}
    </button>
  );
}

// Data fetching wrapper with loading states
export function DataWrapper({ 
  isLoading = false,
  isError = false,
  isEmpty = false,
  error,
  children,
  loadingComponent,
  emptyComponent,
  errorComponent
}: {
  isLoading?: boolean;
  isError?: boolean;
  isEmpty?: boolean;
  error?: any;
  children: React.ReactNode;
  loadingComponent?: React.ReactNode;
  emptyComponent?: React.ReactNode;
  errorComponent?: React.ReactNode;
}) {
  if (isLoading) {
    return loadingComponent || <CardLoadingSkeleton count={3} />;
  }

  if (isError) {
    return errorComponent || (
      <EmptyState
        icon={AlertCircle}
        title="Failed to load data"
        description={error?.message || "Something went wrong while loading the data."}
      />
    );
  }

  if (isEmpty) {
    return emptyComponent || (
      <EmptyState
        title="No data available"
        description="There's nothing to show here yet."
      />
    );
  }

  return <>{children}</>;
}