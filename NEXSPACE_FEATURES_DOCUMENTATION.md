# NexSpace Features Documentation

## Overview
This document provides comprehensive documentation of all features and functionality in the NexSpace healthcare workforce management platform. It serves as a reference for auditing, UI/UX reviews, and understanding the system's capabilities.

Last Updated: July 28, 2025

## Table of Contents
1. [Authentication & Access Control](#authentication--access-control)
2. [Dashboard Systems](#dashboard-systems)
3. [Messaging & Communication](#messaging--communication)
4. [Staff Management](#staff-management)
5. [Scheduling & Calendar](#scheduling--calendar)
6. [Billing & Finance](#billing--finance)
7. [Compliance & Credentials](#compliance--credentials)
8. [Analytics & Reporting](#analytics--reporting)
9. [Facility Management](#facility-management)
10. [Job Board & Recruitment](#job-board--recruitment)
11. [Workflow Automation](#workflow-automation)
12. [Referral System](#referral-system)

---

## Authentication & Access Control

### User Roles
- **Super Admin**: Full system access, can impersonate users, manage all facilities
- **Facility Users**: 
  - Facility Administrator
  - Scheduling Coordinator
  - HR Manager
  - Corporate
  - Regional Director
  - Billing Manager
  - Supervisor
  - Director of Nursing
  - Viewer

### Permission System
- **23 Distinct Facility Permissions** including:
  - Schedule Management (view_schedules, create_shifts, edit_shifts, delete_shifts, approve_shift_requests)
  - Staff Management (view_staff, manage_staff, view_staff_credentials, edit_staff_credentials)
  - Billing (view_billing, manage_billing, view_rates, edit_rates, approve_invoices)
  - Facility Management (view_facility_profile, edit_facility_profile, manage_facility_settings, manage_facility_users)
  - Analytics (view_reports, view_analytics, view_compliance)
  - Advanced Features (view_workflow_automation, manage_workflow_automation, view_referral_system, manage_referral_system)

### Impersonation System
- Super admins can impersonate any user
- "Viewing as" indicator always visible during impersonation
- Maintains audit trail of impersonation actions

---

## Dashboard Systems

### Super Admin Dashboard
- **Location**: `/dashboard`
- **Features**:
  - Active staff count across all facilities
  - Open shifts needing coverage
  - Compliance rate tracking
  - Monthly hours tracking
  - Priority tasks (urgent shifts, expiring credentials, outstanding invoices)
  - Recent activity feed
  - 30-second auto-refresh for real-time data

### Facility User Dashboard
- **Location**: `/facility-dashboard`
- **Features**:
  - Permission-based widget visibility
  - Facility-specific data filtering
  - Dynamic content based on user role
  - StatsCard components with trend indicators
  - PriorityTasksList with role-appropriate tasks
  - RecentActivity with facility-filtered events

### Dashboard Customization
- Dashboard preferences stored in user table
- Widget drag-and-drop functionality (prepared infrastructure)
- Permission-based widget availability

---

## Messaging & Communication

### Enhanced Messaging System (Current)
- **Location**: `/messaging`
- **Features**:
  - Direct messaging between users
  - Mass messaging capabilities for managers
  - Message NexSpace support functionality
  - Preset groups (ICU Team, All RNs, Contractors, etc.)
  - Priority levels (normal, high, urgent)
  - Unread message badges
  - Search functionality
  - Tab-based interface (Conversations, Mass Messages, NexSpace Support)

### Messaging Permissions
- All users can send direct messages
- Mass messaging restricted to managers and super admins
- NexSpace support messaging available to all users

---

## Staff Management

### Staff Directory
- **Location**: `/staff-directory`
- **Features**:
  - Comprehensive staff listing with 80+ healthcare professionals
  - Facility-based filtering (users only see staff from their facilities)
  - Employment type badges (Full-time, Part-time, Contract, Per Diem)
  - Reliability scoring system
  - Specialty filtering (RN, LPN, CNA, CST, RT, PT, etc.)
  - Direct messaging integration
  - Profile editing capabilities
  - Compliance status indicators

### Staff Profile Management
- **API**: PATCH `/api/staff/:id`
- **Editable Fields**:
  - Basic information
  - Contact details
  - Licensing and credentials
  - Facility associations
  - Performance metrics
  - Scheduling preferences
  - Emergency contacts

### Staff Specialties (39 unique)
- Nursing: Registered Nurse, Licensed Practical Nurse, Certified Nursing Assistant, etc.
- Allied Health: Physical Therapist, Occupational Therapist, Respiratory Therapist, etc.
- Support: Unit Secretary, Environmental Services, Dietary Aide, etc.

---

## Scheduling & Calendar

### Enhanced Calendar View
- **Location**: `/schedule`, `/calendar`
- **Features**:
  - Multi-worker shift support (showing X/Y staffing ratios)
  - Shift grouping by specialty
  - Color-coded shifts by status
  - Add Shift button (permission-based)
  - Facility filtering for non-super admins
  - Date navigation
  - Shift details popup

### Shift Management
- **Shift Types**: Day, Evening, Night, Overnight
- **Multi-Worker Support**: 
  - ICU shifts support 3 workers
  - Emergency Department supports 2 workers
  - Individual tracking of assigned workers
- **Shift Status**: Open, Partially Filled, Fully Staffed
- **Individual Shift IDs**: Timestamp + random generation for uniqueness

### Shift Templates
- **Location**: `/shift-templates`
- **Features**:
  - Recurring shift pattern creation
  - Facility-specific templates
  - Days of week selection
  - Staff requirements setting
  - Hourly rate configuration (super admin only)
  - Days Posted Out (1-90 days advance posting)
  - Active/Inactive status

### Shift Requests
- **Location**: `/shift-requests`
- **Features**:
  - Approve/Deny buttons (permission-based)
  - Auto-assignment settings (permission-based)
  - Request status tracking
  - Facility filtering

---

## Billing & Finance

### Billing Dashboard
- **Location**: `/billing-dashboard`
- **Features**:
  - Invoice summaries
  - Outstanding amounts tracking
  - Approval workflows
  - Financial metrics
  - Permission-based visibility

### Rates Management
- **Location**: `/billing-rates`
- **Features**:
  - Pay rate configuration
  - Bill rate settings
  - Specialty-specific pricing
  - Contract type rates
  - Facility-specific rates

### Invoice Management
- **Professional Invoices**: `/invoices`
- **Vendor Invoices**: `/vendor-invoices`
- **Features**:
  - Invoice creation and editing
  - Status tracking
  - Approval workflows
  - Payment tracking

### Billing Permissions
- view_billing: Read access to invoices
- manage_billing: Create/edit invoices
- view_rates: Access rate information
- edit_rates: Modify rates
- approve_invoices: Final approval authority

---

## Compliance & Credentials

### Compliance Management
- **Location**: `/compliance`
- **Features**:
  - Credential tracking
  - Expiration alerts
  - Compliance rate calculations
  - Document management
  - Facility-specific compliance tracking

### Credential Types
- Licenses (RN, LPN, CNA licenses)
- Certifications (BLS, ACLS, specialty certifications)
- Training records
- Background checks
- Health records (TB tests, vaccinations)

---

## Analytics & Reporting

### Analytics Dashboard
- **Location**: `/analytics`
- **Sub-pages**:
  - Shift Analytics (`/analytics/shifts`)
  - Float Pool Analytics (`/analytics/float-pool`)
  - Overtime Report (`/analytics/overtime`)
  - Attendance (`/analytics/attendance`)
  - Agency Usage (`/analytics/agency-usage`)
  - Compliance (`/analytics/compliance`)

### Reporting Features
- Real-time data visualization
- Export capabilities
- Facility filtering
- Date range selection
- Trend analysis
- Cost tracking

### Report Types
- Staffing reports
- Financial reports
- Compliance reports
- Attendance tracking
- Overtime analysis
- Agency usage metrics

---

## Facility Management

### Facility Profile
- **Location**: `/facility-profile`
- **Editable Fields**:
  - Basic information (name, type, address)
  - Contact details
  - Bed count
  - Operating hours
  - Timezone settings

### Enhanced Facility Management
- **Database Fields** (17 new columns added):
  - auto_assignment_enabled
  - team_id
  - net_terms
  - float_pool_margins
  - bill_rates (JSON)
  - pay_rates (JSON)
  - workflow_automation_config (JSON)
  - timezone
  - shift_management_settings (JSON)
  - billing_contacts
  - staffing_targets (JSON)
  - emr_system
  - contract_start_date
  - contract_end_date
  - payroll_provider_id
  - custom_rules (JSON)
  - regulatory_docs (JSON)

### Facility Settings
- **Location**: `/facility-settings`
- **Features**:
  - Advanced operation configuration
  - Automation settings
  - EMR system selection
  - Shift management rules
  - Staffing targets by department

### Facility Users Management
- **Location**: `/facility-users`
- **Features**:
  - User creation and editing
  - Role assignment
  - Permission management
  - Multi-facility associations
  - Team assignments

---

## Job Board & Recruitment

### Job Board
- **Location**: `/job-board`
- **Features**:
  - Job posting listings
  - Facility filtering
  - Application tracking
  - Permission-based posting creation

### Job Posting Creation
- **Location**: `/create-job-posting`
- **Required Permissions**: manage_job_openings
- **Fields**:
  - Title and description
  - Requirements
  - Compensation
  - Shift details
  - Application deadline

---

## Workflow Automation

### Automation Dashboard
- **Location**: `/workflow-automation`
- **Features**:
  - Automated workflow configuration
  - Rule-based triggers
  - Action definitions
  - Facility-specific automation
- **Required Permissions**: view_workflow_automation, manage_workflow_automation

### Automation Types
- Shift posting automation
- Credential expiration alerts
- Compliance notifications
- Billing reminders

---

## Referral System

### Referral Management
- **Location**: `/referral-system`
- **Features**:
  - Staff referral tracking
  - Facility referral management
  - Bonus calculations
  - Status workflow (pending → contacted → interviewed → hired/declined)
  - Earnings tracking
  - Performance metrics
- **Required Permissions**: view_referral_system, manage_referral_system

### Referral Types
- Staff referrals (internal employees referring candidates)
- Facility referrals (facilities referring other facilities)

---

## Recent UI/UX Changes

### July 28, 2025
- **Messaging Reversion**: Reverted from unified messaging to enhanced messaging page for better UX
- **Logo Integration**: Added NexSpace logo to both sidebars, replacing text

### July 24, 2025
- **Dashboard Restoration**: Fixed broken drag-and-drop dashboard, restored live data display
- **Collapsible Sidebar**: Implemented smooth collapsible functionality for facility user sidebar
- **UI Cleanup**: Removed duplicate TopBar components during impersonation

### July 20, 2025
- **Facility Filtering**: Enhanced Add Shift modal to only show associated facilities
- **Permission Audit**: Standardized 17 facility user permissions across all roles

### July 14, 2025
- **Sidebar Reorganization**: Restructured facility sidebar with logical groupings and dropdowns
- **New Permissions**: Added 8 new facility permissions for enhanced functionality
- **Job Board Fix**: Fixed job board visibility in impersonation mode

### July 10, 2025
- **Staff Management Enhancement**: Fixed facility association editing bugs
- **Employment Type Migration**: Updated all staff to proper employment type format
- **UI Cleanup**: Removed "Impersonate" button from Staff Management page

---

## Technical Infrastructure

### Frontend
- React with TypeScript (Vite)
- Tailwind CSS with shadcn/ui components
- Wouter for routing
- React Query for data fetching
- WebSocket for real-time updates

### Backend
- Node.js with TypeScript and Express
- PostgreSQL with Drizzle ORM
- Passport.js for authentication
- Session-based authentication
- WebSocket server for real-time features

### Security Features
- Role-based access control
- Facility-based data filtering
- Session management
- Audit logging
- Permission validation at API level

---

## Future Enhancement Areas
1. Mobile-responsive design improvements
2. Advanced scheduling algorithms
3. AI-powered shift recommendations
4. Enhanced reporting capabilities
5. Integration with external HR systems
6. Advanced notification system
7. Performance optimization for large datasets