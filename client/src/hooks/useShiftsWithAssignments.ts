import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Shift, User } from '@shared/schema';

interface ShiftWithStaffing {
  shift: Shift & {
    filledPositions?: number;
    totalPositions?: number;
    assignedStaffNames?: string[];
  };
  assignedWorkers: User[];
  requestedWorkers: User[];
  isFullyStaffed: boolean;
  spotsRemaining: number;
}

export const useShiftsWithAssignments = () => {
  const queryClient = useQueryClient();

  // Fetch shifts with assignments and requests
  const { data: shiftsData, isLoading: shiftsLoading } = useQuery({
    queryKey: ['/api/shifts'],
    queryFn: async () => {
      const response = await fetch('/api/shifts', { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch shifts');
      return response.json();
    },
  });

  // Fetch all users for mapping
  const { data: usersData } = useQuery({
    queryKey: ['/api/users'],
    queryFn: async () => {
      const response = await fetch('/api/users', { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch users');
      return response.json();
    },
  });

  // Get shift with full staffing details
  const getShiftWithStaffing = (shiftId: string): ShiftWithStaffing | null => {
    if (!shiftsData || !usersData) return null;

    const shift = shiftsData.find((s: any) => s.id.toString() === shiftId.toString());
    if (!shift) return null;

    // Get assigned workers based on shift data
    const assignedWorkerIds = shift.assignedWorkerIds || [];
    const assignedWorkers = usersData.filter((user: User) => 
      assignedWorkerIds.includes(user.id)
    );

    // Get requested workers (would need a separate API endpoint for this)
    const requestedWorkers: User[] = []; // TODO: Implement shift requests endpoint

    const filledPositions = shift.filledPositions || assignedWorkers.length;
    const totalPositions = shift.totalPositions || shift.requiredStaff || 1;

    return {
      shift: {
        ...shift,
        filledPositions,
        totalPositions,
        assignedStaffNames: assignedWorkers.map((w: User) => `${w.firstName} ${w.lastName}`)
      },
      assignedWorkers,
      requestedWorkers,
      isFullyStaffed: filledPositions >= totalPositions,
      spotsRemaining: Math.max(0, totalPositions - filledPositions)
    };
  };

  // Get all shifts for a specific date
  const getShiftsForDate = (date: string) => {
    if (!shiftsData) return [];
    
    return shiftsData
      .filter((shift: any) => shift.date === date)
      .map((shift: any) => getShiftWithStaffing(shift.id.toString()))
      .filter(Boolean);
  };

  // Assign worker mutation
  const assignWorkerMutation = useMutation({
    mutationFn: async ({ shiftId, workerId }: { shiftId: string; workerId: string }) => {
      const response = await fetch('/api/shifts/assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ shiftId, workerId: parseInt(workerId) }),
      });
      if (!response.ok) throw new Error('Failed to assign worker');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/shifts'] });
    },
  });

  // Unassign worker mutation
  const unassignWorkerMutation = useMutation({
    mutationFn: async ({ shiftId, workerId }: { shiftId: string; workerId: string }) => {
      const response = await fetch('/api/shifts/unassign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ shiftId, workerId: parseInt(workerId) }),
      });
      if (!response.ok) throw new Error('Failed to unassign worker');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/shifts'] });
    },
  });

  // Dashboard stats
  const { data: dashboardStats } = useQuery({
    queryKey: ['/api/dashboard/stats'],
    queryFn: async () => {
      const response = await fetch('/api/dashboard/stats', { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch dashboard stats');
      return response.json();
    },
  });

  return {
    shifts: shiftsData || [],
    users: usersData || [],
    isLoading: shiftsLoading,
    getShiftWithStaffing,
    getShiftsForDate,
    assignWorker: async (shiftId: string, workerId: string) => {
      await assignWorkerMutation.mutateAsync({ shiftId, workerId });
    },
    unassignWorker: async (shiftId: string, workerId: string) => {
      await unassignWorkerMutation.mutateAsync({ shiftId, workerId });
    },
    getDashboardStats: dashboardStats || {
      activeStaff: 0,
      openShifts: 0,
      complianceRate: 0,
      monthlyHours: 0,
    },
  };
};