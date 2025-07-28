import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Shield,
  Search,
  Calendar as CalendarIcon,
  Filter,
  Download,
  User,
  Clock,
  Activity,
} from "lucide-react";
import { useFacilityPermissions } from "@/hooks/use-facility-permissions";
import { format } from "date-fns";

interface AuditLog {
  id: number;
  userId: number;
  userName: string;
  action: string;
  resource: string;
  resourceId?: number;
  changes?: any;
  ipAddress: string;
  userAgent: string;
  timestamp: string;
  facilityId: number;
}

const ACTION_TYPES = {
  "user.login": { label: "User Login", color: "default" },
  "user.logout": { label: "User Logout", color: "secondary" },
  "shift.create": { label: "Shift Created", color: "default" },
  "shift.update": { label: "Shift Updated", color: "outline" },
  "shift.delete": { label: "Shift Deleted", color: "destructive" },
  "shift.assign": { label: "Shift Assigned", color: "default" },
  "staff.create": { label: "Staff Added", color: "default" },
  "staff.update": { label: "Staff Updated", color: "outline" },
  "facility.update": { label: "Facility Updated", color: "outline" },
  "settings.update": { label: "Settings Changed", color: "outline" },
  "compliance.update": { label: "Compliance Updated", color: "outline" },
  "user.permission_change": { label: "Permissions Changed", color: "destructive" },
};

export default function FacilityAuditLogsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterAction, setFilterAction] = useState("all");
  const [dateRange, setDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({
    from: undefined,
    to: undefined,
  });
  const { permissions, hasPermission, facilityId } = useFacilityPermissions();

  const { data: auditLogs = [], isLoading } = useQuery<AuditLog[]>({
    queryKey: ["/api/audit-logs", "facility", facilityId],
    enabled: !!facilityId && hasPermission("view_audit_logs"),
  });

  if (!hasPermission("view_audit_logs")) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-6">
            <p className="text-gray-600">You don't have permission to view audit logs.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const filteredLogs = auditLogs.filter((log) => {
    const matchesSearch =
      log.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.resource.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesAction = filterAction === "all" || log.action === filterAction;

    const logDate = new Date(log.timestamp);
    const matchesDateRange =
      (!dateRange.from || logDate >= dateRange.from) && (!dateRange.to || logDate <= dateRange.to);

    return matchesSearch && matchesAction && matchesDateRange;
  });

  const exportLogs = () => {
    // Export functionality
    const csv = [
      ["Timestamp", "User", "Action", "Resource", "IP Address"],
      ...filteredLogs.map((log) => [
        log.timestamp,
        log.userName,
        ACTION_TYPES[log.action as keyof typeof ACTION_TYPES]?.label || log.action,
        log.resource,
        log.ipAddress,
      ]),
    ]
      .map((row) => row.join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `audit-logs-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
  };

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Shield className="h-8 w-8" />
            Audit Logs
          </h1>
          <p className="text-gray-600 mt-2">View activity history for your facility</p>
        </div>
        <Button onClick={exportLogs} variant="outline">
          <Download className="h-4 w-4 mr-2" />
          Export
        </Button>
      </div>

      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search by user, action, or resource..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            <Select value={filterAction} onValueChange={setFilterAction}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filter by action" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Actions</SelectItem>
                {Object.entries(ACTION_TYPES).map(([value, { label }]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-[240px]">
                  <CalendarIcon className="h-4 w-4 mr-2" />
                  {dateRange.from ? (
                    dateRange.to ? (
                      <>
                        {format(dateRange.from, "LLL dd, y")} - {format(dateRange.to, "LLL dd, y")}
                      </>
                    ) : (
                      format(dateRange.from, "LLL dd, y")
                    )
                  ) : (
                    "Select date range"
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="range"
                  selected={{ from: dateRange.from, to: dateRange.to }}
                  onSelect={(range: any) =>
                    setDateRange(range || { from: undefined, to: undefined })
                  }
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Activity Log</CardTitle>
          <CardDescription>
            Showing {filteredLogs.length} of {auditLogs.length} entries
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-center py-8 text-gray-500">Loading audit logs...</p>
          ) : filteredLogs.length === 0 ? (
            <p className="text-center py-8 text-gray-500">No audit logs found</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Resource</TableHead>
                  <TableHead>IP Address</TableHead>
                  <TableHead>Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLogs.map((log) => {
                  const actionConfig = ACTION_TYPES[log.action as keyof typeof ACTION_TYPES];
                  return (
                    <TableRow key={log.id}>
                      <TableCell>
                        <div className="flex items-center gap-2 text-sm">
                          <Clock className="h-4 w-4 text-gray-400" />
                          <div>
                            <p className="font-medium">
                              {format(new Date(log.timestamp), "MMM d, yyyy")}
                            </p>
                            <p className="text-gray-600">
                              {format(new Date(log.timestamp), "h:mm a")}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-gray-400" />
                          <span className="font-medium">{log.userName}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={(actionConfig?.color as any) || "default"}>
                          {actionConfig?.label || log.action}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Activity className="h-4 w-4 text-gray-400" />
                          <span>{log.resource}</span>
                          {log.resourceId && (
                            <span className="text-gray-500">#{log.resourceId}</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-sm text-gray-600">
                        {log.ipAddress}
                      </TableCell>
                      <TableCell>
                        {log.changes && (
                          <Button variant="ghost" size="sm">
                            View
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
