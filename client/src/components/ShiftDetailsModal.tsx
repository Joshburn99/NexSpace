import { useState } from "react";
import { useShifts } from "@/contexts/ShiftContext";
import { useStaff } from "@/contexts/StaffContext";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Clock, 
  MapPin, 
  DollarSign, 
  Users, 
  Calendar,
  CheckCircle,
  User,
  Phone,
  Mail,
  Award
} from "lucide-react";

interface ShiftDetailsModalProps {
  shiftId: number | null;
  isOpen: boolean;
  onClose: () => void;
}

export function ShiftDetailsModal({ shiftId, isOpen, onClose }: ShiftDetailsModalProps) {
  const { getShiftById, assignStaffToShift } = useShifts();
  const { compliantStaff } = useStaff();
  const [selectedStaffId, setSelectedStaffId] = useState<number | null>(null);

  const shift = shiftId ? getShiftById(shiftId) : null;

  if (!shift) return null;

  const handleAssignStaff = async (staffId: number) => {
    await assignStaffToShift(shift.id, staffId);
    onClose();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "open":
        return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200";
      case "requested":
        return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200";
      case "assigned":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "completed":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200";
    }
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case "critical":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
      case "high":
        return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200";
      case "medium":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
      case "low":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200";
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            {shift.title}
          </DialogTitle>
          <DialogDescription>
            Shift details and staff assignment
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Shift Overview */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Shift Overview</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-gray-500" />
                  <span className="text-sm">
                    <strong>{shift.facilityName}</strong> • {shift.department}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-gray-500" />
                  <span className="text-sm">
                    {shift.date} • {shift.startTime} - {shift.endTime}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-gray-500" />
                  <span className="text-sm">
                    ${shift.rate}/hr (Premium: {shift.premiumMultiplier}x)
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-gray-500" />
                  <span className="text-sm">
                    {shift.requiredStaff} staff required
                  </span>
                </div>
              </div>

              <div className="flex gap-2">
                <Badge className={getStatusColor(shift.status)}>
                  {shift.status.toUpperCase()}
                </Badge>
                <Badge className={getUrgencyColor(shift.urgency)}>
                  {shift.urgency.toUpperCase()}
                </Badge>
              </div>

              {shift.description && (
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {shift.description}
                </p>
              )}

              {shift.specialRequirements.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium mb-2">Special Requirements:</h4>
                  <div className="flex flex-wrap gap-1">
                    {shift.specialRequirements.map((req, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {req}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Available Staff */}
          {shift.status === "open" || shift.status === "requested" ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Available Compliant Staff</CardTitle>
              </CardHeader>
              <CardContent>
                {compliantStaff.length === 0 ? (
                  <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                    No compliant staff available for assignment
                  </p>
                ) : (
                  <div className="space-y-3">
                    {compliantStaff.slice(0, 5).map((staff) => (
                      <div 
                        key={staff.id} 
                        className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10">
                            <AvatarFallback className="bg-blue-600 text-white">
                              {staff.firstName[0]}{staff.lastName[0]}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">
                              {staff.firstName} {staff.lastName}
                            </p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              {staff.role} • {staff.activeCredentials} active credentials
                            </p>
                          </div>
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        </div>
                        <Button
                          onClick={() => handleAssignStaff(staff.id)}
                          size="sm"
                          className="bg-blue-600 hover:bg-blue-700"
                        >
                          Assign
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ) : null}

          {/* Assigned Staff */}
          {shift.assignedStaffIds.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Assigned Staff</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {shift.assignedStaffIds.map((staffId) => {
                    const staff = compliantStaff.find(s => s.id === staffId);
                    if (!staff) return null;
                    
                    return (
                      <div 
                        key={staffId} 
                        className="flex items-center gap-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg"
                      >
                        <Avatar className="h-10 w-10">
                          <AvatarFallback className="bg-green-600 text-white">
                            {staff.firstName[0]}{staff.lastName[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <p className="font-medium text-gray-900 dark:text-white">
                            {staff.firstName} {staff.lastName}
                          </p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {staff.role} • {staff.email}
                          </p>
                        </div>
                        <CheckCircle className="h-5 w-5 text-green-600" />
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}