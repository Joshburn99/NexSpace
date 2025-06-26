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
  const staffingInfo = getShiftStaffingRatio(shift);
  const actualAssigned = assignedWorkers.length;
  const hasRequests = requestedWorkers.length > 0;
  const isUnderstaffed = actualAssigned < shift.requiredWorkers;
  const isFullyStaffed = actualAssigned >= shift.requiredWorkers;

  const getStatusColor = () => {
    if (isFullyStaffed) return 'bg-green-100 border-green-300 text-green-800';
    if (isUnderstaffed && hasRequests) return 'bg-orange-100 border-orange-300 text-orange-800';
    if (isUnderstaffed) return 'bg-red-100 border-red-300 text-red-800';
    return 'bg-gray-100 border-gray-300 text-gray-800';
  };

  const getStaffingDisplay = () => {
    return `${actualAssigned}/${shift.requiredWorkers}`;
  };

  return (
    <div
      onClick={() => onShiftClick(shift)}
      className={`
        w-full p-2 border rounded cursor-pointer hover:shadow-sm transition-all text-xs
        ${getStatusColor()} ${className}
      `}
    >
      <div className="flex items-center justify-between">
        <span className="font-medium truncate">
          {formatShiftTime(shift)} {shift.specialty}
        </span>
        <span className="text-xs ml-1">
          ({getStaffingDisplay()})
        </span>
      </div>
    </div>
  );
};

export default ShiftCalendarCell;