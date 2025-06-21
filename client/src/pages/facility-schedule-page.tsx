import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Users, Building } from "lucide-react";

export default function FacilitySchedulePage() {
  const [selectedDate, setSelectedDate] = useState(new Date());

  const { data: shifts = [] } = useQuery({
    queryKey: ["/api/facility/shifts"],
  });

  const { data: requirements = [] } = useQuery({
    queryKey: ["/api/facility/requirements"],
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Facility Schedule
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            Modern scheduling interface for facility coordinators
          </p>
        </div>
        <Button>
          <Calendar className="h-4 w-4 mr-2" />
          View Schedule
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {(requirements as any[]).map((req: any, index: number) => (
          <Card key={index}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-medium text-sm">{req.department}</h3>
                <Building className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Required Hrs:</span>
                  <span className="font-medium">{req.requiredHours}</span>
                </div>
                <div className="flex justify-between">
                  <span>Current Hrs:</span>
                  <span className="font-medium">{req.currentHours}</span>
                </div>
                {req.shortage > 0 && (
                  <Badge variant="destructive" className="w-full justify-center">
                    {req.shortage} hrs short
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Facility Schedule Grid
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            OnShift-style facility scheduling grid will be implemented here with staff names, 
            days of the week, shift assignments, and real-time coverage management.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}