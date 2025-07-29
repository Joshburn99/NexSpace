# NexSpace Shift Workflow Comprehensive Audit & Fix Plan

## Current State Analysis

### 🔍 **Issues Identified:**

1. **Shift Generation Pipeline Broken**
   - 4 active shift templates exist but showing 0 open shifts in calendar
   - Templates have generated 622 total shifts but only 5 in `generated_shifts` table
   - Calendar is pulling from multiple data sources causing inconsistency

2. **Data Architecture Problems**
   - **3 Different Shift Tables**: `shifts`, `generated_shifts`, `shift_assignments`
   - **Mixed Data Sources**: API endpoint combines database + hardcoded example data
   - **Template Generation**: Not automatically creating current/future shifts
   - **Status Tracking**: No unified status across shift lifecycle

3. **Workflow Gaps**
   ```
   Template → Generated Shift → Assignment → Work → Time Submission → Completion
   ❌ BROKEN  ❌ BROKEN      ✅ EXISTS    ❌ BROKEN  ❌ BROKEN      ❌ BROKEN
   ```

### 📊 **Current Database State:**
- **Shift Templates**: 5 total (4 active, 1 inactive)
- **Generated Shifts**: 5 records (all from June 2025, outdated)
- **Main Shifts**: 19 records (mostly example data)
- **Staff**: 83 total staff members available for assignment

## 🛠️ **Comprehensive Fix Plan**

### Phase 1: Database Schema Consolidation
**Goal**: Create single source of truth for all shift data

1. **Unified Shifts Table Structure**
   ```sql
   shifts (main table)
   ├── id (primary key)
   ├── source_type ('template_generated' | 'manual' | 'emergency')
   ├── template_id (nullable, links to generating template)
   ├── title, date, times, department, specialty
   ├── facility_id, status, urgency, rate
   ├── lifecycle_stage ('posted' | 'requested' | 'assigned' | 'in_progress' | 'completed' | 'cancelled')
   ├── assignment_data (JSONB)
   ├── time_tracking (JSONB)
   └── completion_data (JSONB)
   ```

2. **Enhanced Tracking Tables**
   ```sql
   shift_requests (worker requests to work shift)
   shift_assignments (approved assignments)
   shift_time_logs (clock in/out, break tracking)
   shift_completions (final status, hours worked, invoicing)
   ```

### Phase 2: Template Generation Engine Fix
**Goal**: Ensure active templates continuously generate future shifts

1. **Automated Generation Service**
   - Daily cron job to generate shifts from active templates
   - Generate shifts 14-30 days in advance (based on template.days_posted_out)
   - Respect template.days_of_week scheduling
   - Create proper shift.required_workers based on template.min_staff

2. **Template Lifecycle Management**
   - Activate/deactivate templates
   - Bulk generate missing shifts for date range
   - Auto-expire old open shifts

### Phase 3: Request & Assignment System
**Goal**: Complete worker → shift → assignment workflow

1. **Shift Request Process**
   ```
   Worker sees open shift → Requests shift → Manager approves → Assignment created
   ```

2. **Assignment Logic**
   - Specialty matching (RN only for RN shifts)
   - Conflict detection (no overlapping shifts)
   - Capacity management (multiple workers per shift)
   - Auto-assignment based on criteria

### Phase 4: Time Tracking & Completion
**Goal**: Track work performed and update analytics

1. **Time Clock Integration**
   ```
   Clock In → Work Period → Break Tracking → Clock Out → Submit Timesheet
   ```

2. **Completion Workflow**
   ```
   Timesheet Submitted → Manager Review → Approval → Invoice Generation → Analytics Update
   ```

### Phase 5: Analytics & Reporting
**Goal**: Real-time dashboard data from completed shifts

1. **Staff Analytics Updates**
   - Total shifts worked count
   - Hours worked tracking
   - Performance ratings
   - Specialty utilization

2. **Facility Analytics**
   - Shift fill rates
   - Average hourly rates
   - Department utilization
   - Cost per shift metrics

## 🚀 **Implementation Priority**

### Critical Issues (Fix First):
1. **Template Generation Pipeline** - Get shifts showing in calendar
2. **Add Shift Functionality** - Fix manual shift creation
3. **Status Tracking** - Unified shift status system

### Secondary Issues:
1. **Request/Assignment Workflow** - Complete worker interaction
2. **Time Tracking Integration** - Connect to time clock
3. **Analytics Updates** - Real-time dashboard data

### Enhancement Features:
1. **Automated Invoicing** - Generate invoices from completed shifts
2. **Performance Tracking** - Staff ratings and metrics
3. **Predictive Scheduling** - AI-based shift recommendations

## 📋 **Database Migration Required**

1. **Consolidate Shift Tables**
   - Migrate `generated_shifts` data to `shifts` table
   - Add lifecycle tracking columns
   - Create proper indexes for performance

2. **Enhanced Status Tracking**
   - Replace simple status with lifecycle_stage enum
   - Add assignment, time, and completion JSONB fields
   - Create audit trail for status changes

3. **Foreign Key Constraints**
   - Proper relationships between shifts, templates, assignments
   - Cascade delete rules for data integrity
   - Unique constraints to prevent duplicates

## 🎯 **Success Metrics**

- **Calendar Display**: 4 active templates showing current/future shifts
- **Add Shift**: Manual shift creation working end-to-end
- **Worker Workflow**: Request → Assignment → Work → Complete pipeline
- **Analytics Update**: Dashboard showing real shift data
- **Data Consistency**: Single source of truth for all shift information

## Next Steps
1. Fix template generation to show current shifts in calendar
2. Repair Add Shift functionality for manual shift creation
3. Implement unified shift status tracking system
4. Complete worker request/assignment workflow
5. Integrate time tracking and completion processes