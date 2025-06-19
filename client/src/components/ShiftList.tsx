import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, Clock, MapPin, Users, Plus, ChevronRight } from "lucide-react";
import { format } from "date-fns";

interface Shift {
  id: number;
  facilityName: string;
  department: string;
  position: string;
  startTime: string;
  endTime: string;
  duration: string;
  rate: number;
  status: 'open' | 'applied' | 'confirmed' | 'completed';
  urgency?: 'high' | 'medium' | 'low';
  requirements?: string[];
}

interface ShiftListProps {
  status: 'upcoming' | 'open';
}

export function ShiftList({ status }: ShiftListProps) {
  const { user } = useAuth();
  
  const { data: shifts, isLoading } = useQuery<Shift[]>({
    queryKey: [`/api/shifts?status=${status}`]
  });

  const getUrgencyColor = (urgency?: string) => {
    switch (urgency) {
      case 'high':
        return 'bg-red-100 text-red-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'low':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (shiftStatus: string) => {
    switch (shiftStatus) {
      case 'confirmed':
        return 'bg-green-100 text-green-800';
      case 'applied':
        return 'bg-blue-100 text-blue-800';
      case 'open':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const title = status === 'upcoming' ? 'Upcoming Shifts' : 'Open Shifts';
  const emptyMessage = status === 'upcoming' 
    ? 'No upcoming shifts scheduled'
    : 'No open shifts available';

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center space-x-2">
            <Calendar className="w-5 h-5" />
            <span>{title}</span>
          </CardTitle>
          {status === 'upcoming' && (
            <Button variant="outline" size="sm">
              <Calendar className="w-4 h-4 mr-2" />
              View Calendar
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {shifts?.slice(0, 5).map((shift) => (
            <div key={shift.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h4 className="font-medium text-gray-900">{shift.position}</h4>
                  <div className="flex items-center space-x-2 text-sm text-gray-600 mt-1">
                    <MapPin className="w-3 h-3" />
                    <span>{shift.facilityName}</span>
                    <span>•</span>
                    <span>{shift.department}</span>
                  </div>
                </div>
                <div className="flex flex-col items-end space-y-1">
                  <Badge className={getStatusColor(shift.status)}>
                    {shift.status}
                  </Badge>
                  {shift.urgency && (
                    <Badge className={getUrgencyColor(shift.urgency)} variant="outline">
                      {shift.urgency} priority
                    </Badge>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-3">
                <div className="flex items-center space-x-2 text-sm">
                  <Clock className="w-4 h-4 text-gray-400" />
                  <span>{format(new Date(shift.startTime), 'MMM d')}</span>
                  <span>{shift.duration}</span>
                </div>
                <div className="text-sm font-medium text-right">
                  ${shift.rate}/hour
                </div>
              </div>

              <div className="flex items-center space-x-2 text-xs text-gray-600 mb-3">
                <span>{format(new Date(shift.startTime), 'h:mm a')}</span>
                <span>—</span>
                <span>{format(new Date(shift.endTime), 'h:mm a')}</span>
              </div>

              {shift.requirements && shift.requirements.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-3">
                  {shift.requirements.slice(0, 3).map((req, index) => (
                    <Badge key={index} variant="outline" className="text-xs">
                      {req}
                    </Badge>
                  ))}
                  {shift.requirements.length > 3 && (
                    <Badge variant="outline" className="text-xs">
                      +{shift.requirements.length - 3} more
                    </Badge>
                  )}
                </div>
              )}

              <div className="flex justify-between items-center">
                {status === 'upcoming' ? (
                  <div className="flex space-x-2">
                    <Button variant="outline" size="sm">View Details</Button>
                    <Button variant="outline" size="sm">Time Clock</Button>
                  </div>
                ) : (
                  <div className="flex space-x-2">
                    <Button variant="outline" size="sm">View Details</Button>
                    <Button size="sm">Apply</Button>
                  </div>
                )}
                <ChevronRight className="w-4 h-4 text-gray-400" />
              </div>
            </div>
          ))}

          {/* Default content when no shifts are loaded */}
          {(!shifts || shifts.length === 0) && !isLoading && (
            <>
              {status === 'upcoming' ? (
                <>
                  <div className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h4 className="font-medium text-gray-900">RN - ICU</h4>
                        <div className="flex items-center space-x-2 text-sm text-gray-600 mt-1">
                          <MapPin className="w-3 h-3" />
                          <span>General Hospital</span>
                          <span>•</span>
                          <span>ICU</span>
                        </div>
                      </div>
                      <Badge className="bg-green-100 text-green-800">confirmed</Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-4 mb-3">
                      <div className="flex items-center space-x-2 text-sm">
                        <Clock className="w-4 h-4 text-gray-400" />
                        <span>Jun. 21</span>
                        <span>12 hours</span>
                      </div>
                      <div className="text-sm font-medium text-right">$45/hour</div>
                    </div>
                    <div className="flex items-center space-x-2 text-xs text-gray-600 mb-3">
                      <span>08:00 AM</span>
                      <span>—</span>
                      <span>08:00 PM</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <div className="flex space-x-2">
                        <Button variant="outline" size="sm">View Details</Button>
                        <Button variant="outline" size="sm">Time Clock</Button>
                      </div>
                      <ChevronRight className="w-4 h-4 text-gray-400" />
                    </div>
                  </div>

                  <div className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h4 className="font-medium text-gray-900">LPN - Med-Surg</h4>
                        <div className="flex items-center space-x-2 text-sm text-gray-600 mt-1">
                          <MapPin className="w-3 h-3" />
                          <span>City Clinic</span>
                          <span>•</span>
                          <span>Med-Surg</span>
                        </div>
                      </div>
                      <Badge className="bg-green-100 text-green-800">confirmed</Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-4 mb-3">
                      <div className="flex items-center space-x-2 text-sm">
                        <Clock className="w-4 h-4 text-gray-400" />
                        <span>Jun. 25</span>
                        <span>8 hours</span>
                      </div>
                      <div className="text-sm font-medium text-right">$32/hour</div>
                    </div>
                    <div className="flex items-center space-x-2 text-xs text-gray-600 mb-3">
                      <span>07:00 AM</span>
                      <span>—</span>
                      <span>03:00 PM</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <div className="flex space-x-2">
                        <Button variant="outline" size="sm">View Details</Button>
                        <Button variant="outline" size="sm">Time Clock</Button>
                      </div>
                      <ChevronRight className="w-4 h-4 text-gray-400" />
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h4 className="font-medium text-gray-900">RN - Emergency</h4>
                        <div className="flex items-center space-x-2 text-sm text-gray-600 mt-1">
                          <MapPin className="w-3 h-3" />
                          <span>Metro Hospital</span>
                          <span>•</span>
                          <span>Emergency</span>
                        </div>
                      </div>
                      <div className="flex flex-col items-end space-y-1">
                        <Badge className="bg-gray-100 text-gray-800">open</Badge>
                        <Badge className="bg-red-100 text-red-800" variant="outline">high priority</Badge>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 mb-3">
                      <div className="flex items-center space-x-2 text-sm">
                        <Clock className="w-4 h-4 text-gray-400" />
                        <span>Jun. 20</span>
                        <span>12 hours</span>
                      </div>
                      <div className="text-sm font-medium text-right">$52/hour</div>
                    </div>
                    <div className="flex items-center space-x-2 text-xs text-gray-600 mb-3">
                      <span>08:00 AM</span>
                      <span>—</span>
                      <span>08:00 PM</span>
                    </div>
                    <div className="flex flex-wrap gap-1 mb-3">
                      <Badge variant="outline" className="text-xs">BLS</Badge>
                      <Badge variant="outline" className="text-xs">ACLS</Badge>
                      <Badge variant="outline" className="text-xs">2+ years exp</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <div className="flex space-x-2">
                        <Button variant="outline" size="sm">View Details</Button>
                        <Button size="sm">Apply</Button>
                      </div>
                      <ChevronRight className="w-4 h-4 text-gray-400" />
                    </div>
                  </div>

                  <div className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h4 className="font-medium text-gray-900">CNA - Memory Care</h4>
                        <div className="flex items-center space-x-2 text-sm text-gray-600 mt-1">
                          <MapPin className="w-3 h-3" />
                          <span>Sunrise Senior Living</span>
                          <span>•</span>
                          <span>Memory Care</span>
                        </div>
                      </div>
                      <Badge className="bg-gray-100 text-gray-800">open</Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-4 mb-3">
                      <div className="flex items-center space-x-2 text-sm">
                        <Clock className="w-4 h-4 text-gray-400" />
                        <span>Jun. 22</span>
                        <span>8 hours</span>
                      </div>
                      <div className="text-sm font-medium text-right">$28/hour</div>
                    </div>
                    <div className="flex items-center space-x-2 text-xs text-gray-600 mb-3">
                      <span>11:00 PM</span>
                      <span>—</span>
                      <span>07:00 AM</span>
                    </div>
                    <div className="flex flex-wrap gap-1 mb-3">
                      <Badge variant="outline" className="text-xs">CNA License</Badge>
                      <Badge variant="outline" className="text-xs">Dementia Care</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <div className="flex space-x-2">
                        <Button variant="outline" size="sm">View Details</Button>
                        <Button size="sm">Apply</Button>
                      </div>
                      <ChevronRight className="w-4 h-4 text-gray-400" />
                    </div>
                  </div>
                </>
              )}
            </>
          )}

          <Button variant="outline" className="w-full">
            {status === 'upcoming' ? 'View All Shifts' : 'Browse All Open Shifts'}
            <ChevronRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}