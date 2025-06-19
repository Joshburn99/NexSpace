import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { History, Building, Clock, ChevronRight } from "lucide-react";
import { format } from "date-fns";

interface WorkHistoryEntry {
  id: number;
  date: string;
  shiftType: string;
  hours: number;
  facilityName: string;
  department: string;
  status: 'completed' | 'pending' | 'cancelled';
  rate: number;
  totalPay: number;
}

export function WorkHistorySection() {
  const { user } = useAuth();

  const { data: history, isLoading } = useQuery<WorkHistoryEntry[]>({
    queryKey: [`/api/history?userId=${user?.id}`]
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const totalHours = history?.reduce((sum, entry) => sum + entry.hours, 0) || 0;
  const totalEarnings = history?.reduce((sum, entry) => sum + entry.totalPay, 0) || 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center space-x-2">
            <History className="w-5 h-5" />
            <span>Work History</span>
          </CardTitle>
          <Button variant="outline" size="sm">
            View All
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Summary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="flex items-center justify-center space-x-2 mb-2">
                <Clock className="w-4 h-4 text-blue-500" />
                <span className="text-sm font-medium text-blue-700">Total Hours</span>
              </div>
              <p className="text-2xl font-bold text-blue-900">{totalHours}</p>
              <p className="text-xs text-blue-600">This month</p>
            </div>
            
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="flex items-center justify-center space-x-2 mb-2">
                <Building className="w-4 h-4 text-green-500" />
                <span className="text-sm font-medium text-green-700">Facilities</span>
              </div>
              <p className="text-2xl font-bold text-green-900">
                {new Set(history?.map(h => h.facilityName)).size || 0}
              </p>
              <p className="text-xs text-green-600">Worked at</p>
            </div>
            
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <div className="flex items-center justify-center space-x-2 mb-2">
                <span className="text-sm font-medium text-purple-700">Earnings</span>
              </div>
              <p className="text-2xl font-bold text-purple-900">${totalEarnings.toLocaleString()}</p>
              <p className="text-xs text-purple-600">This month</p>
            </div>
          </div>

          {/* Recent History Table */}
          <div className="space-y-3">
            <h4 className="font-medium text-gray-900">Recent Shifts</h4>
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Facility</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Hours</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Pay</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {history?.slice(0, 5).map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell className="font-medium">
                        {format(new Date(entry.date), 'MMM d')}
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{entry.facilityName}</p>
                          <p className="text-xs text-gray-600">{entry.shiftType}</p>
                        </div>
                      </TableCell>
                      <TableCell>{entry.department}</TableCell>
                      <TableCell>{entry.hours}h</TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(entry.status)}>
                          {entry.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        ${entry.totalPay.toFixed(2)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>

          {(!history || history.length === 0) && !isLoading && (
            <div className="text-center py-8">
              <History className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No work history yet</h3>
              <p className="text-gray-500">Your completed shifts will appear here</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}