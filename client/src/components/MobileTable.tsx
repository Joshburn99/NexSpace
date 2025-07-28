import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ChevronRight, MoreVertical } from "lucide-react";

interface MobileTableColumn {
  key: string;
  title: string;
  render?: (value: any, row: any) => React.ReactNode;
  className?: string;
}

interface MobileTableProps {
  data: any[];
  columns: MobileTableColumn[];
  title?: string;
  onRowClick?: (row: any) => void;
  className?: string;
  loading?: boolean;
  emptyMessage?: string;
}

export const MobileTable: React.FC<MobileTableProps> = ({
  data,
  columns,
  title,
  onRowClick,
  className,
  loading = false,
  emptyMessage = "No data available",
}) => {
  if (loading) {
    return (
      <Card className={cn("w-full", className)}>
        {title && (
          <CardHeader>
            <CardTitle className="text-lg sm:text-xl">{title}</CardTitle>
          </CardHeader>
        )}
        <CardContent className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse">
              <div className="h-16 bg-gray-200 dark:bg-gray-800 rounded-lg"></div>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (data.length === 0) {
    return (
      <Card className={cn("w-full", className)}>
        {title && (
          <CardHeader>
            <CardTitle className="text-lg sm:text-xl">{title}</CardTitle>
          </CardHeader>
        )}
        <CardContent className="text-center py-8">
          <p className="text-muted-foreground">{emptyMessage}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("w-full", className)}>
      {title && (
        <CardHeader>
          <CardTitle className="text-lg sm:text-xl">{title}</CardTitle>
        </CardHeader>
      )}
      <CardContent className="p-0">
        {/* Desktop Table View */}
        <div className="hidden lg:block table-mobile">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                {columns.map((column) => (
                  <th
                    key={column.key}
                    className={cn(
                      "px-4 py-3 text-left text-sm font-medium text-muted-foreground",
                      column.className
                    )}
                  >
                    {column.title}
                  </th>
                ))}
                {onRowClick && <th className="w-12"></th>}
              </tr>
            </thead>
            <tbody>
              {data.map((row, index) => (
                <tr
                  key={index}
                  className={cn(
                    "border-b transition-colors",
                    onRowClick && "hover:bg-muted/50 cursor-pointer"
                  )}
                  onClick={() => onRowClick?.(row)}
                >
                  {columns.map((column) => (
                    <td key={column.key} className={cn("px-4 py-3 text-sm", column.className)}>
                      {column.render ? column.render(row[column.key], row) : row[column.key]}
                    </td>
                  ))}
                  {onRowClick && (
                    <td className="px-4 py-3">
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile Card View */}
        <div className="lg:hidden space-y-2 p-4">
          {data.map((row, index) => (
            <Card
              key={index}
              className={cn(
                "transition-all duration-200",
                onRowClick && "cursor-pointer hover:shadow-md active:scale-[0.98]"
              )}
              onClick={() => onRowClick?.(row)}
            >
              <CardContent className="p-4">
                <div className="space-y-3">
                  {columns.slice(0, 3).map((column) => (
                    <div key={column.key} className="flex justify-between items-start">
                      <span className="text-sm font-medium text-muted-foreground">
                        {column.title}:
                      </span>
                      <div className="text-sm font-medium text-right max-w-[60%]">
                        {column.render ? column.render(row[column.key], row) : row[column.key]}
                      </div>
                    </div>
                  ))}

                  {columns.length > 3 && (
                    <div className="flex justify-between items-center pt-2 border-t">
                      <span className="text-xs text-muted-foreground">
                        +{columns.length - 3} more fields
                      </span>
                      {onRowClick && <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

interface MobileCardListProps {
  items: any[];
  renderCard: (item: any, index: number) => React.ReactNode;
  title?: string;
  className?: string;
  loading?: boolean;
  emptyMessage?: string;
}

export const MobileCardList: React.FC<MobileCardListProps> = ({
  items,
  renderCard,
  title,
  className,
  loading = false,
  emptyMessage = "No items available",
}) => {
  if (loading) {
    return (
      <div className={cn("space-y-4", className)}>
        {title && <h2 className="text-lg sm:text-xl font-semibold">{title}</h2>}
        {[1, 2, 3].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-4">
              <div className="h-20 bg-gray-200 dark:bg-gray-800 rounded"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className={cn("text-center py-8", className)}>
        {title && <h2 className="text-lg sm:text-xl font-semibold mb-4">{title}</h2>}
        <p className="text-muted-foreground">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      {title && <h2 className="text-lg sm:text-xl font-semibold">{title}</h2>}
      <div className="grid-responsive-cards">{items.map(renderCard)}</div>
    </div>
  );
};

// Status badge component for mobile tables
interface MobileStatusBadgeProps {
  status: string;
  variant?: "default" | "success" | "warning" | "error" | "info";
}

export const MobileStatusBadge: React.FC<MobileStatusBadgeProps> = ({
  status,
  variant = "default",
}) => {
  const variants = {
    default: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
    success: "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400",
    warning: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400",
    error: "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400",
    info: "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400",
  };

  return (
    <Badge className={cn("text-xs font-medium px-2 py-1 rounded-full", variants[variant])}>
      {status}
    </Badge>
  );
};
