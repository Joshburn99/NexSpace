import React, { useState } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Calendar,
  Clock,
  Users,
  Building,
  MapPin,
  DollarSign,
  Briefcase,
  FileText,
  User,
  AlertCircle,
  CheckCircle,
  XCircle,
  Loader2
} from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { 
  safelyFormat, 
  safelyFormatInTimezone,
  formatRange, 
  formatDuration,
  getDateLabel,
  normalizeShiftEvent
} from '@/lib/datetime';

interface ShiftDetailsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  shift: any;
  onSuccess?: () => void;
}

const getStatusColor = (status: string) => {
  switch (status) {
    case 'filled': return 'default';
    case 'pending': return 'secondary';
    case 'cancelled': return 'destructive';
    default: return 'outline';
  }
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'filled': return <CheckCircle className="w-4 h-4" />;
    case 'pending': return <AlertCircle className="w-4 h-4" />;
    case 'cancelled': return <XCircle className="w-4 h-4" />;
    default: return <Clock className="w-4 h-4" />;
  }
};

export function ShiftDetailsModal({ 
  open, 
  onOpenChange, 
  shift: rawShift,
  onSuccess 
}: ShiftDetailsModalProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedStaffId, setSelectedStaffId] = useState<string>('');
  
  // Normalize the shift data
  const shift = rawShift ? normalizeShiftEvent(rawShift) : null;
  
  // Check permissions
  const isAdmin = user?.role === 'super_admin' || user?.role === 'facility_admin';
  const isStaff = user?.role === 'staff' || user?.role === 'clinician';
  
  // Assign staff mutation
  const assignMutation = useMutation({
    mutationFn: async (staffId: number) => {
      const response = await apiRequest('POST', `/api/shifts/${shift?.id}/assign`, { staffId });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to assign staff');
      }
      return response.json();
    },
    onSuccess: () => {
      toast({ 
        title: 'Success', 
        description: 'Staff assigned successfully' 
      });
      queryClient.invalidateQueries({ queryKey: ['/api/shifts'] });
      queryClient.invalidateQueries({ queryKey: ['/api/calendar/shifts'] });
      onSuccess?.();
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({ 
        title: 'Error', 
        description: error.message, 
        variant: 'destructive' 
      });
    }
  });
  
  // Unassign staff mutation
  const unassignMutation = useMutation({
    mutationFn: async (staffId: number) => {
      const response = await apiRequest('POST', `/api/shifts/${shift?.id}/unassign`, { staffId });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to unassign staff');
      }
      return response.json();
    },
    onSuccess: () => {
      toast({ 
        title: 'Success', 
        description: 'Staff unassigned successfully' 
      });
      queryClient.invalidateQueries({ queryKey: ['/api/shifts'] });
      queryClient.invalidateQueries({ queryKey: ['/api/calendar/shifts'] });
      onSuccess?.();
    },
    onError: (error: Error) => {
      toast({ 
        title: 'Error', 
        description: error.message, 
        variant: 'destructive' 
      });
    }
  });
  
  // Cancel shift mutation
  const cancelMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', `/api/shifts/${shift?.id}/cancel`);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to cancel shift');
      }
      return response.json();
    },
    onSuccess: () => {
      toast({ 
        title: 'Success', 
        description: 'Shift cancelled successfully' 
      });
      queryClient.invalidateQueries({ queryKey: ['/api/shifts'] });
      queryClient.invalidateQueries({ queryKey: ['/api/calendar/shifts'] });
      onSuccess?.();
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({ 
        title: 'Error', 
        description: error.message, 
        variant: 'destructive' 
      });
    }
  });
  
  // Request shift mutation (for staff)
  const requestMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', `/api/shifts/${shift?.id}/request`);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to request shift');
      }
      return response.json();
    },
    onSuccess: () => {
      toast({ 
        title: 'Success', 
        description: 'Shift request submitted successfully' 
      });
      queryClient.invalidateQueries({ queryKey: ['/api/shifts'] });
      queryClient.invalidateQueries({ queryKey: ['/api/calendar/shifts'] });
      onSuccess?.();
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({ 
        title: 'Error', 
        description: error.message, 
        variant: 'destructive' 
      });
    }
  });
  
  if (!shift) return null;
  
  const isPending = assignMutation.isPending || 
                   unassignMutation.isPending || 
                   cancelMutation.isPending || 
                   requestMutation.isPending;
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Shift Details</span>
            <Badge variant={getStatusColor(shift.status)} className="flex items-center gap-1">
              {getStatusIcon(shift.status)}
              {shift.status.charAt(0).toUpperCase() + shift.status.slice(1)}
            </Badge>
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Header Info */}
          <div>
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Briefcase className="w-5 h-5" />
              {shift.specialty || shift.role}
            </h3>
            <p className="text-sm text-muted-foreground flex items-center gap-2 mt-1">
              <Building className="w-4 h-4" />
              {shift.facilityName}
              {shift.department && ` • ${shift.department}`}
            </p>
          </div>
          
          {/* Time & Date Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <span className="font-medium">Date:</span>
                <span>{getDateLabel(shift.startUtc)}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <span className="font-medium">Time:</span>
                <span className="font-mono">
                  {formatRange(shift.startUtc, shift.endUtc, shift.timezone)}
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <span className="font-medium">Duration:</span>
                <span>{formatDuration(shift.startUtc, shift.endUtc)}</span>
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <MapPin className="w-4 h-4 text-muted-foreground" />
                <span className="font-medium">Timezone:</span>
                <span>{shift.timezone}</span>
              </div>
              {shift.rate && (
                <div className="flex items-center gap-2 text-sm">
                  <DollarSign className="w-4 h-4 text-muted-foreground" />
                  <span className="font-medium">Rate:</span>
                  <span className="font-mono">${shift.rate}/hr</span>
                </div>
              )}
            </div>
          </div>
          
          {/* Staffing Info */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-medium flex items-center gap-2">
                <Users className="w-4 h-4" />
                Staffing
              </h4>
              <span className="text-sm font-mono">
                {shift.filledCount}/{shift.requiredCount} filled
              </span>
            </div>
            
            {/* Progress bar */}
            <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
              <div 
                className={`h-2.5 rounded-full ${
                  shift.filledCount >= shift.requiredCount 
                    ? 'bg-green-500' 
                    : shift.filledCount > 0 
                    ? 'bg-yellow-500' 
                    : 'bg-gray-400'
                }`}
                style={{ width: `${Math.min(100, (shift.filledCount / shift.requiredCount) * 100)}%` }}
              />
            </div>
            
            {/* Assigned staff */}
            {shift.assignedStaffName && (
              <Alert>
                <User className="w-4 h-4" />
                <AlertDescription>
                  Assigned to: <strong>{shift.assignedStaffName}</strong>
                </AlertDescription>
              </Alert>
            )}
          </div>
          
          {/* Notes */}
          {shift.notes && (
            <div className="space-y-2">
              <h4 className="font-medium flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Notes
              </h4>
              <p className="text-sm text-muted-foreground bg-muted/50 p-3 rounded">
                {shift.notes}
              </p>
            </div>
          )}
          
          {/* Full Time Details */}
          <div className="text-xs text-muted-foreground space-y-1 pt-2 border-t">
            <p>
              <span className="font-medium">Start:</span>{' '}
              {safelyFormatInTimezone(shift.startUtc, shift.timezone, 'PPpp')}
            </p>
            <p>
              <span className="font-medium">End:</span>{' '}
              {safelyFormatInTimezone(shift.endUtc, shift.timezone, 'PPpp')}
            </p>
          </div>
        </div>
        
        <DialogFooter className="flex flex-col sm:flex-row gap-2">
          {/* Admin Actions */}
          {isAdmin && shift.status !== 'cancelled' && (
            <>
              {shift.filledCount < shift.requiredCount && (
                <Button
                  onClick={() => {/* TODO: Open staff selector */}}
                  disabled={isPending}
                  className="flex-1"
                >
                  <Users className="w-4 h-4 mr-2" />
                  Assign Staff
                </Button>
              )}
              {shift.assignedStaffId && (
                <Button
                  variant="outline"
                  onClick={() => {
                    if (shift.assignedStaffId) {
                      unassignMutation.mutate(shift.assignedStaffId);
                    }
                  }}
                  disabled={isPending}
                  className="flex-1"
                >
                  <User className="w-4 h-4 mr-2" />
                  Unassign
                </Button>
              )}
              <Button
                variant="destructive"
                onClick={() => cancelMutation.mutate()}
                disabled={isPending}
                className="flex-1"
              >
                <XCircle className="w-4 h-4 mr-2" />
                Cancel Shift
              </Button>
            </>
          )}
          
          {/* Staff Actions */}
          {isStaff && shift.status === 'open' && (
            <Button
              onClick={() => requestMutation.mutate()}
              disabled={isPending}
              className="w-full"
            >
              {isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Requesting...
                </>
              ) : (
                <>
                  <Users className="w-4 h-4 mr-2" />
                  Request This Shift
                </>
              )}
            </Button>
          )}
          
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}