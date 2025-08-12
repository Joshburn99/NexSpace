import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Calendar, 
  Users, 
  Clock, 
  Search, 
  Plus, 
  FileText,
  AlertCircle,
  CheckCircle 
} from "lucide-react";

interface EmptyStateProps {
  icon?: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export function EmptyState({ 
  icon: Icon = FileText, 
  title, 
  description, 
  action, 
  className = "" 
}: EmptyStateProps) {
  return (
    <Card className={`w-full ${className}`}>
      <CardContent className="flex flex-col items-center justify-center py-12 px-6 text-center">
        <div className="rounded-full bg-gray-100 dark:bg-gray-800 p-4 mb-4">
          <Icon className="h-8 w-8 text-gray-400 dark:text-gray-600" />
        </div>
        
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
          {title}
        </h3>
        
        <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-sm">
          {description}
        </p>
        
        {action && (
          <Button onClick={action.onClick} className="gap-2">
            <Plus className="h-4 w-4" />
            {action.label}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

export function CalendarEmptyState({ onCreateShift }: { onCreateShift?: () => void }) {
  return (
    <EmptyState
      icon={Calendar}
      title="No shifts scheduled"
      description="Get started by creating your first shift or importing from another calendar system."
      action={onCreateShift ? {
        label: "Create First Shift",
        onClick: onCreateShift
      } : undefined}
    />
  );
}

export function StaffEmptyState({ onAddStaff }: { onAddStaff?: () => void }) {
  return (
    <EmptyState
      icon={Users}
      title="No staff members found"
      description="Add staff members to start managing your workforce and scheduling shifts."
      action={onAddStaff ? {
        label: "Add Staff Member",
        onClick: onAddStaff
      } : undefined}
    />
  );
}

export function SearchEmptyState({ searchQuery }: { searchQuery: string }) {
  return (
    <EmptyState
      icon={Search}
      title="No results found"
      description={`No results match "${searchQuery}". Try adjusting your search terms or filters.`}
    />
  );
}

export function ShiftsEmptyState({ onCreateShift }: { onCreateShift?: () => void }) {
  return (
    <EmptyState
      icon={Clock}
      title="No shifts available"
      description="Create shifts to start managing your workforce schedule and assignments."
      action={onCreateShift ? {
        label: "Create Shift",
        onClick: onCreateShift
      } : undefined}
    />
  );
}

export function ErrorState({ 
  title = "Something went wrong", 
  description = "We encountered an error loading this data. Please try again.",
  onRetry 
}: { 
  title?: string; 
  description?: string; 
  onRetry?: () => void; 
}) {
  return (
    <Card className="w-full">
      <CardContent className="flex flex-col items-center justify-center py-12 px-6 text-center">
        <div className="rounded-full bg-red-100 dark:bg-red-900/20 p-4 mb-4">
          <AlertCircle className="h-8 w-8 text-red-600 dark:text-red-400" />
        </div>
        
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
          {title}
        </h3>
        
        <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-sm">
          {description}
        </p>
        
        {onRetry && (
          <Button onClick={onRetry} variant="outline">
            Try Again
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

export function SuccessState({ 
  title = "All done!", 
  description = "Everything is up to date and working correctly."
}: { 
  title?: string; 
  description?: string; 
}) {
  return (
    <Card className="w-full">
      <CardContent className="flex flex-col items-center justify-center py-12 px-6 text-center">
        <div className="rounded-full bg-green-100 dark:bg-green-900/20 p-4 mb-4">
          <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
        </div>
        
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
          {title}
        </h3>
        
        <p className="text-gray-600 dark:text-gray-400 max-w-sm">
          {description}
        </p>
      </CardContent>
    </Card>
  );
}