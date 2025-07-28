import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Clock, Users, AlertTriangle } from 'lucide-react';
import type { Shift, User } from '../types';
import { formatShiftTime, getShiftStaffingRatio } from '../utils/shiftUtils';

interface ShiftCalendarCellProps {
  shift: Shift;
  assignedWorkers: User[];
  requestedWorkers: User[];
  onShiftClick: (shift: Shift) => void;
  className?: string;
}

const ShiftCalendarCell: React.FC<ShiftCalendarCellProps> = ({
  shift,
  assignedWorkers,
  requestedWorkers,
  onShiftClick,
  className = ''
}) => {
  // Use backend data for accurate staffing information
  const actualAssigned = shift.filledPositions || assignedWorkers.length;
  const totalRequired = shift.totalPositions || shift.requiredWorkers || 1;
  const hasRequests = requestedWorkers.length > 0;
  const isUnderstaffed = actualAssigned < totalRequired;
  const isFullyStaffed = actualAssigned >= totalRequired;

  const getStatusColor = () => {
    if (isFullyStaffed) return 'bg-green-100 hover:bg-green-200 border-green-300 text-green-800';
    if (isUnderstaffed && hasRequests) return 'bg-orange-100 hover:bg-orange-200 border-orange-300 text-orange-800';
    if (isUnderstaffed) return 'bg-red-100 hover:bg-red-200 border-red-300 text-red-800';
    return 'bg-gray-100 hover:bg-gray-200 border-gray-300 text-gray-800';
  };

  const getStaffingDisplay = () => {
    // Display format: "CNA 2/4 filled"
    return `${shift.specialty} ${actualAssigned}/${totalRequired} filled`;
  };

  return (
    <Button
      variant="outline"
      onClick={() => onShiftClick(shift)}
      className={`
        w-full h-auto p-3 flex flex-col items-start gap-2 hover:shadow-md transition-all
        ${getStatusColor()} ${className}
      `}
    >
      {/* Header with staffing info */}
      <div className="flex items-center justify-between w-full">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-sm">
            {getStaffingDisplay()}
          </span>
        </div>
        
        {/* Status indicators */}
        <div className="flex items-center gap-1">
          {hasRequests && !isFullyStaffed && (
            <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/20">
              {requestedWorkers.length} request{requestedWorkers.length > 1 ? 's' : ''}
            </Badge>
          )}
          {isUnderstaffed && !hasRequests && (
            <AlertTriangle className="h-4 w-4 text-orange-500" />
          )}
          {isFullyStaffed && (
            <Users className="h-4 w-4 text-green-600" />
          )}
        </div>
      </div>

      {/* Time and title */}
      <div className="w-full text-left">
        <div className="font-medium text-sm truncate">
          {shift.title}
        </div>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Clock className="h-3 w-3" />
          {formatShiftTime(shift)}
        </div>
      </div>

      {/* Assigned workers preview (show first 2, then +X more) */}
      {assignedWorkers.length > 0 && (
        <div className="w-full">
          <div className="text-xs text-muted-foreground mb-1">Assigned:</div>
          <div className="flex flex-wrap gap-1">
            {assignedWorkers.slice(0, 2).map(worker => (
              <Badge key={worker.id} variant="default" className="text-xs">
                {worker.firstName} {worker.lastName.charAt(0)}.
              </Badge>
            ))}
            {assignedWorkers.length > 2 && (
              <Badge variant="outline" className="text-xs">
                +{assignedWorkers.length - 2} more
              </Badge>
            )}
          </div>
        </div>
      )}

      {/* Show empty state when no workers assigned */}
      {assignedWorkers.length === 0 && (
        <div className="w-full text-xs text-muted-foreground italic">
          No workers assigned
        </div>
      )}
    </Button>
  );
};

export default ShiftCalendarCell;