import { useState } from "react";
import { Clock, MapPin, Users, DollarSign, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";
import { useShifts } from "@/contexts/ShiftContext";

export default function OpenShiftsPage() {
  const { user } = useAuth();
  const { openShifts, isLoading } = useShifts();
  const [filter, setFilter] = useState("all");

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "critical":
        return "bg-red-100 text-red-800 border-red-200";
      case "high":
        return "bg-orange-100 text-orange-800 border-orange-200";
      case "medium":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const filteredShifts =
    filter === "all" ? openShifts : openShifts.filter((shift) => shift.urgency === filter);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Open Shifts</h1>
          <p className="text-gray-600 dark:text-gray-300">
            Available shifts requiring immediate staffing
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={filter === "all" ? "default" : "outline"}
            onClick={() => setFilter("all")}
            size="sm"
          >
            All ({openShifts.length})
          </Button>
          <Button
            variant={filter === "critical" ? "default" : "outline"}
            onClick={() => setFilter("critical")}
            size="sm"
          >
            Critical ({openShifts.filter((s) => s.urgency === "critical").length})
          </Button>
          <Button
            variant={filter === "high" ? "default" : "outline"}
            onClick={() => setFilter("high")}
            size="sm"
          >
            High Priority ({openShifts.filter((s) => s.urgency === "high").length})
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredShifts.map((shift) => (
          <Card key={shift.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-lg">{shift.title}</CardTitle>
                  <CardDescription className="flex items-center gap-1 mt-1">
                    <MapPin className="w-3 h-3" />
                    {shift.facilityName}
                  </CardDescription>
                </div>
                <Badge className={getPriorityColor(shift.urgency)}>{shift.urgency}</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-gray-500" />
                  <div>
                    <div className="font-medium">{shift.specialty}</div>
                    <div className="text-gray-500">
                      {shift.date} • {shift.startTime}-{shift.endTime}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-gray-500" />
                  <div>
                    <div className="font-medium">${shift.rate}/hr</div>
                    <div className="text-gray-500">
                      {shift.premiumMultiplier > 1 && `${(shift.premiumMultiplier * 100).toFixed(0)}% premium`}
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="text-sm">
                  <span className="font-medium">Department:</span> {shift.department}
                </div>
                <div className="text-sm">
                  <span className="font-medium">Required Staff:</span> {shift.requiredStaff}
                </div>
              </div>

              <div className="space-y-2">
                <div className="text-sm font-medium">Requirements:</div>
                <div className="flex flex-wrap gap-1">
                  {shift.specialRequirements.map((req, index) => (
                    <Badge key={index} variant="secondary" className="text-xs">
                      {req}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <Button className="flex-1" size="sm">
                  Apply Now
                </Button>
                <Button variant="outline" size="sm">
                  Details
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredShifts.length === 0 && (
        <div className="text-center py-8">
          <AlertTriangle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            No {filter !== "all" ? filter + " priority " : ""}shifts available
          </h3>
          <p className="text-gray-500">Check back later for new opportunities</p>
        </div>
      )}
    </div>
  );
}