import { useState, useCallback, useMemo } from 'react';
import type { Shift, User, Assignment } from '../types';
import { mockShifts, mockUsers, mockAssignments } from '../data';

interface ShiftManagementState {
  shifts: Shift[];
  users: User[];
  assignments: Assignment[];
}

export const useShiftManagement = () => {
  const [state, setState] = useState<ShiftManagementState>({
    shifts: mockShifts,
    users: mockUsers,
    assignments: mockAssignments
  });

  // Get assigned workers for a specific shift
  const getAssignedWorkers = useCallback((shiftId: string): User[] => {
    const shift = state.shifts.find(s => s.id === shiftId);
    if (!shift) return [];
    
    return state.users.filter(user => 
      shift.assignedWorkerIds.includes(user.id)
    );
  }, [state.shifts, state.users]);

  // Get workers who have requested a specific shift
  const getRequestedWorkers = useCallback((shiftId: string): User[] => {
    const requestAssignments = state.assignments.filter(
      assignment => assignment.shiftId === shiftId && assignment.status === 'pending'
    );
    
    return state.users.filter(user =>
      requestAssignments.some(assignment => assignment.userId === user.id)
    );
  }, [state.assignments, state.users]);

  // Assign a worker to a shift
  const assignWorker = useCallback(async (shiftId: string, workerId: string): Promise<void> => {
    setState(prevState => {
      const shift = prevState.shifts.find(s => s.id === shiftId);
      if (!shift) return prevState;

      // Check if shift is already full
      if (shift.assignedWorkerIds.length >= shift.requiredWorkers) {
        throw new Error('Shift is already fully staffed');
      }

      // Check if worker is already assigned
      if (shift.assignedWorkerIds.includes(workerId)) {
        throw new Error('Worker is already assigned to this shift');
      }

      // Update shift with new assigned worker
      const updatedShifts = prevState.shifts.map(s =>
        s.id === shiftId
          ? { ...s, assignedWorkerIds: [...s.assignedWorkerIds, workerId] }
          : s
      );

      // Update assignment status from pending to confirmed
      const updatedAssignments = prevState.assignments.map(assignment =>
        assignment.shiftId === shiftId && assignment.userId === workerId
          ? { ...assignment, status: 'confirmed' as const, updatedAt: new Date() }
          : assignment
      );

      // If no pending assignment exists, create a new confirmed one
      const hasExistingAssignment = prevState.assignments.some(
        assignment => assignment.shiftId === shiftId && assignment.userId === workerId
      );

      if (!hasExistingAssignment) {
        const newAssignment: Assignment = {
          id: `assignment-${Date.now()}`,
          userId: workerId,
          shiftId: shiftId,
          status: 'confirmed',
          assignedAt: new Date(),
          updatedAt: new Date(),
          notes: 'Assigned by admin'
        };
        updatedAssignments.push(newAssignment);
      }

      return {
        ...prevState,
        shifts: updatedShifts,
        assignments: updatedAssignments
      };
    });

    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 500));
  }, []);

  // Unassign a worker from a shift
  const unassignWorker = useCallback(async (shiftId: string, workerId: string): Promise<void> => {
    setState(prevState => {
      const shift = prevState.shifts.find(s => s.id === shiftId);
      if (!shift) return prevState;

      // Remove worker from assigned list
      const updatedShifts = prevState.shifts.map(s =>
        s.id === shiftId
          ? { ...s, assignedWorkerIds: s.assignedWorkerIds.filter(id => id !== workerId) }
          : s
      );

      // Update assignment status to declined or remove if admin-assigned
      const updatedAssignments = prevState.assignments.map(assignment =>
        assignment.shiftId === shiftId && assignment.userId === workerId
          ? { ...assignment, status: 'declined' as const, updatedAt: new Date() }
          : assignment
      );

      return {
        ...prevState,
        shifts: updatedShifts,
        assignments: updatedAssignments
      };
    });

    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 300));
  }, []);

  // Get shift with real-time staffing data
  const getShiftWithStaffing = useCallback((shiftId: string) => {
    const shift = state.shifts.find(s => s.id === shiftId);
    if (!shift) return null;

    const assignedWorkers = getAssignedWorkers(shiftId);
    const requestedWorkers = getRequestedWorkers(shiftId);

    return {
      shift,
      assignedWorkers,
      requestedWorkers,
      isFullyStaffed: assignedWorkers.length >= shift.requiredWorkers,
      spotsRemaining: Math.max(0, shift.requiredWorkers - assignedWorkers.length)
    };
  }, [state.shifts, getAssignedWorkers, getRequestedWorkers]);

  // Get all shifts with staffing data for a specific date
  const getShiftsForDate = useCallback((date: string) => {
    return state.shifts
      .filter(shift => shift.date === date)
      .map(shift => getShiftWithStaffing(shift.id))
      .filter(Boolean);
  }, [state.shifts, getShiftWithStaffing]);

  // Add a shift request (for worker requesting a shift)
  const requestShift = useCallback(async (shiftId: string, workerId: string): Promise<void> => {
    const newAssignment: Assignment = {
      id: `assignment-${Date.now()}`,
      userId: workerId,
      shiftId: shiftId,
      status: 'pending',
      assignedAt: new Date(),
      updatedAt: new Date(),
      notes: 'Worker requested shift'
    };

    setState(prevState => ({
      ...prevState,
      assignments: [...prevState.assignments, newAssignment]
    }));

    await new Promise(resolve => setTimeout(resolve, 200));
  }, []);

  // Get dashboard statistics
  const getDashboardStats = useMemo(() => {
    const totalShifts = state.shifts.length;
    const fullyStaffedShifts = state.shifts.filter(shift => 
      shift.assignedWorkerIds.length >= shift.requiredWorkers
    ).length;
    const openShifts = state.shifts.filter(shift => 
      shift.assignedWorkerIds.length < shift.requiredWorkers
    ).length;
    const pendingRequests = state.assignments.filter(
      assignment => assignment.status === 'pending'
    ).length;

    return {
      totalShifts,
      fullyStaffedShifts,
      openShifts,
      pendingRequests,
      fillRate: totalShifts > 0 ? Math.round((fullyStaffedShifts / totalShifts) * 100) : 0
    };
  }, [state.shifts, state.assignments]);

  return {
    // Data
    shifts: state.shifts,
    users: state.users,
    assignments: state.assignments,
    
    // Computed data
    getAssignedWorkers,
    getRequestedWorkers,
    getShiftWithStaffing,
    getShiftsForDate,
    getDashboardStats,
    
    // Actions
    assignWorker,
    unassignWorker,
    requestShift
  };
};