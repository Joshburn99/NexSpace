import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FileText, Search, ArrowLeft, Home, Clock, User, Activity } from "lucide-react";
import { format } from "date-fns";

export default function AdminAuditLogsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedAction, setSelectedAction] = useState<string>("all");
  const [selectedResource, setSelectedResource] = useState<string>("all");

  const { data: auditLogs = [], isLoading } = useQuery({
    queryKey: ["/api/admin/audit-logs"],
  });

  const filteredLogs = auditLogs.filter((log: any) => {
    const matchesSearch = log.action?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         log.resource?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         log.username?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesAction = selectedAction === "all" || log.action === selectedAction;
    const matchesResource = selectedResource === "all" || log.resource === selectedResource;
    return matchesSearch && matchesAction && matchesResource;
  });

  const getActionBadgeVariant = (action: string) => {
    switch (action) {
      case "CREATE": return "default";
      case "UPDATE": return "secondary";
      case "DELETE": return "destructive";
      case "LOGIN": return "outline";
      case "LOGOUT": return "outline";
      default: return "outline";
    }
  };

  const uniqueActions = [...new Set(auditLogs.map((log: any) => log.action))];
  const uniqueResources = [...new Set(auditLogs.map((log: any) => log.resource))];

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-4 mb-4">
          <Link href="/">
            <Button variant="ghost" size="sm" className="gap-2">
              <Home className="h-4 w-4" />
              Dashboard
            </Button>
          </Link>
          <Link href="/admin/impersonation">
            <Button variant="ghost" size="sm" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Admin
            </Button>
          </Link>
        </div>
        <h1 className="text-3xl font-bold">Audit Logs</h1>
        <p className="text-muted-foreground">
          View system activity and user actions for security and compliance monitoring
        </p>
      </div>

      <div className="flex flex-col lg:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by action, resource, or user..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        <Select value={selectedAction} onValueChange={setSelectedAction}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filter by action" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Actions</SelectItem>
            {uniqueActions.map((action) => (
              <SelectItem key={action} value={action}>{action}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={selectedResource} onValueChange={setSelectedResource}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filter by resource" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Resources</SelectItem>
            {uniqueResources.map((resource) => (
              <SelectItem key={resource} value={resource}>{resource}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-blue-500" />
              <div>
                <p className="text-sm font-medium">Total Actions</p>
                <p className="text-2xl font-bold">{auditLogs.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-green-500" />
              <div>
                <p className="text-sm font-medium">Unique Users</p>
                <p className="text-2xl font-bold">
                  {new Set(auditLogs.map((log: any) => log.userId)).size}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-orange-500" />
              <div>
                <p className="text-sm font-medium">Resources</p>
                <p className="text-2xl font-bold">{uniqueResources.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-purple-500" />
              <div>
                <p className="text-sm font-medium">Today's Actions</p>
                <p className="text-2xl font-bold">
                  {auditLogs.filter((log: any) => {
                    const today = new Date().toDateString();
                    return new Date(log.createdAt).toDateString() === today;
                  }).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Audit Trail ({filteredLogs.length} records)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">Loading audit logs...</div>
          ) : filteredLogs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No audit logs found</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Resource</TableHead>
                  <TableHead>Resource ID</TableHead>
                  <TableHead>IP Address</TableHead>
                  <TableHead>Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLogs.map((log: any) => (
                  <TableRow key={log.id}>
                    <TableCell>
                      <div className="text-sm">
                        {format(new Date(log.createdAt), "MMM dd, yyyy")}
                        <div className="text-xs text-muted-foreground">
                          {format(new Date(log.createdAt), "HH:mm:ss")}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{log.username || "System"}</div>
                        <div className="text-xs text-muted-foreground">ID: {log.userId}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getActionBadgeVariant(log.action)}>
                        {log.action}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <code className="text-xs bg-muted px-1 py-0.5 rounded">
                        {log.resource}
                      </code>
                    </TableCell>
                    <TableCell>{log.resourceId || "-"}</TableCell>
                    <TableCell>
                      <code className="text-xs">{log.ipAddress || "-"}</code>
                    </TableCell>
                    <TableCell>
                      {log.userAgent && (
                        <div className="text-xs text-muted-foreground max-w-48 truncate">
                          {log.userAgent}
                        </div>
                      )}
                      {(log.oldValues || log.newValues) && (
                        <Badge variant="outline" className="text-xs">
                          Data Changed
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}