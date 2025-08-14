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

### Recent Changes (August 14, 2025)
- **All Pages Dropdown for Superusers**: Implemented comprehensive "All Pages" navigation dropdown exclusively for super admins, featuring:
  - Central route registry (`client/src/routes/registry.ts`) cataloging 85+ application routes
  - SuperNav component with categorized navigation (Overview, Admin, Facility, Scheduling, Analytics, Billing, Worker)
  - Real-time search functionality for quick page discovery
  - Visual grouping with icons and route counts per category
  - Permission indicators for restricted pages
  - Keyboard navigation support (ESC to close)
  - Integrated into TopBar for consistent access across the application

### Recent Changes (August 13, 2025 - Part 4)
- **Information Architecture Consolidation**: Completed comprehensive IA restructuring by migrating 57 facility users from `users` table to dedicated `facility_users` table, maintaining 3 superusers in the original users table
- **Facility Users Management**: Implemented full CRUD API endpoints at `/api/facility-users` with search, filtering, and pagination support
- **Navigation Restructuring**: Moved "User Management" from ADMIN to FACILITIES group, renamed to "Facility Users" with route `/facilities/users`
- **Auth System Update**: Modified authentication to check both `users` (superusers) and `facility_users` (facility staff) tables during login, with proper session handling and account type differentiation
- **Frontend Component**: Created comprehensive FacilityUsersPage component with full UI for managing facility users including create, edit, delete, and search functionality

### Recent Changes (August 13, 2025 - Part 3)
- **Critical Server Fix**: Resolved TypeScript compilation error in server/routes.ts by adding missing catch block for `/api/stop-impersonation` endpoint, fixing 500 Internal Server Errors that were preventing the application from loading

### Recent Changes (August 13, 2025 - Part 2)
- **Floating Action Button (FAB) Implementation**: Added animated FAB component for quick team operations with permission-based action filtering, smooth animations using framer-motion, context-aware actions (create shift, add staff, send message, view schedule, time clock, notifications), auto-hide on scroll behavior, and responsive backdrop blur effect
- **Dark Mode Toggle Fix**: Connected Application Preferences dark mode toggle to ThemeProvider, enabling functional theme switching that persists across sessions via localStorage

### Recent Changes (August 13, 2025)
- **Comprehensive Design System Implementation**: Built complete Tailwind-based design system with semantic color tokens (primary, secondary, success, warning, danger, muted), responsive typography scale, and consistent spacing system
- **UI Component Library**: Created reusable components including Button (with loading states), Badge, Input, Select, Card, Table, Tooltip, Skeleton, and EmptyState components with full accessibility support
- **App Shell Layout**: Implemented responsive app shell with collapsible sidebar navigation, breadcrumbs, user profile display, notification bell, and integrated dark mode toggle
- **Theme System**: Built ThemeProvider with persistent dark/light/system theme switching, CSS variables for dynamic theming, and automatic system preference detection
- **Enhanced Error Handling**: Created ErrorBoundary component with development-mode error details, user-friendly error messages, and retry functionality
- **Toast Notification System**: Implemented toast notification system with success/error/warning/info variants, auto-dismiss functionality, and smooth animations
- **Protected Routes**: Built ProtectedRoute component with authentication checks, permission-based access control, and loading states during auth verification
- **Design System Documentation**: Created comprehensive design system demo page showcasing all components, color palette, loading states, and interactive examples at `/design-system` route

### Recent Changes (August 12, 2025)
- **Database Safety & Operations**: Created comprehensive database backup, restore, and reset scripts with automatic safety features, rollback procedures, and verification checks
- **Comprehensive UI Quality Improvements**: Implemented advanced loading skeletons, empty states, error handling, and quick filters to significantly enhance user experience and perceived performance
- **Database Rollback Documentation**: Built complete rollback playbook with 6-step emergency checklist, troubleshooting guides, and safety procedures for failed migrations
- **Normalized Date/Time Handling**: Created comprehensive date utilities with timezone awareness, consistent formatting across all components, and relative time display using date-fns library
- **Reusable Component Library**: Built LoadingSkeletons.tsx, EmptyStates.tsx, and QuickFilters.tsx components for consistent UI patterns and rapid development
- **Enhanced Calendar & Staff Pages**: Integrated new UI improvements into ShiftCalendar.tsx and enhanced-staff-page.tsx with sophisticated loading states and empty state handling
- **UI Improvements Demo**: Created comprehensive demonstration component showcasing all UI enhancements with interactive examples and documentation

### Previous Changes (August 12, 2025)
- **JWT Authentication System**: Implemented comprehensive JWT-based authentication with access tokens (24h expiry) and refresh tokens (7d expiry), supporting both Bearer token and session-based authentication for backwards compatibility
- **Role-Based Middleware**: Created robust authentication and authorization middleware with `authenticate`, `authorize`, and `requirePermission` functions for granular access control
- **Enhanced ProtectedRoute Component**: Built comprehensive frontend route protection with proper 401/403 state handling, user-friendly error messages, and permission-based UI adaptation
- **Authentication Testing Suite**: Developed complete test suite validating authentication flows, including unauthenticated (401), unauthorized (403), and successful authorized requests with curl and fetch examples
- **Permission System Integration**: Connected 43 role permissions across super_admin, facility_manager, and staff roles with middleware enforcement on all API endpoints
- **Comprehensive API Wrapper Utility**: Created robust `ApiClient` class with configurable timeouts (10s default), exponential backoff retries with jitter (3 attempts default), TypeScript validation via Zod schemas, comprehensive error logging with unique request IDs, and intelligent retry logic that skips 4xx client errors
- **External API Integration**: Refactored facility import service to use new API wrapper for CMS and NPI Registry calls, with proper error handling and response validation. Added pre-configured clients for common healthcare APIs
- **Enhanced OpenAPI Documentation**: Configured Swagger UI at `/docs` endpoint with comprehensive API documentation, authentication schemas for both session and JWT token auth, and detailed endpoint specifications for all major API routes
- **Environment Configuration**: Standardized external API configuration through environment variables with proper fallbacks and timeout settings
- **Structured Logging System**: Implemented comprehensive pino-based structured logging with request-id correlation, centralized error handling, performance monitoring, and health check endpoints. Features include JSON-formatted logs, automatic stack trace logging, slow request detection, database query logging, and external API call monitoring
- **Health Check Monitoring**: Created comprehensive health check system with endpoints for basic health (`/health`), detailed system status (`/health/detailed`), readiness probes (`/health/ready`), liveness checks (`/health/live`), and system metrics (`/health/metrics`) for production monitoring

## External Dependencies
- **PostgreSQL**: Primary database for all application data.
- **Drizzle ORM**: Used for interacting with the PostgreSQL database.
- **Passport.js**: For authentication, specifically session-based.
- **WebSockets**: For real-time communication and live updates.
- **Tailwind CSS**: Utility-first CSS framework for styling.
- **shadcn/ui**: Component library built with Tailwind CSS.
- **React-Joyride**: For implementing in-app product tours.
- **Google Calendar API (via OAuth2)**: For two-way calendar synchronization.