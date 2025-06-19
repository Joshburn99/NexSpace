import { useAuth } from "@/hooks/use-auth";
import ClinicianDashboardPage from "./clinician-dashboard-page";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, Gift, Heart } from "lucide-react";
import { UserRole } from "@shared/schema";

const PTORequestButton = () => (
  <Card>
    <CardHeader>
      <CardTitle className="flex items-center space-x-2">
        <Calendar className="w-5 h-5" />
        <span>Request Time Off</span>
      </CardTitle>
    </CardHeader>
    <CardContent>
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">Available PTO</span>
          <Badge variant="secondary">40 hours</Badge>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">Pending Requests</span>
          <Badge variant="outline">2 requests</Badge>
        </div>
        <Button className="w-full">
          <Calendar className="w-4 h-4 mr-2" />
          Submit PTO Request
        </Button>
      </div>
    </CardContent>
  </Card>
);

const EmployeeBenefits = () => (
  <Card>
    <CardHeader>
      <CardTitle className="flex items-center space-x-2">
        <Heart className="w-5 h-5" />
        <span>Employee Benefits</span>
      </CardTitle>
    </CardHeader>
    <CardContent>
      <div className="space-y-3">
        <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
          <div className="flex items-center space-x-2">
            <Gift className="w-4 h-4 text-blue-500" />
            <span className="text-sm font-medium">Health Insurance</span>
          </div>
          <Button variant="outline" size="sm">
            View
          </Button>
        </div>
        <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
          <div className="flex items-center space-x-2">
            <Clock className="w-4 h-4 text-green-500" />
            <span className="text-sm font-medium">401(k) Plan</span>
          </div>
          <Button variant="outline" size="sm">
            View
          </Button>
        </div>
        <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
          <div className="flex items-center space-x-2">
            <Heart className="w-4 h-4 text-purple-500" />
            <span className="text-sm font-medium">Wellness Program</span>
          </div>
          <Button variant="outline" size="sm">
            View
          </Button>
        </div>
      </div>
    </CardContent>
  </Card>
);

export default function EmployeeDashboardPage() {
  const { user } = useAuth();

  if (!user || user.role !== UserRole.INTERNAL_EMPLOYEE) {
    return <ClinicianDashboardPage />;
  }

  const additionalContent = (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <PTORequestButton />
      <EmployeeBenefits />
    </div>
  );

  return <ClinicianDashboardPage hideTimeOff={false} additionalContent={additionalContent} />;
}
