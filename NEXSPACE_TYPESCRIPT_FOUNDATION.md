# NexSpace TypeScript Foundation

This document outlines the comprehensive TypeScript foundation for NexSpace, a healthcare shift scheduling platform designed for large facilities (100-300 beds) with multi-worker shift support.

## 📁 Recommended File Structure

```
client/src/
├── types/
│   └── index.ts                 # Core TypeScript interfaces
├── data/
│   ├── index.ts                # Central data exports & services
│   ├── users.ts                # Mock user data & helpers
│   ├── facilities.ts           # Mock facility data & helpers
│   ├── shifts.ts               # Mock shift data & helpers
│   └── assignments.ts          # Mock assignment data & helpers
├── utils/
│   ├── index.ts                # Central utility exports
│   ├── shiftUtils.ts           # Shift-specific utilities
│   ├── userUtils.ts            # User-specific utilities
│   └── facilityUtils.ts        # Facility-specific utilities
├── components/
│   ├── ShiftDashboard.tsx      # Example component using the foundation
│   └── ...                     # Other components
└── ...
```

## 🏗️ Core TypeScript Interfaces

### User Interface
```typescript
interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: 'staff' | 'facility_admin' | 'superuser';
  specialty?: Specialty;
  facilityIds: string[];
  isActive: boolean;
  phoneNumber?: string;
  avatar?: string;
  createdAt: Date;
  updatedAt: Date;
}
```

### Facility Interface
```typescript
interface Facility {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  phoneNumber: string;
  bedCount: number;
  facilityType: 'hospital' | 'nursing_home' | 'assisted_living' | 'rehab_center' | 'clinic';
  isActive: boolean;
  // ... additional fields
}
```

### Shift Interface (Multi-Worker Support)
```typescript
interface Shift {
  id: string;
  title: string;
  facilityId: string;
  specialty: Specialty;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm (24-hour)
  endTime: string; // HH:mm (24-hour)
  requiredWorkers: number;        // Key: How many workers needed
  assignedWorkerIds: string[];    // Key: Currently assigned workers
  status: ShiftStatus;
  description?: string;
  requirements?: string[];
  payRate?: number;
  // ... additional fields
}
```

### Assignment Interface
```typescript
interface Assignment {
  id: string;
  userId: string;
  shiftId: string;
  status: 'pending' | 'confirmed' | 'declined' | 'completed' | 'no_show';
  assignedAt: Date;
  updatedAt: Date;
  notes?: string;
}
```

## 🛠️ Key Utility Functions

### Shift Management (`shiftUtils.ts`)
```typescript
// Get shifts for specific date
getShiftsForDate(shifts: Shift[], date: string): Shift[]

// Check if shift is fully staffed
isShiftFilled(shift: Shift): boolean

// Group shifts by specialty
groupShiftsBySpecialty(shifts: Shift[]): ShiftsBySpecialty

// Get staffing ratio information
getShiftStaffingRatio(shift: Shift): {
  assigned: number;
  required: number;
  ratio: string;
  percentage: number;
  isFullyStaffed: boolean;
  needsStaff: number;
}

// Find available workers for a shift
getAvailableWorkersForShift(users: User[], shifts: Shift[], targetShift: Shift): User[]

// Check worker availability (no overlapping shifts)
isWorkerAvailableForShift(shifts: Shift[], targetShift: Shift, workerId: string): boolean
```

### User Management (`userUtils.ts`)
```typescript
// Get full name
getUserFullName(user: User): string

// Filter users by multiple criteria
filterUsers(users: User[], filters: UserFilters): User[]

// Get users by specialty/facility
getUsersBySpecialty(users: User[], specialty: Specialty): User[]
getUsersByFacility(users: User[], facilityId: string): User[]

// Authorization checks
isUserAuthorizedForFacility(user: User, facilityId: string): boolean
```

### Facility Management (`facilityUtils.ts`)
```typescript
// Basic facility operations
getFacilityById(facilities: Facility[], id: string): Facility | undefined
getFacilitiesByType(facilities: Facility[], facilityType: string): Facility[]
searchFacilitiesByName(facilities: Facility[], searchTerm: string): Facility[]
```

## 📊 Mock Data Structure

### Sample Data Files
- **`users.ts`**: 7 sample users across different roles and specialties
- **`facilities.ts`**: 5 healthcare facilities of various types and sizes
- **`shifts.ts`**: 8 sample shifts demonstrating multi-worker scenarios
- **`assignments.ts`**: 7 sample assignments showing different statuses

### Data Relationships
- Users can be associated with multiple facilities (`facilityIds[]`)
- Shifts require specific specialties and multiple workers (`requiredWorkers`, `assignedWorkerIds[]`)
- Assignments link users to shifts with status tracking

## 🚀 Usage Examples

