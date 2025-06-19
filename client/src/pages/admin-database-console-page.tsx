import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Database, Play, ArrowLeft, Home, AlertTriangle, CheckCircle, Info } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

export default function AdminDatabaseConsolePage() {
  const [sqlQuery, setSqlQuery] = useState("");
  const [queryResult, setQueryResult] = useState<any>(null);
  const [queryError, setQueryError] = useState<string | null>(null);

  const executeQueryMutation = useMutation({
    mutationFn: async (query: string) => {
      const response = await apiRequest("POST", "/api/admin/database/query", { query });
      return response.json();
    },
    onSuccess: (data) => {
      setQueryResult(data);
      setQueryError(null);
    },
    onError: (error: any) => {
      setQueryError(error.message);
      setQueryResult(null);
    },
  });

  const handleExecuteQuery = () => {
    if (!sqlQuery.trim()) return;
    executeQueryMutation.mutate(sqlQuery);
  };

  const commonQueries = [
    {
      name: "View all tables",
      query:
        "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;",
    },
    {
      name: "User count by role",
      query: "SELECT role, COUNT(*) as count FROM users GROUP BY role ORDER BY count DESC;",
    },
    {
      name: "Active facilities",
      query:
        "SELECT name, city, state, facility_type FROM facilities WHERE is_active = true ORDER BY name;",
    },
    {
      name: "Recent audit logs",
      query: "SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 10;",
    },
    {
      name: "Database size",
      query: "SELECT pg_size_pretty(pg_database_size(current_database())) as database_size;",
    },
    {
      name: "Table sizes",
      query: `SELECT 
        schemaname,
        tablename,
        pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
      FROM pg_tables 
      WHERE schemaname = 'public'
      ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;`,
    },
  ];

  const renderQueryResult = () => {
    if (!queryResult) return null;

    if (queryResult.rowCount !== undefined) {
      return (
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-green-600">
            <CheckCircle className="h-4 w-4" />
            <span>Query executed successfully. {queryResult.rowCount} rows affected.</span>
          </div>
          {queryResult.rows && queryResult.rows.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow>
                  {Object.keys(queryResult.rows[0]).map((column) => (
                    <TableHead key={column}>{column}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {queryResult.rows.map((row: any, index: number) => (
                  <TableRow key={index}>
                    {Object.values(row).map((value: any, cellIndex: number) => (
                      <TableCell key={cellIndex}>
                        {value === null ? (
                          <span className="text-muted-foreground italic">NULL</span>
                        ) : typeof value === "object" ? (
                          <code className="text-xs">{JSON.stringify(value)}</code>
                        ) : (
                          String(value)
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      );
    }

    return (
      <div className="text-green-600 flex items-center gap-2">
        <CheckCircle className="h-4 w-4" />
        <span>Query executed successfully.</span>
      </div>
    );
  };

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
        <h1 className="text-3xl font-bold">Database Console</h1>
        <p className="text-muted-foreground">Execute SQL queries and manage database operations</p>
      </div>

      <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
        <div className="flex items-center gap-2 text-yellow-800 dark:text-yellow-200">
          <AlertTriangle className="h-4 w-4" />
          <span className="font-medium">Warning</span>
        </div>
        <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
          This console allows direct database access. Use with caution as changes are permanent and
          can affect system stability.
        </p>
      </div>

      <Tabs defaultValue="console" className="space-y-6">
        <TabsList>
          <TabsTrigger value="console">SQL Console</TabsTrigger>
          <TabsTrigger value="queries">Common Queries</TabsTrigger>
        </TabsList>

        <TabsContent value="console" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                SQL Query Editor
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="sqlQuery">SQL Query</Label>
                <Textarea
                  id="sqlQuery"
                  placeholder="Enter your SQL query here..."
                  value={sqlQuery}
                  onChange={(e) => setSqlQuery(e.target.value)}
                  className="font-mono text-sm min-h-32"
                />
              </div>
              <Button
                onClick={handleExecuteQuery}
                disabled={executeQueryMutation.isPending || !sqlQuery.trim()}
                className="gap-2"
              >
                <Play className="h-4 w-4" />
                {executeQueryMutation.isPending ? "Executing..." : "Execute Query"}
              </Button>
            </CardContent>
          </Card>

          {(queryResult || queryError) && (
            <Card>
              <CardHeader>
                <CardTitle>Query Result</CardTitle>
              </CardHeader>
              <CardContent>
                {queryError ? (
                  <div className="text-red-600 bg-red-50 dark:bg-red-900/20 p-4 rounded-lg flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    <div>
                      <div className="font-medium">Query Error</div>
                      <pre className="text-sm mt-1 whitespace-pre-wrap">{queryError}</pre>
                    </div>
                  </div>
                ) : (
                  renderQueryResult()
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="queries" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {commonQueries.map((item, index) => (
              <Card key={index}>
                <CardHeader>
                  <CardTitle className="text-lg">{item.name}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <pre className="text-sm bg-muted p-3 rounded-lg overflow-x-auto">
                    {item.query}
                  </pre>
                  <Button
                    size="sm"
                    onClick={() => {
                      setSqlQuery(item.query);
                      executeQueryMutation.mutate(item.query);
                    }}
                    disabled={executeQueryMutation.isPending}
                    className="gap-2"
                  >
                    <Play className="h-3 w-3" />
                    Execute
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
