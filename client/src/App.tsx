import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/use-auth";
import { ProtectedRoute } from "./lib/protected-route";
import Layout from "@/components/Layout";
import HomePage from "@/pages/home-page";
import AuthPage from "@/pages/auth-page";
import JobBoard from "@/pages/job-board";
import EnhancedJobBoard from "@/pages/enhanced-job-board";
import UnifiedCalendarPage from "@/pages/unified-calendar-page";
import MessagingPage from "@/pages/messaging-page";
import AnalyticsPage from "@/pages/analytics-page";
import CredentialsPage from "@/pages/credentials-page";
import OpenShiftsPage from "@/pages/shifts-open-page";
import ShiftRequestsPage from "@/pages/shift-requests-page";
import EnhancedStaffPage from "@/pages/enhanced-staff-page";
import TimeClockPage from "@/pages/time-clock-page";
import InvoicesPage from "@/pages/invoices-page";
import EnhancedReferralPage from "@/pages/enhanced-referral-page";
import OvertimeReportPage from "@/pages/overtime-report-page";
import AttendancePage from "@/pages/attendance-page";
import AgencyUsagePage from "@/pages/agency-usage-page";
import CompliancePage from "@/pages/compliance-page";
import SettingsPage from "@/pages/settings-page";
import AdminImpersonationPage from "@/pages/admin-impersonation-page";
import FacilityManagementPage from "@/pages/facility-management-page";
import EnhancedJobPostingPage from "@/pages/enhanced-job-posting-page";
import WorkflowAutomationPage from "@/pages/workflow-automation-page";
import ClinicianDashboardWrapper from "@/pages/clinician-dashboard-wrapper";
import EmployeeDashboardWrapper from "@/pages/employee-dashboard-wrapper";
import ContractorDashboardWrapper from "@/pages/contractor-dashboard-wrapper";
import FloatPoolAnalyticsPage from "@/pages/float-pool-analytics-page";
import FacilityRecommendationsPage from "@/pages/facility-recommendations-page";
import VendorInvoicesPage from "@/pages/vendor-invoices-page";
import AdminUserManagementPage from "@/pages/admin-user-management-page";
import AdminAuditLogsPage from "@/pages/admin-audit-logs-page";
import AdminDatabaseConsolePage from "@/pages/admin-database-console-page";
import SystemSettingsPage from "@/pages/system-settings-page";
import DetailedShiftAnalyticsPage from "@/pages/detailed-shift-analytics-page";
import SchedulingConfigPage from "@/pages/scheduling-config-page";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <ProtectedRoute path="/" component={HomePage} />
      <ProtectedRoute path="/jobs" component={EnhancedJobBoard} />
      <ProtectedRoute path="/job-board" component={EnhancedJobBoard} />
      <ProtectedRoute path="/calendar" component={UnifiedCalendarPage} />
      <ProtectedRoute path="/calendar-view" component={UnifiedCalendarPage} />
      <ProtectedRoute path="/scheduling" component={UnifiedCalendarPage} />
      <ProtectedRoute path="/advanced-scheduling" component={UnifiedCalendarPage} />
      <ProtectedRoute path="/scheduling-config" component={SchedulingConfigPage} />
      <ProtectedRoute path="/shifts-open" component={OpenShiftsPage} />
      <ProtectedRoute path="/shift-requests" component={ShiftRequestsPage} />
      <ProtectedRoute path="/time-clock" component={TimeClockPage} />
      <ProtectedRoute path="/staff" component={EnhancedStaffPage} />
      <ProtectedRoute path="/staff/contractors" component={EnhancedStaffPage} />
      <ProtectedRoute path="/referrals" component={EnhancedReferralPage} />
      <ProtectedRoute path="/staff/referrals" component={EnhancedReferralPage} />
      <ProtectedRoute path="/analytics" component={AnalyticsPage} />
      <ProtectedRoute path="/analytics/float-pool" component={FloatPoolAnalyticsPage} />
      <ProtectedRoute path="/analytics/overtime" component={OvertimeReportPage} />
      <ProtectedRoute path="/analytics/attendance" component={AttendancePage} />
      <ProtectedRoute path="/analytics/agency" component={AgencyUsagePage} />
      <ProtectedRoute path="/analytics/compliance" component={CompliancePage} />
      <ProtectedRoute path="/messages" component={MessagingPage} />
      <ProtectedRoute path="/credentials" component={CredentialsPage} />
      <ProtectedRoute path="/invoices" component={InvoicesPage} />
      <ProtectedRoute path="/vendor-invoices" component={VendorInvoicesPage} />
      <ProtectedRoute path="/settings" component={SettingsPage} />
      <ProtectedRoute path="/system-settings" component={SystemSettingsPage} />
      <ProtectedRoute path="/admin/impersonation" component={AdminImpersonationPage} />
      <ProtectedRoute path="/admin/users" component={AdminUserManagementPage} />
      <ProtectedRoute path="/admin/audit" component={AdminAuditLogsPage} />
      <ProtectedRoute path="/admin/database" component={AdminDatabaseConsolePage} />
      <ProtectedRoute path="/facility-management" component={FacilityManagementPage} />
      <ProtectedRoute path="/job-posting" component={EnhancedJobPostingPage} />
      <ProtectedRoute path="/workflow-automation" component={WorkflowAutomationPage} />
      <ProtectedRoute path="/clinician-dashboard" component={ClinicianDashboardWrapper} />
      <ProtectedRoute path="/employee-dashboard" component={EmployeeDashboardWrapper} />
      <ProtectedRoute path="/contractor-dashboard" component={ContractorDashboardWrapper} />
      <ProtectedRoute path="/facility-recommendations" component={FacilityRecommendationsPage} />
      <ProtectedRoute path="/detailed-shift-analytics" component={DetailedShiftAnalyticsPage} />
      <Route path="/auth" component={AuthPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
