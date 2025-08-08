# NexSpace - Healthcare Workforce Management Platform

## Overview
NexSpace is an advanced healthcare workforce management platform designed to optimize staffing, employee wellness, and operational efficiency in large healthcare facilities (100-300 beds). It provides intelligent multi-worker shift scheduling, comprehensive role-based permissions, and real-time coordination capabilities. The platform aims to be a comprehensive solution for workforce management, offering robust features for scheduling, staff management, analytics, and compliance.

## User Preferences
- Focus on comprehensive, working solutions over partial implementations
- Prioritize TypeScript type safety and proper data modeling
- Maintain clean separation between mock data (development) and Firebase (production)
- Emphasize multi-worker shift scheduling capabilities
- Document architectural decisions with clear migration pathways

## System Architecture
### Core Technologies
- **Frontend**: React with TypeScript (Vite)
- **Backend**: Node.js with TypeScript and Express
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: Passport.js with session-based authentication
- **Real-time**: WebSocket connections for live updates
- **Styling**: Tailwind CSS with shadcn/ui components

### Design Patterns & Decisions
- **Modular Backend Architecture**: Routes are modularized into domain-specific files (`auth`, `facilities`, `shifts`, `staff`) orchestrated by `server/routes/index.ts` for improved maintainability.
- **Role-Based Access Control (RBAC)**: Comprehensive RBAC system implemented across both frontend and backend, using middleware for authorization checks and `PermissionAction`/`PermissionGate` components for UI control. This includes granular permissions (e.g., `shifts.create`, `staff.edit`, `view_audit_logs`) and dynamic UI adaptation.
- **Multi-Worker Shift System**: Core feature supporting multiple workers per shift, with `requiredWorkers` and `assignedWorkerIds`, staffing ratio calculations, specialty-based matching, and conflict detection.
- **Unified Design System**: Consistent UI/UX with a `UnifiedHeader` component, modern design elements (typography, card styles, animations), and a responsive layout architecture utilizing custom components for mobile-first design.
- **Centralized Data Management**: Facilities data is centralized via `useFacilities()` and `useFacility()` hooks to ensure data consistency across the application. Facility profiles serve as a single source of truth.
- **Component-Based Development**: Extensive use of reusable React components (e.g., `EnhancedMobileNavigation`, `ValidatedInput`, `MobileForm`, `MobileTable`) for consistent UI and accelerated development.
- **Error Handling**: Comprehensive error boundaries (`EnhancedErrorBoundary`) and form validation (`ValidatedInput`, `FormErrorSummary`) are integrated for robust error reporting and user feedback.
- **Impersonation System**: A secure impersonation feature is implemented for super admins to view the platform from any user's perspective, with robust session and permission handling.
- **Data Modeling**: Strong emphasis on TypeScript interfaces for `User`, `Facility`, `Shift`, and `Assignment` to ensure type safety and clear data structures.
- **Performance Optimization**: Non-blocking analytics implementation using `setImmediate` for asynchronous event logging to prevent performance degradation.
- **Navigation System**: Dynamic, role-based navigation that adapts to user permissions, ensuring only relevant menu items are displayed.

### Feature Specifications
- **Shift Scheduling**: Advanced multi-worker shift scheduling, conflict detection, iCal feed integration, and Google Calendar OAuth for two-way sync.
- **Staff Management**: Comprehensive staff profiles, credential tracking, bulk staff management, and detailed employment type classifications.
- **Facility Management**: Centralized facility profiles with tabs for basic info, contacts, billing & rates, operations, compliance, workflow automation, shift rules, and staffing targets. Supports complex JSONB fields for configurations.
- **Real-time Messaging**: WhatsApp-style interface with WebSocket integration for instant message delivery, unread counts, and proper timestamp formatting.
- **User Onboarding & Product Tour**: Guided onboarding wizard for new users and an interactive product tour using `react-joyride` to introduce core features.
- **Analytics & Reporting**: Enterprise-level event tracking, live dashboard with real-time data (active staff, open shifts, compliance rates), and robust reporting capabilities (attendance, overtime, float pool, agency usage).
- **Job Management**: Functionality for job postings, interview scheduling, and application tracking with dedicated database tables.
- **Security**: Strict access controls on administrative pages, systematic API security hardening, and advanced frontend route protection based on RBAC.

### Recent Changes (August 8, 2025)
- **Navigation Consolidation**: Fixed duplicate mobile navigation dropdowns by removing redundant EnhancedMobileNavigation component and consolidating into a single DropdownMenu-based navigation system in UnifiedHeader for better UX consistency
- **Teams API Fix**: Added temporary teams route directly in auth.ts to bypass modular routing issues, enabling teams page to display 8 teams from database correctly
- **Dashboard Loading Fix**: Fixed "Bad JSON from /api/dashboard/stats" error by adding a temporary dashboard route directly in auth.ts to bypass modular routing system issues with Vite middleware interception
- **Super Admin Dashboard**: Changed super admin dashboard rendering from redirect-based to direct component rendering in HomePage to prevent blank screen issues
- **Quick Action Menu**: Implemented floating action button (FAB) with role-based quick actions for rapid team and scheduling operations, featuring smooth animations and scroll-aware visibility

## External Dependencies
- **PostgreSQL**: Primary database for all application data.
- **Drizzle ORM**: Used for interacting with the PostgreSQL database.
- **Passport.js**: For authentication, specifically session-based.
- **WebSockets**: For real-time communication and live updates.
- **Tailwind CSS**: Utility-first CSS framework for styling.
- **shadcn/ui**: Component library built with Tailwind CSS.
- **React-Joyride**: For implementing in-app product tours.
- **Google Calendar API (via OAuth2)**: For two-way calendar synchronization.