import { useAuth } from "@/hooks/use-auth";
import ClinicianDashboardPage from "./clinician-dashboard-page";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, DollarSign, Calendar, Download } from "lucide-react";
import { UserRole } from "@shared/schema";

const GigHistoryCTA = () => (
  <Card>
    <CardHeader>
      <CardTitle className="flex items-center space-x-2">
        <DollarSign className="w-5 h-5" />
        <span>Contractor Tools</span>
      </CardTitle>
    </CardHeader>
    <CardContent>
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">Total Earnings (YTD)</span>
          <Badge variant="secondary">$45,280</Badge>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">Completed Gigs</span>
          <Badge variant="outline">127 shifts</Badge>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Button variant="outline" size="sm">
            <FileText className="w-4 h-4 mr-2" />
            View 1099
          </Button>
          <Button variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Tax Docs
          </Button>
        </div>
      </div>
    </CardContent>
  </Card>
);

const ContractorResources = () => (
  <Card>
    <CardHeader>
      <CardTitle className="flex items-center space-x-2">
        <FileText className="w-5 h-5" />
        <span>Contractor Resources</span>
      </CardTitle>
    </CardHeader>
    <CardContent>
      <div className="space-y-3">
        <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
          <div className="flex items-center space-x-2">
            <Calendar className="w-4 h-4 text-blue-500" />
            <span className="text-sm font-medium">Tax Planning Guide</span>
          </div>
          <Button variant="outline" size="sm">
            View
          </Button>
        </div>
        <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
          <div className="flex items-center space-x-2">
            <DollarSign className="w-4 h-4 text-green-500" />
            <span className="text-sm font-medium">Payment Schedule</span>
          </div>
          <Button variant="outline" size="sm">
            View
          </Button>
        </div>
        <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
          <div className="flex items-center space-x-2">
            <FileText className="w-4 h-4 text-purple-500" />
            <span className="text-sm font-medium">Contractor Agreement</span>
          </div>
          <Button variant="outline" size="sm">
            View
          </Button>
        </div>
      </div>
    </CardContent>
  </Card>
);

export default function ContractorDashboardPage() {
  const { user } = useAuth();

  if (!user || user.role !== UserRole.CONTRACTOR_1099) {
    return <ClinicianDashboardPage />;
  }

  const additionalContent = (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <GigHistoryCTA />
      <ContractorResources />
    </div>
  );

  return <ClinicianDashboardPage hideTimeOff={true} additionalContent={additionalContent} />;
}
