/**
 * Central route registry for NexSpace application
 * Groups all application routes by user type for easy navigation
 */

export type RouteGroup = "OVERVIEW" | "ADMIN" | "FACILITY" | "WORKER" | "ANALYTICS" | "BILLING" | "SCHEDULING";

export interface RouteDef {
  path: string;
  label: string;
  group: RouteGroup;
  required?: string[];
  description?: string;
}

export const routes: RouteDef[] = [
  // ============ OVERVIEW ============
  { 
    path: "/", 
    label: "Dashboard", 
    group: "OVERVIEW",
    description: "Main dashboard with drag-and-drop cards"
  },
  { 
    path: "/facility", 
    label: "Facility Dashboard", 
    group: "OVERVIEW",
    description: "Facility user dashboard"
  },
  { 
    path: "/staff", 
    label: "Staff Dashboard", 
    group: "OVERVIEW",
    description: "Staff member dashboard"
  },
  
  // ============ ADMIN ============
  { 
    path: "/admin", 
    label: "Admin Analytics", 
    group: "ADMIN",
    required: ["admin.access"],
    description: "Administrator analytics and overview"
  },
  { 
    path: "/admin/impersonation", 
    label: "User Impersonation", 
    group: "ADMIN",
    required: ["admin.impersonate"],
    description: "Impersonate other users for support"
  },
  { 
    path: "/admin/teams", 
    label: "Teams", 
    group: "ADMIN",
    required: ["admin.teams"],
    description: "Manage organizational teams"
  },
  { 
    path: "/admin/audit", 
    label: "Audit Log", 
    group: "ADMIN",
    required: ["admin.audit"],
    description: "System audit trail and logs"
  },
  { 
    path: "/admin/database", 
    label: "Database Console", 
    group: "ADMIN",
    required: ["admin.database"],
    description: "Database management console"
  },
  { 
    path: "/admin/analytics", 
    label: "System Analytics", 
    group: "ADMIN",
    required: ["admin.analytics"],
    description: "System-wide analytics"
  },
  { 
    path: "/admin/roles", 
    label: "Roles & Access", 
    group: "ADMIN",
    required: ["admin.roles"],
    description: "Role management and permissions"
  },
  { 
    path: "/system-settings", 
    label: "System Settings", 
    group: "ADMIN",
    required: ["admin.settings"],
    description: "Global system configuration"
  },
  
  // ============ FACILITY ============
  { 
    path: "/facility-management", 
    label: "Facility Management", 
    group: "FACILITY",
    required: ["facilities.view"],
    description: "Manage facility settings and operations"
  },
  { 
    path: "/facility-profile", 
    label: "Facility Profile", 
    group: "FACILITY",
    required: ["facilities.view_profile"],
    description: "View and edit facility profile"
  },
  { 
    path: "/facility-settings", 
    label: "Facility Settings", 
    group: "FACILITY",
    required: ["facilities.manage_settings"],
    description: "Configure facility-specific settings"
  },
  { 
    path: "/facilities/users", 
    label: "Facility Users", 
    group: "FACILITY",
    required: ["users.view"],
    description: "Manage facility user accounts"
  },
  { 
    path: "/facility-audit-logs", 
    label: "Facility Audit Logs", 
    group: "FACILITY",
    required: ["system.view_audit_logs"],
    description: "Facility-specific audit trail"
  },
  { 
    path: "/facility/jobs", 
    label: "Job Postings", 
    group: "FACILITY",
    required: ["shifts.create"],
    description: "Create and manage job postings"
  },
  { 
    path: "/workforce", 
    label: "Staff Management", 
    group: "FACILITY",
    required: ["staff.view"],
    description: "Comprehensive staff management"
  },
  { 
    path: "/staff-directory", 
    label: "Staff Directory", 
    group: "FACILITY",
    required: ["staff.view"],
    description: "View all staff members"
  },
  { 
    path: "/teams", 
    label: "Teams", 
    group: "FACILITY",
    description: "Team management and collaboration"
  },
  { 
    path: "/compliance", 
    label: "Compliance", 
    group: "FACILITY",
    required: ["compliance.view"],
    description: "Compliance tracking and reporting"
  },
  { 
    path: "/referral-system", 
    label: "Referral System", 
    group: "FACILITY",
    description: "Employee referral program"
  },
  { 
    path: "/workflow-automation", 
    label: "Workflow Automation", 
    group: "FACILITY",
    description: "Automated workflow configuration"
  },
  
  // ============ SCHEDULING ============
  { 
    path: "/calendar", 
    label: "Calendar View", 
    group: "SCHEDULING",
    description: "Interactive shift calendar"
  },
  { 
    path: "/schedule", 
    label: "Schedule", 
    group: "SCHEDULING",
    required: ["shift.view"],
    description: "Main scheduling interface"
  },
  { 
    path: "/shift-templates", 
    label: "Shift Templates", 
    group: "SCHEDULING",
    description: "Manage recurring shift patterns"
  },
  { 
    path: "/facility-schedule", 
    label: "Facility Schedule", 
    group: "SCHEDULING",
    description: "Facility-wide scheduling view"
  },
  { 
    path: "/advanced-scheduling", 
    label: "Advanced Scheduling", 
    group: "SCHEDULING",
    description: "Advanced scheduling tools"
  },
  { 
    path: "/scheduling-config", 
    label: "Scheduling Config", 
    group: "SCHEDULING",
    description: "Configure scheduling rules"
  },
  { 
    path: "/shifts-open", 
    label: "Open Shifts", 
    group: "SCHEDULING",
    description: "View available shifts"
  },
  { 
    path: "/shift-requests", 
    label: "Shift Requests", 
    group: "SCHEDULING",
    description: "Manage shift change requests"
  },
  { 
    path: "/time-clock", 
    label: "Time Clock", 
    group: "SCHEDULING",
    required: ["timesheet.submit"],
    description: "Clock in/out interface"
  },
  { 
    path: "/attendance", 
    label: "Attendance", 
    group: "SCHEDULING",
    required: ["analytics.view_attendance"],
    description: "Attendance tracking"
  },
  
  // ============ ANALYTICS ============
  { 
    path: "/analytics", 
    label: "Analytics Dashboard", 
    group: "ANALYTICS",
    required: ["analytics.view"],
    description: "Analytics overview"
  },
  { 
    path: "/analytics/shifts", 
    label: "Shift Analytics", 
    group: "ANALYTICS",
    required: ["analytics.view"],
    description: "Detailed shift analysis"
  },
  { 
    path: "/analytics/float-pool", 
    label: "Float Pool Analytics", 
    group: "ANALYTICS",
    required: ["analytics.view_float_pool"],
    description: "Float pool utilization metrics"
  },
  { 
    path: "/analytics/overtime", 
    label: "Overtime Report", 
    group: "ANALYTICS",
    required: ["analytics.view_overtime"],
    description: "Overtime analysis and trends"
  },
  { 
    path: "/analytics/attendance", 
    label: "Attendance Analytics", 
    group: "ANALYTICS",
    required: ["analytics.view_attendance"],
    description: "Attendance patterns and metrics"
  },
  { 
    path: "/analytics/agency-usage", 
    label: "Agency Usage", 
    group: "ANALYTICS",
    required: ["analytics.view_agency_usage"],
    description: "Agency staff utilization"
  },
  { 
    path: "/analytics/compliance", 
    label: "Compliance Analytics", 
    group: "ANALYTICS",
    required: ["compliance.view"],
    description: "Compliance metrics and reporting"
  },
  { 
    path: "/reports", 
    label: "Reports", 
    group: "ANALYTICS",
    description: "Generate and view reports"
  },
  
  // ============ BILLING ============
  { 
    path: "/billing", 
    label: "Billing Overview", 
    group: "BILLING",
    description: "Billing dashboard"
  },
  { 
    path: "/billing-dashboard", 
    label: "Billing Dashboard", 
    group: "BILLING",
    description: "Detailed billing metrics"
  },
  { 
    path: "/billing-rates", 
    label: "Rate Management", 
    group: "BILLING",
    description: "Manage billing rates"
  },
  { 
    path: "/invoices", 
    label: "Invoices", 
    group: "BILLING",
    required: ["invoice.view"],
    description: "Invoice management"
  },
  { 
    path: "/vendor-invoices", 
    label: "Vendor Invoices", 
    group: "BILLING",
    description: "Vendor invoice processing"
  },
  
  // ============ WORKER ============
  { 
    path: "/my-schedule", 
    label: "My Schedule", 
    group: "WORKER",
    description: "Personal work schedule"
  },
  { 
    path: "/my-requests", 
    label: "My Requests", 
    group: "WORKER",
    description: "Shift and time-off requests"
  },
  { 
    path: "/worker-open-shifts", 
    label: "Available Shifts", 
    group: "WORKER",
    description: "Browse open shifts"
  },
  { 
    path: "/resources", 
    label: "Resources", 
    group: "WORKER",
    description: "Training and resource library"
  },
  { 
    path: "/credentials", 
    label: "My Credentials", 
    group: "WORKER",
    required: ["credential.upload"],
    description: "Manage certifications and credentials"
  },
  { 
    path: "/messages", 
    label: "Messages", 
    group: "WORKER",
    required: ["message.view"],
    description: "Internal messaging"
  },
  { 
    path: "/messaging", 
    label: "Real-time Messaging", 
    group: "WORKER",
    description: "Live chat and messaging"
  },
  { 
    path: "/notifications", 
    label: "Notifications", 
    group: "WORKER",
    description: "System notifications"
  },
  { 
    path: "/profile", 
    label: "Profile Settings", 
    group: "WORKER",
    description: "Personal profile and preferences"
  },
  { 
    path: "/my-profile", 
    label: "Enhanced Profile", 
    group: "WORKER",
    description: "Detailed profile management"
  },
  { 
    path: "/referrals", 
    label: "My Referrals", 
    group: "WORKER",
    description: "Referral program participation"
  },
  { 
    path: "/job-board", 
    label: "Job Board", 
    group: "WORKER",
    description: "Browse job opportunities"
  },
  { 
    path: "/job-postings", 
    label: "Job Postings", 
    group: "WORKER",
    description: "View all job postings"
  },
  { 
    path: "/settings", 
    label: "Settings", 
    group: "WORKER",
    description: "Account settings"
  },
  
  // ============ ADDITIONAL FACILITY PAGES ============
  { 
    path: "/facility/dashboard", 
    label: "Facility Dash (Old)", 
    group: "FACILITY",
    description: "Legacy facility dashboard view"
  },
  { 
    path: "/facility/shifts", 
    label: "Facility Shifts", 
    group: "FACILITY",
    description: "Facility shift management"
  },
  { 
    path: "/facility/staff", 
    label: "Facility Staff", 
    group: "FACILITY",
    description: "Facility staff overview"
  },
  { 
    path: "/facility/jobs-alt", 
    label: "Alt Job Postings", 
    group: "FACILITY",
    description: "Alternative job posting interface"
  },
  
  // ============ ADDITIONAL WORKER PAGES ============
  { 
    path: "/unified-messaging", 
    label: "Unified Messaging", 
    group: "WORKER",
    description: "Unified messaging system"
  },
  { 
    path: "/mvp/credentials", 
    label: "MVP Credentials", 
    group: "WORKER",
    description: "MVP credentials interface"
  },
  { 
    path: "/mvp/shift-requests", 
    label: "MVP Shift Requests", 
    group: "WORKER",
    description: "MVP shift request system"
  },
  { 
    path: "/profile-editor", 
    label: "Profile Editor", 
    group: "WORKER",
    description: "Advanced profile editor"
  },
  { 
    path: "/user-profile", 
    label: "User Profile", 
    group: "WORKER",
    description: "User profile page"
  },
  { 
    path: "/create-job-posting", 
    label: "Create Job Posting", 
    group: "FACILITY",
    description: "Create new job posting"
  },
  
  // ============ DEVELOPMENT & TESTING ============
  { 
    path: "/test", 
    label: "Test Page", 
    group: "ADMIN",
    description: "Testing and debugging interface"
  },
  { 
    path: "/design-system", 
    label: "Design System Demo", 
    group: "ADMIN",
    description: "UI component showcase"
  },
  { 
    path: "/ui-improvements", 
    label: "UI Improvements Demo", 
    group: "ADMIN",
    description: "UI enhancement demonstrations"
  },
  { 
    path: "/onboarding", 
    label: "Onboarding Wizard", 
    group: "ADMIN",
    description: "New user onboarding flow"
  }
];

// Helper functions for route management
export function getRoutesByGroup(group: RouteGroup): RouteDef[] {
  return routes.filter(route => route.group === group);
}

export function getRouteByPath(path: string): RouteDef | undefined {
  return routes.find(route => route.path === path);
}

export function getAllGroups(): RouteGroup[] {
  return ["OVERVIEW", "ADMIN", "FACILITY", "SCHEDULING", "ANALYTICS", "BILLING", "WORKER"];
}

export function getGroupLabel(group: RouteGroup): string {
  const labels: Record<RouteGroup, string> = {
    OVERVIEW: "Overview",
    ADMIN: "Administration",
    FACILITY: "Facility Management",
    SCHEDULING: "Scheduling & Time",
    ANALYTICS: "Analytics & Reports",
    BILLING: "Billing & Finance",
    WORKER: "Worker Self-Service"
  };
  return labels[group];
}