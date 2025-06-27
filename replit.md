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

### June 27, 2025 - Complete Enhanced Facility Management System & Centralized Facility Infrastructure
- **Database Schema Extension**: Successfully implemented 17 new facility management columns including auto_assignment_enabled, team_id, net_terms, float_pool_margins, bill_rates, pay_rates, workflow_automation_config, timezone, shift_management_settings, billing contacts, staffing_targets, emr_system, contract dates, payroll_provider_id, custom_rules, regulatory_docs
- **Enhanced API Endpoints**: Built comprehensive facility management API with GET/POST/PATCH endpoints supporting enhanced validation, rates management, staffing targets, and workflow configuration
- **Validation System**: Created robust Zod-based validation schemas for all JSONB fields with business rule enforcement for rates consistency, staffing targets validation, and timezone verification
- **Frontend Interface**: Developed comprehensive React facility management page with tabbed interface for overview, rates, staffing, workflow automation, and compliance management
- **Enterprise Features**: Implemented specialty-based billing/pay rates, float pool margins, workflow automation flags, shift management rules, department-specific staffing targets, custom operational rules, and regulatory document tracking
- **Backend Integration**: Enhanced storage layer with DatabaseStorage implementation supporting all new facility fields with proper TypeScript typing and database integration
- **API Testing**: Created comprehensive test suite validating JSONB field structures, database operations, and enhanced field retrieval patterns

### June 27, 2025 - Centralized Facility Infrastructure Refactoring
- **Single Source of Truth**: Created centralized facility system with useFacilities() and useFacility() hooks for consistent data access across all application modules
- **Facility Selector Component**: Built reusable FacilitySelector component with enhanced display names, filtering, and consistent UI patterns
- **Helper Functions**: Implemented getFacilityDisplayName(), getFacilityAddress(), getFacilityTimezone(), and other utility functions for enhanced facility data access
- **Calendar Page Refactoring**: Updated enhanced calendar page to use centralized facility hooks instead of individual facility queries
- **Shift Templates Refactoring**: Migrated shift templates page to use centralized facility infrastructure with consistent facility display names and data access patterns
- **Data Consistency**: Ensured all facility references throughout the application use the enhanced facility data structure with proper TypeScript typing and validation

### June 26, 2025 - Add Shift Button Implementation & UI Cleanup
- Removed duplicate "Add Shift" button from filter controls area
- Implemented fully functional Add Shift modal with controlled form inputs
- Connected form to backend `/api/shifts` POST endpoint with proper validation
- Added form fields: title, specialty, date, facility, start/end time, rate, required staff, urgency, description
- Integrated form submission with React Query mutations and proper error handling
- Form auto-resets after successful submission and refreshes calendar data
- Added client-side validation requiring title and facility fields

### June 26, 2025 - Critical Specialty Matching & Multi-Worker Assignment Fixes
- Fixed critical specialty validation bug preventing proper worker filtering for shifts
- Enhanced shift requests endpoint to check both example and database-generated shifts
- Corrected backend assignment logic to use proper requiredWorkers capacity instead of defaulting to 1
- Updated ICU Day Shift to support 3 workers and Emergency Department to support 2 workers
- Fixed flawed RN validation logic in assignment endpoint with incorrect conditions
- Resolved React key duplication warnings by using unique date-groupIndex-shiftID combinations
- Implemented strict specialty matching: only CNA workers for CNA shifts, RN for RN shifts, etc.
- Added comprehensive backend validation to prevent cross-specialty assignments at API level

### June 25, 2025 - Template Editing Investigation
- Investigated template editing modal pre-population and persistence issues
- Identified data flow challenges between database schema (snake_case) and frontend (camelCase)
- Added comprehensive debugging and field transformation logic
- Issue remains unresolved - requires further architectural review of form state management

### June 24, 2025 - Enhanced Shift Templates with Role-Based Access
- Consolidated Min/Max staff requirements into single "Staff Required" field for better usability
- Added scrolling capability to template creation/edit modal (max-h-[90vh] overflow-y-auto)
- Improved template popup accessibility with proper height constraints (max-h-[65vh])
- Enhanced Use Template modal with scrolling support for better mobile compatibility
- Implemented role-based access: hourly rate field only visible to superusers
- Added "Days Posted Out" field to control automatic shift posting schedule (1-90 days)
- Updated backend API to support daysPostedOut parameter in shift templates

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