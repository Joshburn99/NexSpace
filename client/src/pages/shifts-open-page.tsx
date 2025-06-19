import { useState } from "react";
import { Clock, MapPin, Users, DollarSign, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";
import { SidebarNav } from "@/components/ui/sidebar-nav";

const mockOpenShifts = [
  {
    id: 1,
    position: "Registered Nurse (RN)",
    facility: "Sunrise Senior Living",
    startTime: "2025-06-18T06:00:00Z",
    endTime: "2025-06-18T18:00:00Z",
    hourlyRate: 45,
    priority: "urgent",
    department: "Medical",
    requirements: ["Current RN License", "CPR Certification", "2+ years experience"],
    shiftType: "Day Shift",
    census: 24
  },
  {
    id: 2,
    position: "Licensed Practical Nurse (LPN)",
    facility: "Golden Years Care Center",
    startTime: "2025-06-18T18:00:00Z",
    endTime: "2025-06-19T06:00:00Z",
    hourlyRate: 32,
    priority: "high",
    department: "Memory Care",
    requirements: ["Current LPN License", "Memory Care Experience"],
    shiftType: "Night Shift",
    census: 18
  },
  {
    id: 3,
    position: "Certified Nursing Assistant (CNA)",
    facility: "Harmony Health Center",
    startTime: "2025-06-19T14:00:00Z",
    endTime: "2025-06-19T22:00:00Z",
    hourlyRate: 22,
    priority: "medium",
    department: "Assisted Living",
    requirements: ["Current CNA License", "Medication Administration"],
    shiftType: "Evening Shift",
    census: 32
  },
  {
    id: 4,
    position: "Physical Therapist",
    facility: "Rehabilitation Center East",
    startTime: "2025-06-20T08:00:00Z",
    endTime: "2025-06-20T16:00:00Z",
    hourlyRate: 55,
    priority: "medium",
    department: "Rehabilitation",
    requirements: ["PT License", "Geriatric Experience"],
    shiftType: "Day Shift",
    census: 15
  }
];

export default function OpenShiftsPage() {
  const { user } = useAuth();
  const [filter, setFilter] = useState("all");

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "urgent": return "bg-red-100 text-red-800 border-red-200";
      case "high": return "bg-orange-100 text-orange-800 border-orange-200";
      case "medium": return "bg-yellow-100 text-yellow-800 border-yellow-200";
      default: return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const filteredShifts = filter === "all" ? mockOpenShifts : 
    mockOpenShifts.filter(shift => shift.priority === filter);

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      <SidebarNav user={user!} />
      <div className="flex-1 overflow-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Open Shifts</h1>
              <p className="text-gray-600 dark:text-gray-300">Available shifts requiring immediate staffing</p>
            </div>
            <div className="flex gap-2">
              <Button variant={filter === "all" ? "default" : "outline"} 
                      onClick={() => setFilter("all")} size="sm">
                All ({mockOpenShifts.length})
              </Button>
              <Button variant={filter === "urgent" ? "default" : "outline"} 
                      onClick={() => setFilter("urgent")} size="sm">
                Urgent ({mockOpenShifts.filter(s => s.priority === "urgent").length})
              </Button>
              <Button variant={filter === "high" ? "default" : "outline"} 
                      onClick={() => setFilter("high")} size="sm">
                High Priority ({mockOpenShifts.filter(s => s.priority === "high").length})
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredShifts.map((shift) => (
              <Card key={shift.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">{shift.position}</CardTitle>
                      <CardDescription className="flex items-center gap-1 mt-1">
                        <MapPin className="w-3 h-3" />
                        {shift.facility}
                      </CardDescription>
                    </div>
                    <Badge className={getPriorityColor(shift.priority)}>
                      {shift.priority}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-gray-500" />
                      <div>
                        <div className="font-medium">{shift.shiftType}</div>
                        <div className="text-gray-500">
                          {new Date(shift.startTime).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <DollarSign className="w-4 h-4 text-gray-500" />
                      <div>
                        <div className="font-medium">${shift.hourlyRate}/hr</div>
                        <div className="text-gray-500">
                          {((new Date(shift.endTime).getTime() - new Date(shift.startTime).getTime()) / (1000 * 60 * 60) * shift.hourlyRate).toFixed(0)} total
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="text-sm">
                      <span className="font-medium">Department:</span> {shift.department}
                    </div>
                    <div className="text-sm">
                      <span className="font-medium">Census:</span> {shift.census} residents
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="text-sm font-medium">Requirements:</div>
                    <div className="flex flex-wrap gap-1">
                      {shift.requirements.map((req, index) => (
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
              <p className="text-gray-500">
                Check back later for new opportunities
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}