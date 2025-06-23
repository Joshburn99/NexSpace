import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Clock, 
  MapPin, 
  Users, 
  Star, 
  Shield, 
  UserPlus,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import type { Shift, User, Facility } from '../types';
import { formatShiftTime, calculateShiftDuration } from '../utils/shiftUtils';
import { getUserFullName, getUserInitials } from '../utils/userUtils';

interface ShiftDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  shift: Shift | null;
  facility: Facility | null;
  assignedWorkers: User[];
  requestedWorkers: User[];
  onAssignWorker: (shiftId: string, workerId: string) => void;
  onUnassignWorker: (shiftId: string, workerId: string) => void;
}

const ShiftDetailModal: React.FC<ShiftDetailModalProps> = ({
  isOpen,
  onClose,
  shift,
  facility,
  assignedWorkers,
  requestedWorkers,
  onAssignWorker,
  onUnassignWorker
}) => {
  const [isAssigning, setIsAssigning] = useState<string | null>(null);

  if (!shift || !facility) return null;

  const canAssignMore = assignedWorkers.length < shift.requiredWorkers;
  const spotsRemaining = shift.requiredWorkers - assignedWorkers.length;
  const shiftDuration = calculateShiftDuration(shift);
  const isFullyStaffed = assignedWorkers.length >= shift.requiredWorkers;

  const handleAssignWorker = async (workerId: string) => {
    setIsAssigning(workerId);
    try {
      await onAssignWorker(shift.id, workerId);
    } finally {
      setIsAssigning(null);
    }
  };

  const handleUnassignWorker = async (workerId: string) => {
    setIsAssigning(workerId);
    try {
      await onUnassignWorker(shift.id, workerId);
    } finally {
      setIsAssigning(null);
    }
  };

  const getReliabilityColor = (reliability: number) => {
    if (reliability >= 0.9) return 'text-green-600';
    if (reliability >= 0.7) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getRatingStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`h-3 w-3 ${
          i < rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
        }`}
      />
    ));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Badge variant="outline">{shift.specialty}</Badge>
            {shift.title}
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(90vh-8rem)]">
          <div className="space-y-6">
            {/* Shift Overview */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{formatShiftTime(shift)}</span>
                  <Badge variant="secondary">{shiftDuration}h</Badge>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span>{facility.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span>
                    {shift.filledPositions || 0}/{shift.totalPositions || shift.requiredWorkers} workers assigned
                  </span>
                  {isFullyStaffed ? (
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-orange-500" />
                  )}
                </div>
              </div>

              <div className="space-y-2">
                {shift.payRate && (
                  <div className="text-sm">
                    <span className="font-medium">Pay Rate:</span> ${shift.payRate}/hour
                  </div>
                )}
                <div className="text-sm">
                  <span className="font-medium">Status:</span>
                  <Badge variant={isFullyStaffed ? "default" : "destructive"} className="ml-2">
                    {isFullyStaffed ? 'Fully Staffed' : `${spotsRemaining} spots open`}
                  </Badge>
                </div>
                {shift.description && (
                  <div className="text-sm text-muted-foreground">
                    {shift.description}
                  </div>
                )}
              </div>
            </div>

            {shift.requirements && shift.requirements.length > 0 && (
              <div>
                <h4 className="font-medium mb-2">Requirements</h4>
                <div className="flex flex-wrap gap-1">
                  {shift.requirements.map((req, index) => (
                    <Badge key={index} variant="outline" className="text-xs">
                      {req}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            <Separator />

            {/* Currently Assigned Workers */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Assigned Workers ({shift.filledPositions || 0}/{shift.totalPositions || shift.requiredWorkers})
                </h3>
                <Badge variant={shift.filledPositions && shift.filledPositions > 0 ? "default" : "secondary"}>
                  {shift.filledPositions || 0}/{shift.totalPositions || shift.requiredWorkers} Filled
                </Badge>
              </div>

              {(!shift.assignedStaff || shift.assignedStaff.length === 0) ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No workers assigned to this shift</p>
                  <p className="text-sm">Assign workers from the requests below</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {(shift.assignedStaff || []).map(worker => (
                    <div
                      key={worker.id}
                      className="flex items-center gap-3 p-3 border rounded-lg bg-green-50 border-green-200"
                    >
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={worker.avatar} />
                        <AvatarFallback>
                          {worker.firstName?.[0]}{worker.lastName?.[0]}
                        </AvatarFallback>
                      </Avatar>
                      
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">
                          {worker.name || `${worker.firstName} ${worker.lastName}`}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {worker.specialty}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <div className="flex items-center">
                            {getRatingStars(Math.floor(worker.rating || 4))}
                            <span className="text-xs text-muted-foreground ml-1">
                              {(worker.rating || 4).toFixed(1)}
                            </span>
                          </div>
                          <div className={`text-xs font-medium ${getReliabilityColor(0.95)}`}>
                            95% reliable
                          </div>
                        </div>
                      </div>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleUnassignWorker(worker.id)}
                        disabled={isAssigning === worker.id}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        Remove
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <Separator />

            {/* Shift Requests */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <UserPlus className="h-5 w-5" />
                  Shift Requests ({requestedWorkers.length})
                </h3>
                {!canAssignMore && (
                  <Badge variant="secondary">Shift is fully staffed</Badge>
                )}
              </div>

              {requestedWorkers.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <UserPlus className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No pending shift requests</p>
                  <p className="text-sm">Workers will appear here when they request this shift</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {requestedWorkers.map(worker => (
                    <div
                      key={worker.id}
                      className={`flex items-center gap-3 p-3 border rounded-lg transition-opacity ${
                        !canAssignMore ? 'opacity-50 bg-gray-50' : 'bg-white hover:bg-gray-50'
                      }`}
                    >
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={worker.avatar} />
                        <AvatarFallback>{getUserInitials(worker)}</AvatarFallback>
                      </Avatar>
                      
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">
                          {getUserFullName(worker)}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {worker.specialty}
                          {worker.phoneNumber && ` • ${worker.phoneNumber}`}
                        </div>
                        <div className="flex items-center gap-4 mt-1">
                          <div className="flex items-center">
                            {getRatingStars(4)}
                            <span className="text-xs text-muted-foreground ml-1">
                              4.2
                            </span>
                          </div>
                          <div className={`text-xs font-medium ${getReliabilityColor(0.88)}`}>
                            88% reliable
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm">
                          View Profile
                        </Button>
                        <Button
                          onClick={() => handleAssignWorker(worker.id)}
                          disabled={!canAssignMore || isAssigning === worker.id}
                          size="sm"
                          className="bg-green-600 hover:bg-green-700"
                        >
                          {isAssigning === worker.id ? 'Assigning...' : 'Assign'}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Status Summary */}
            <div className="bg-muted/50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-sm font-medium">Staffing Status:</span>
                  <span className={`ml-2 ${isFullyStaffed ? 'text-green-600' : 'text-orange-600'}`}>
                    {isFullyStaffed 
                      ? 'Fully staffed and ready'
                      : `${spotsRemaining} ${spotsRemaining === 1 ? 'position' : 'positions'} remaining`
                    }
                  </span>
                </div>
                {!isFullyStaffed && requestedWorkers.length > 0 && (
                  <Badge variant="outline" className="bg-blue-50">
                    {requestedWorkers.length} workers available to assign
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

export default ShiftDetailModal;