import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, CheckCircle, Clock, AlertCircle } from "lucide-react";
import { type Credential } from "@/types";

interface ComplianceAlert {
  id: string;
  type: "warning" | "error" | "success";
  title: string;
  description: string;
  action?: string;
}

export function ComplianceAlerts() {
  const { data: expiringCredentials = [], isLoading } = useQuery<Credential[]>({
    queryKey: ["/api/credentials", { expiring: 30 }],
  });

  // Transform credentials into alerts
  const alerts: ComplianceAlert[] = expiringCredentials.map((credential) => {
    const expirationDate = new Date(credential.expirationDate!);
    const today = new Date();
    const daysUntilExpiration = Math.ceil(
      (expirationDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysUntilExpiration <= 0) {
      return {
        id: credential.id.toString(),
        type: "error",
        title: `${credential.credentialType} Expired`,
        description: `Credential expired ${Math.abs(daysUntilExpiration)} days ago`,
        action: "Renew Now",
      };
    } else if (daysUntilExpiration <= 7) {
      return {
        id: credential.id.toString(),
        type: "error",
        title: `${credential.credentialType} Expiring Soon`,
        description: `Expires in ${daysUntilExpiration} days`,
        action: "Review Details",
      };
    } else {
      return {
        id: credential.id.toString(),
        type: "warning",
        title: `${credential.credentialType} Renewal Due`,
        description: `Expires in ${daysUntilExpiration} days`,
        action: "Schedule Renewal",
      };
    }
  });

  // Add some mock system alerts for demonstration
  const systemAlerts: ComplianceAlert[] = [
    {
      id: "system-1",
      type: "success",
      title: "Training Completed",
      description: "Staff infection control training completed",
      action: "Update Records",
    },
  ];

  const allAlerts = [...alerts.slice(0, 2), ...systemAlerts].slice(0, 3);

  const getAlertIcon = (type: ComplianceAlert["type"]) => {
    switch (type) {
      case "error":
        return <div className="w-2 h-2 bg-red-500 rounded-full"></div>;
      case "warning":
        return <div className="w-2 h-2 bg-amber-500 rounded-full"></div>;
      case "success":
        return <div className="w-2 h-2 bg-green-500 rounded-full"></div>;
      default:
        return <div className="w-2 h-2 bg-gray-500 rounded-full"></div>;
    }
  };

  const getAlertTextColor = (type: ComplianceAlert["type"]) => {
    switch (type) {
      case "error":
        return "text-red-700";
      case "warning":
        return "text-amber-700";
      case "success":
        return "text-green-700";
      default:
        return "text-gray-700";
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Compliance Alerts</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-start space-x-3 animate-pulse">
                <div className="w-2 h-2 bg-gray-200 rounded-full mt-2"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-32"></div>
                  <div className="h-3 bg-gray-200 rounded w-48"></div>
                  <div className="h-3 bg-gray-200 rounded w-20"></div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-gray-900">Compliance Alerts</CardTitle>
      </CardHeader>
      <CardContent>
        {allAlerts.length === 0 ? (
          <div className="text-center py-8">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">All Clear</h3>
            <p className="text-gray-500">No compliance alerts at this time.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {allAlerts.map((alert) => (
              <div key={alert.id} className="flex items-start space-x-3">
                <div className="flex-shrink-0 mt-2">{getAlertIcon(alert.type)}</div>
                <div className="flex-1">
                  <p className={`text-sm font-medium ${getAlertTextColor(alert.type)}`}>
                    {alert.title}
                  </p>
                  <p className="text-sm text-gray-500 mt-1">{alert.description}</p>
                  {alert.action && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-blue-600 hover:text-blue-700 text-xs font-medium mt-1 p-0 h-auto"
                    >
                      {alert.action}
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
