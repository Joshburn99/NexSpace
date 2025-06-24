# NexSpace - Healthcare Workforce Management Platform

## Overview
NexSpace is an advanced healthcare workforce management platform that optimizes staffing, employee wellness, and operational efficiency through intelligent technologies and data-driven insights. The platform specializes in multi-worker shift scheduling for large healthcare facilities (100-300 beds) with comprehensive role-based permissions and real-time coordination.

## Current Architecture
- **Frontend**: React with TypeScript (Vite)
- **Backend**: Node.js with TypeScript and Express
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: Passport.js with session-based auth
- **Real-time**: WebSocket connections for live updates
- **Styling**: Tailwind CSS with shadcn/ui components

## Recent Changes

### June 24, 2025 - Individual Shift IDs & Consolidated Shift Creation
- Removed duplicate "Post Shift" button, consolidated functionality into single "Add Shift" button
- Implemented unique individual shift IDs using timestamp+random generation for database storage
- Fixed 500 errors in shifts API by adding proper error handling for database queries
- Enhanced template-based shift generation to create shifts with individual IDs in generated_shifts table
- Added database integration for both manual shift creation and template-based generation
- Improved specialty validation preventing LPN assignments to CST shifts
- Calendar display now shows "Requesting" instead of "Unassigned" with proper capacity ratios (1/1)

### June 23, 2025 - TypeScript Foundation Restructure
- Created comprehensive TypeScript interface system in `client/src/types/`
- Implemented mock data structure with realistic healthcare scenarios
- Built utility functions for shift management, user operations, and facility handling
- Established centralized data services with Firebase integration pathway
- Created example ShiftDashboard component demonstrating TypeScript foundation usage

**Key Components Added:**
- Core interfaces: User, Facility, Shift (multi-worker), Assignment
- Mock data files: users.ts, facilities.ts, shifts.ts, assignments.ts
- Utility functions: shiftUtils.ts, userUtils.ts, facilityUtils.ts
- Comprehensive documentation: NEXSPACE_TYPESCRIPT_FOUNDATION.md

### Previous Development
- Enhanced staff database with 29+ healthcare professionals across all specialties
- Implemented comprehensive calendar view with shift grouping by specialty
- Built multi-worker shift support showing staffing ratios (2/3 filled format)
- Created impersonation system with proper user authentication
- Developed advanced filtering and real-time shift management

## Project Architecture

### Data Models (TypeScript Interfaces)
```
- User: Supports staff, facility_admin, superuser roles with specialty assignments
- Facility: Healthcare facilities with bed counts and facility types
- Shift: Multi-worker support with requiredWorkers and assignedWorkerIds
- Assignment: Links users to shifts with status tracking
```

### File Structure
```
client/src/
├── types/index.ts          # Core TypeScript interfaces
├── data/                   # Mock data and data services
├── utils/                  # Utility functions for business logic
├── components/             # React components
└── ...
```

### Multi-Worker Shift System
- Shifts support multiple workers per shift (`requiredWorkers`, `assignedWorkerIds`)
- Staffing ratio calculations and availability checking
- Specialty-based worker matching and conflict detection
- Real-time status tracking and notifications

## User Preferences
- Focus on comprehensive, working solutions over partial implementations
- Prioritize TypeScript type safety and proper data modeling
- Maintain clean separation between mock data (development) and Firebase (production)
- Emphasize multi-worker shift scheduling capabilities
- Document architectural decisions with clear migration pathways

## Development Guidelines
- Use mock data during development phase before Firebase integration
- Implement proper TypeScript interfaces for all data structures
- Maintain utility functions for complex business logic
- Follow the established service layer pattern for future Firebase integration
- Test multi-worker scenarios with realistic healthcare data

## Current Status
The platform now has a solid TypeScript foundation with comprehensive interfaces, mock data, and utility functions. Ready for component development using the established patterns before Firebase integration.