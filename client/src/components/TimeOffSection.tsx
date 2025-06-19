import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, CheckCircle, XCircle, AlertCircle } from "lucide-react";

interface PTOBalance {
  available: number;
  used: number;
  pending: number;
}

interface PTORequest {
  id: number;
  startDate: string;
  endDate: string;
  hours: number;
  status: "pending" | "approved" | "denied";
  reason: string;
}

export function TimeOffSection() {
  const { user } = useAuth();

  const { data: balance, isLoading: balanceLoading } = useQuery<PTOBalance>({
    queryKey: ["/api/timeoff/balance"],
  });

  const { data: requests, isLoading: requestsLoading } = useQuery<PTORequest[]>({
    queryKey: ["/api/timeoff/requests"],
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "approved":
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case "denied":
        return <XCircle className="w-4 h-4 text-red-500" />;
      case "pending":
      default:
        return <AlertCircle className="w-4 h-4 text-yellow-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "approved":
        return "bg-green-100 text-green-800";
      case "denied":
        return "bg-red-100 text-red-800";
      case "pending":
      default:
        return "bg-yellow-100 text-yellow-800";
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Calendar className="w-5 h-5" />
          <span>PTO Balance</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* PTO Balance Circle */}
          <div className="flex justify-center">
            <div className="relative w-32 h-32">
              <svg className="w-32 h-32 transform -rotate-90" viewBox="0 0 36 36">
                <path
                  className="text-gray-200"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                />
                <path
                  className="text-blue-500"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeDasharray={`${((balance?.available || 0) / 80) * 100}, 100`}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-bold">{balance?.available || 0}</span>
                <span className="text-sm text-gray-600">hours</span>
              </div>
            </div>
          </div>

          {/* Balance Details */}
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-2xl font-semibold text-blue-600">{balance?.available || 0}</p>
              <p className="text-xs text-gray-600">Available</p>
            </div>
            <div>
              <p className="text-2xl font-semibold text-gray-600">{balance?.used || 0}</p>
              <p className="text-xs text-gray-600">Used</p>
            </div>
            <div>
              <p className="text-2xl font-semibold text-yellow-600">{balance?.pending || 0}</p>
              <p className="text-xs text-gray-600">Pending</p>
            </div>
          </div>

          {/* Recent Requests */}
          {requests && requests.length > 0 && (
            <div className="space-y-3">
              <h4 className="font-medium text-gray-900">Recent Requests</h4>
              {requests.slice(0, 3).map((request) => (
                <div
                  key={request.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center space-x-3">
                    {getStatusIcon(request.status)}
                    <div>
                      <p className="text-sm font-medium">
                        {new Date(request.startDate).toLocaleDateString()} -{" "}
                        {new Date(request.endDate).toLocaleDateString()}
                      </p>
                      <p className="text-xs text-gray-600">
                        {request.hours} hours • {request.reason}
                      </p>
                    </div>
                  </div>
                  <Badge className={getStatusColor(request.status)}>{request.status}</Badge>
                </div>
              ))}
            </div>
          )}

          <Button className="w-full">
            <Calendar className="w-4 h-4 mr-2" />
            Request Time Off
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
