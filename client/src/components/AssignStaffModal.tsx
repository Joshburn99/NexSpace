import { useState } from "react";
import { useStaff } from "@/contexts/StaffContext";
import { useShifts } from "@/contexts/ShiftContext";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { CheckCircle, User } from "lucide-react";

interface AssignStaffModalProps {
  shiftId: number | null;
  isOpen: boolean;
  onClose: () => void;
}

export function AssignStaffModal({ shiftId, isOpen, onClose }: AssignStaffModalProps) {
  const { compliantStaff } = useStaff();
  const { assignStaffToShift, shifts } = useShifts();
  
  const getShiftById = (id: number) => shifts.find(shift => shift.id === id);
  const [selectedStaffId, setSelectedStaffId] = useState<string>("");
  const [isAssigning, setIsAssigning] = useState(false);

  const shift = shiftId ? getShiftById(shiftId) : null;

  const handleAssign = async () => {
    if (!selectedStaffId || !shiftId) return;

    setIsAssigning(true);
    try {
      await assignStaffToShift(shiftId, parseInt(selectedStaffId));
      onClose();
      setSelectedStaffId("");
    } catch (error) {
      console.error("Failed to assign staff:", error);
    } finally {
      setIsAssigning(false);
    }
  };

  const handleClose = () => {
    setSelectedStaffId("");
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Assign Staff to Shift
          </DialogTitle>
          <DialogDescription>
            {shift && (
              <>
                <strong>{shift.title}</strong> at {shift.facilityName}
                <br />
                {new Date(shift.date).toLocaleDateString()} • {shift.startTime} - {shift.endTime}
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
              Select Compliant Staff Member
            </label>
            <Select value={selectedStaffId} onValueChange={setSelectedStaffId}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a staff member" />
              </SelectTrigger>
              <SelectContent>
                {compliantStaff.map((staff) => (
                  <SelectItem key={staff.id} value={staff.id.toString()}>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-6 w-6">
                        <AvatarFallback className="text-xs">
                          {staff.firstName[0]}{staff.lastName[0]}
                        </AvatarFallback>
                      </Avatar>
                      <span>{staff.firstName} {staff.lastName}</span>
                      <Badge variant="outline" className="text-xs">
                        {staff.role}
                      </Badge>
                      <CheckCircle className="h-3 w-3 text-green-600" />
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {compliantStaff.length === 0 && (
            <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
              <p className="text-sm text-yellow-800 dark:text-yellow-200">
                No compliant staff members available. All staff must have active credentials to be assigned to shifts.
              </p>
            </div>
          )}

          <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Only staff members with active credentials and no expiring credentials are shown.
              Total compliant staff: {compliantStaff.length}
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button 
            onClick={handleAssign} 
            disabled={!selectedStaffId || isAssigning || compliantStaff.length === 0}
          >
            {isAssigning ? "Assigning..." : "Assign Staff"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}