### Basic React Component Integration
```typescript
import React, { useState, useMemo } from 'react';
import { mockShifts, mockUsers, mockFacilities } from '../data';
import { 
  getShiftsForDate, 
  isShiftFilled, 
  getShiftStaffingRatio 
} from '../utils/shiftUtils';
import { getUserFullName } from '../utils/userUtils';

const ShiftList: React.FC = () => {
  const [selectedDate, setSelectedDate] = useState('2025-06-24');
  
  // Get shifts for selected date
  const dayShifts = useMemo(() => 
    getShiftsForDate(mockShifts, selectedDate), 
    [selectedDate]
  );
  
  return (
    <div>
      {dayShifts.map(shift => {
        const staffing = getShiftStaffingRatio(shift);
        const assignedWorkers = mockUsers.filter(user => 
          shift.assignedWorkerIds.includes(user.id)
        );
        
        return (
          <div key={shift.id}>
            <h3>{shift.title}</h3>
            <p>Staffing: {staffing.ratio} ({staffing.percentage}% filled)</p>
            <p>Status: {isShiftFilled(shift) ? 'Fully Staffed' : 'Needs Staff'}</p>
            
            {assignedWorkers.length > 0 && (
              <div>
                <strong>Assigned:</strong>
                {assignedWorkers.map(worker => (
                  <span key={worker.id}>{getUserFullName(worker)}, </span>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
```

### Advanced Filtering and Search
```typescript
import { useState, useMemo } from 'react';
import { mockShifts } from '../data';
import { getUnderStaffedShifts, groupShiftsBySpecialty } from '../utils/shiftUtils';

const useShiftFiltering = () => {
  const [filters, setFilters] = useState({
    facilityId: '',
    specialty: '',
    status: ''
  });
  
  const filteredShifts = useMemo(() => {
    let filtered = [...mockShifts];
    
    if (filters.facilityId) {
      filtered = filtered.filter(shift => shift.facilityId === filters.facilityId);
    }
    if (filters.specialty) {
      filtered = filtered.filter(shift => shift.specialty === filters.specialty);
    }
    if (filters.status) {
      filtered = filtered.filter(shift => shift.status === filters.status);
    }
    
    return filtered;
  }, [filters]);
  
  const understaffedShifts = useMemo(() => 
    getUnderStaffedShifts(filteredShifts), 
    [filteredShifts]
  );
  
  const shiftsBySpecialty = useMemo(() => 
    groupShiftsBySpecialty(filteredShifts), 
    [filteredShifts]
  );
  
  return {
    filteredShifts,
    understaffedShifts,
    shiftsBySpecialty,
    filters,
    setFilters
  };
};
```

## 🔥 Firebase Integration Strategy

### 1. Data Model Mapping
The TypeScript interfaces directly map to Firebase collections:
- `users` collection → `User` interface
- `facilities` collection → `Facility` interface  
- `shifts` collection → `Shift` interface
- `assignments` collection → `Assignment` interface

### 2. Service Layer Pattern
Create service classes that implement the same interface as mock data functions:

```typescript
// services/shiftService.ts
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import type { Shift, ShiftFilters } from '../types';

export class ShiftService {
  // Replace mock data functions with Firebase queries
  async getShifts(filters?: ShiftFilters): Promise<Shift[]> {
    // Firebase query implementation
  }
  
  subscribeToShifts(filters: ShiftFilters, callback: (shifts: Shift[]) => void) {
    // Real-time Firebase subscription
  }
}
```

### 3. React Hook Pattern
```typescript
// hooks/useShifts.ts
import { useState, useEffect } from 'react';
import { shiftService } from '../services/shiftService';

export const useShifts = (filters: ShiftFilters) => {
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    // In development: use mock data
    if (process.env.NODE_ENV === 'development') {
      setShifts(mockShifts);
      setLoading(false);
      return;
    }
    
    // In production: use Firebase
    const unsubscribe = shiftService.subscribeToShifts(filters, (data) => {
      setShifts(data);
      setLoading(false);
    });
    
    return unsubscribe;
  }, [filters]);
  
  return { shifts, loading };
};
```

### 4. Migration Strategy
1. **Phase 1**: Use mock data throughout development
2. **Phase 2**: Create Firebase service layer alongside mock data
3. **Phase 3**: Add environment-based switching (mock vs Firebase)
4. **Phase 4**: Gradually replace mock calls with Firebase services
5. **Phase 5**: Remove mock data and finalize Firebase integration

## 🎯 Key Benefits

### 1. Type Safety
- Complete TypeScript coverage prevents runtime errors
- Interface consistency across all components
- Auto-completion and IntelliSense support

### 2. Scalable Architecture
- Centralized data management
- Reusable utility functions
- Clean separation of concerns

### 3. Multi-Worker Shift Support
- Built-in support for shifts requiring multiple workers
- Staffing ratio calculations and availability checking
- Flexible assignment and status tracking

### 4. Firebase-Ready Design
- Interfaces match Firebase document structure
- Service layer pattern enables smooth Firebase integration
- Real-time capabilities ready for implementation

### 5. Development Efficiency
- Rich mock data for development and testing
- Comprehensive utility functions reduce code duplication
- Consistent patterns across all data operations

## 🔧 Next Steps

1. **Use mock data** for all development until Firebase integration
2. **Implement components** using the provided interfaces and utilities
3. **Test multi-worker scenarios** with the mock data
4. **Create service layer** when ready for Firebase
5. **Enable real-time updates** with Firebase subscriptions

This foundation provides everything needed to build a robust healthcare scheduling platform with proper TypeScript support and a clear path to Firebase integration.