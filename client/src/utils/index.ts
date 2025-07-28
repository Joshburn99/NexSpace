// Central export file for all utility functions

export * from "./shiftUtils";
export * from "./userUtils";
export * from "./facilityUtils";

// Date utilities
export const formatDate = (date: string | Date): string => {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

export const formatDateTime = (date: string | Date): string => {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export const getToday = (): string => {
  return new Date().toISOString().split("T")[0];
};

export const addDays = (date: string, days: number): string => {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
};

export const getWeekDates = (startDate: string): string[] => {
  const dates = [];
  for (let i = 0; i < 7; i++) {
    dates.push(addDays(startDate, i));
  }
  return dates;
};

// Status utilities
export const getStatusColor = (status: string): string => {
  const statusColors: Record<string, string> = {
    draft: "text-gray-500",
    open: "text-orange-500",
    filled: "text-green-500",
    in_progress: "text-blue-500",
    completed: "text-green-600",
    cancelled: "text-red-500",
    pending: "text-yellow-500",
    confirmed: "text-green-500",
    declined: "text-red-500",
    no_show: "text-red-600",
  };
  return statusColors[status] || "text-gray-500";
};

export const getStatusBadgeVariant = (
  status: string
): "default" | "secondary" | "destructive" | "outline" => {
  const statusVariants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
    draft: "secondary",
    open: "outline",
    filled: "default",
    in_progress: "default",
    completed: "default",
    cancelled: "destructive",
    pending: "outline",
    confirmed: "default",
    declined: "destructive",
    no_show: "destructive",
  };
  return statusVariants[status] || "secondary";
};
