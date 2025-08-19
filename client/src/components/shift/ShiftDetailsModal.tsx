
import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Clock,
  MapPin,
  DollarSign,
  Users,
  AlertTriangle,
  CheckCircle,
  XCircle,
  User,
  Building,
  Calendar,
  Edit,
  Trash2,
  UserCheck,
  UserX,
  MessageSquare,
  FileText,
  Activity,
} from "lucide-react";
import { format } from "date-fns";

interface ShiftDetailsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  shift: any | null;
  onSuccess?: () => void;
}

export function ShiftDetailsModal({ open, onOpenChange, shift, onSuccess }: ShiftDetailsModalProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [selectedStaffId, setSelectedStaffId] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [activeTab, setActiveTab] = useState("details");

  // Mutations for different actions
  const assignStaffMutation = useMutation({
    mutationFn: async ({ shiftId, staffId }: { shiftId: number; staffId: number }) => {
      const response = await fetch(`/api/shifts/${shiftId}/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ staffId }),
      });
      if (!response.ok) throw new Error('Failed to assign staff');
      return response.json();
    },
    onSuccess: () => {
      toast({ title: 'Success', description: 'Staff assigned successfully' });
      queryClient.invalidateQueries({ queryKey: ['/api/calendar/shifts'] });
      onSuccess?.();
    },
  });

  const unassignStaffMutation = useMutation({
    mutationFn: async ({ shiftId, staffId }: { shiftId: number; staffId: number }) => {
      const response = await fetch(`/api/shifts/${shiftId}/unassign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ staffId }),
      });
      if (!response.ok) throw new Error('Failed to unassign staff');
      return response.json();
    },
    onSuccess: () => {
      toast({ title: 'Success', description: 'Staff unassigned successfully' });
      queryClient.invalidateQueries({ queryKey: ['/api/calendar/shifts'] });
      onSuccess?.();
    },
  });

  const cancelShiftMutation = useMutation({
    mutationFn: async (shiftId: number) => {
      const response = await fetch(`/api/shifts/${shiftId}/cancel`, {
        method: 'POST',
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to cancel shift');
      return response.json();
    },
    onSuccess: () => {
      toast({ title: 'Success', description: 'Shift cancelled successfully' });
      queryClient.invalidateQueries({ queryKey: ['/api/calendar/shifts'] });
      onOpenChange(false);
      onSuccess?.();
    },
  });

  const requestShiftMutation = useMutation({
    mutationFn: async (shiftId: number) => {
      const response = await fetch(`/api/shifts/${shiftId}/request`, {
        method: 'POST',
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to request shift');
      return response.json();
    },
    onSuccess: () => {
      toast({ title: 'Success', description: 'Shift request submitted successfully' });
      queryClient.invalidateQueries({ queryKey: ['/api/calendar/shifts'] });
      onSuccess?.();
    },
  });

  if (!shift) return null;

  const isStaff = user?.role === 'staff';
  const isFacilityAdmin = ['facility_admin', 'facility_manager'].includes(user?.role || '');
  const isSuperAdmin = user?.role === 'super_admin';
  const canManageShift = isFacilityAdmin || isSuperAdmin;
  const canRequestShift = isStaff && shift.status === 'open';

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'open': return <AlertTriangle className="w-4 h-4 text-orange-500" />;
      case 'pending': return <Clock className="w-4 h-4 text-yellow-500" />;
      case 'filled': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'cancelled': return <XCircle className="w-4 h-4 text-red-500" />;
      default: return null;
    }
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'critical': return 'destructive';
      case 'high': return 'destructive';
      case 'medium': return 'default';
      case 'low': return 'secondary';
      default: return 'secondary';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {getStatusIcon(shift.status)}
            {shift.title}
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="details">Shift Details</TabsTrigger>
            {canManageShift && <TabsTrigger value="staffing">Staffing</TabsTrigger>}
            <TabsTrigger value="activity">Activity Log</TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="space-y-6">
            {/* Basic Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Building className="w-4 h-4 text-gray-500" />
                  <div>
                    <p className="text-sm text-gray-500">Facility</p>
                    <p className="font-medium">{shift.facilityName}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-gray-500" />
                  <div>
                    <p className="text-sm text-gray-500">Department</p>
                    <p className="font-medium">{shift.department}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-gray-500" />
                  <div>
                    <p className="text-sm text-gray-500">Specialty</p>
                    <p className="font-medium">{shift.specialty}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-gray-500" />
                  <div>
                    <p className="text-sm text-gray-500">Date</p>
                    <p className="font-medium">{format(new Date(shift.date), 'EEEE, MMMM dd, yyyy')}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-gray-500" />
                  <div>
                    <p className="text-sm text-gray-500">Time</p>
                    <p className="font-medium">{shift.startTime} - {shift.endTime}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-gray-500" />
                  <div>
                    <p className="text-sm text-gray-500">Rate</p>
                    <p className="font-medium">${shift.rate}/hour</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-gray-500" />
                  <div>
                    <p className="text-sm text-gray-500">Staffing</p>
                    <p className="font-medium">
                      {shift.assignedStaffIds?.length || 0}/{shift.requiredStaff} filled
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-gray-500" />
                  <div>
                    <p className="text-sm text-gray-500">Status & Priority</p>
                    <div className="flex gap-2">
                      <Badge variant={shift.status === 'open' ? 'destructive' : 'default'}>
                        {shift.status}
                      </Badge>
                      <Badge variant={getUrgencyColor(shift.urgency)}>
                        {shift.urgency} priority
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <Separator />

            {/* Requirements */}
            {shift.requirements && shift.requirements.length > 0 && (
              <div>
                <h3 className="font-medium mb-2 flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Requirements
                </h3>
                <div className="flex flex-wrap gap-2">
                  {shift.requirements.map((req: string, idx: number) => (
                    <Badge key={idx} variant="outline">{req}</Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Notes */}
            {shift.notes && (
              <div>
                <h3 className="font-medium mb-2 flex items-center gap-2">
                  <MessageSquare className="w-4 h-4" />
                  Notes
                </h3>
                <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded">{shift.notes}</p>
              </div>
            )}
          </TabsContent>

          {canManageShift && (
            <TabsContent value="staffing" className="space-y-6">
              {/* Assigned Staff */}
              <div>
                <h3 className="font-medium mb-3">Assigned Staff ({shift.assignedStaffIds?.length || 0})</h3>
                {shift.assignedStaffIds && shift.assignedStaffIds.length > 0 ? (
                  <div className="space-y-2">
                    {shift.assignedStaffIds.map((staffId: number) => (
                      <div key={staffId} className="flex items-center justify-between p-3 border rounded">
                        <div className="flex items-center gap-3">
                          <Avatar className="w-8 h-8">
                            <AvatarFallback>
                              {staffId.toString().slice(-2)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">Staff ID: {staffId}</p>
                            <p className="text-sm text-gray-500">Assigned</p>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => unassignStaffMutation.mutate({ shiftId: shift.id, staffId })}
                          disabled={unassignStaffMutation.isPending}
                        >
                          <UserX className="w-4 h-4 mr-1" />
                          Unassign
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-4">No staff assigned</p>
                )}
              </div>

              <Separator />

              {/* Pending Requests */}
              <div>
                <h3 className="font-medium mb-3">Pending Requests ({shift.requestedStaffIds?.length || 0})</h3>
                {shift.requestedStaffIds && shift.requestedStaffIds.length > 0 ? (
                  <div className="space-y-2">
                    {shift.requestedStaffIds.map((staffId: number) => (
                      <div key={staffId} className="flex items-center justify-between p-3 border rounded">
                        <div className="flex items-center gap-3">
                          <Avatar className="w-8 h-8">
                            <AvatarFallback>
                              {staffId.toString().slice(-2)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">Staff ID: {staffId}</p>
                            <p className="text-sm text-gray-500">Requested</p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => assignStaffMutation.mutate({ shiftId: shift.id, staffId })}
                            disabled={assignStaffMutation.isPending}
                          >
                            <UserCheck className="w-4 h-4 mr-1" />
                            Assign
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              // TODO: Implement reject request
                            }}
                          >
                            <UserX className="w-4 h-4 mr-1" />
                            Reject
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-4">No pending requests</p>
                )}
              </div>

              <Separator />

              {/* Manual Assignment */}
              <div>
                <h3 className="font-medium mb-3">Manual Assignment</h3>
                <div className="flex gap-2">
                  <Select value={selectedStaffId} onValueChange={setSelectedStaffId}>
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Select staff member..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">John Doe (RN)</SelectItem>
                      <SelectItem value="2">Jane Smith (LPN)</SelectItem>
                      <SelectItem value="3">Mike Johnson (CNA)</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    onClick={() => {
                      if (selectedStaffId) {
                        assignStaffMutation.mutate({ 
                          shiftId: shift.id, 
                          staffId: parseInt(selectedStaffId) 
                        });
                        setSelectedStaffId("");
                      }
                    }}
                    disabled={!selectedStaffId || assignStaffMutation.isPending}
                  >
                    Assign
                  </Button>
                </div>
              </div>
            </TabsContent>
          )}

          <TabsContent value="activity" className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-start gap-3 p-3 border rounded">
                <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                <div className="flex-1">
                  <p className="font-medium">Shift Created</p>
                  <p className="text-sm text-gray-500">
                    {format(new Date(shift.createdAt), 'MMM dd, yyyy at h:mm a')}
                  </p>
                </div>
              </div>

              {shift.assignedStaffIds && shift.assignedStaffIds.length > 0 && (
                <div className="flex items-start gap-3 p-3 border rounded">
                  <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                  <div className="flex-1">
                    <p className="font-medium">Staff Assigned</p>
                    <p className="text-sm text-gray-500">
                      {shift.assignedStaffIds.length} staff member(s) assigned
                    </p>
                  </div>
                </div>
              )}

              {shift.status === 'cancelled' && (
                <div className="flex items-start gap-3 p-3 border rounded">
                  <div className="w-2 h-2 bg-red-500 rounded-full mt-2"></div>
                  <div className="flex-1">
                    <p className="font-medium">Shift Cancelled</p>
                    <p className="text-sm text-gray-500">
                      {format(new Date(shift.updatedAt), 'MMM dd, yyyy at h:mm a')}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter className="flex justify-between">
          <div className="flex gap-2">
            {canRequestShift && (
              <Button
                onClick={() => requestShiftMutation.mutate(shift.id)}
                disabled={requestShiftMutation.isPending}
              >
                Request This Shift
              </Button>
            )}
          </div>

          <div className="flex gap-2">
            {canManageShift && shift.status !== 'cancelled' && (
              <>
                <Button variant="outline" size="sm">
                  <Edit className="w-4 h-4 mr-1" />
                  Edit
                </Button>
                
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" size="sm">
                      <Trash2 className="w-4 h-4 mr-1" />
                      Cancel Shift
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Cancel Shift</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to cancel this shift? This action cannot be undone.
                        Any assigned staff will be notified.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => cancelShiftMutation.mutate(shift.id)}
                        className="bg-red-600 hover:bg-red-700"
                      >
                        Yes, Cancel Shift
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </>
            )}
            
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
