import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/use-auth";
import { ProtectedRoute } from "./lib/protected-route";
import HomePage from "@/pages/home-page";
import AuthPage from "@/pages/auth-page";
import JobBoard from "@/pages/job-board";
import EnhancedJobBoard from "@/pages/enhanced-job-board";
import SchedulingPage from "@/pages/scheduling-page";
import EnhancedSchedulingPage from "@/pages/enhanced-scheduling-page";
import CalendarViewPage from "@/pages/calendar-view-page";
import MessagingPage from "@/pages/messaging-page";
import AnalyticsPage from "@/pages/analytics-page";
import CredentialsPage from "@/pages/credentials-page";
import OpenShiftsPage from "@/pages/shifts-open-page";
import ShiftRequestsPage from "@/pages/shift-requests-page";
import StaffPage from "@/pages/staff-page";
import TimeClockPage from "@/pages/time-clock-page";
import InvoicesPage from "@/pages/invoices-page";
import ReferralPage from "@/pages/referral-page";
import OvertimeReportPage from "@/pages/overtime-report-page";
import AttendancePage from "@/pages/attendance-page";
import AgencyUsagePage from "@/pages/agency-usage-page";
import CompliancePage from "@/pages/compliance-page";
import SettingsPage from "@/pages/settings-page";
import AdminImpersonationPage from "@/pages/admin-impersonation-page";
import FacilityManagementPage from "@/pages/facility-management-page";
import EnhancedJobPostingPage from "@/pages/enhanced-job-posting-page";
import WorkflowAutomationPage from "@/pages/workflow-automation-page";
import AdvancedSchedulingPage from "@/pages/advanced-scheduling-page";
import ClinicianDashboardPage from "@/pages/clinician-dashboard-page";
import EmployeeDashboardPage from "@/pages/employee-dashboard-page";
import ContractorDashboardPage from "@/pages/contractor-dashboard-page";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <ProtectedRoute path="/" component={HomePage} />
      <ProtectedRoute path="/jobs" component={EnhancedJobBoard} />
      <ProtectedRoute path="/job-board" component={EnhancedJobBoard} />
      <ProtectedRoute path="/scheduling" component={SchedulingPage} />
      <ProtectedRoute path="/calendar-view" component={CalendarViewPage} />
      <ProtectedRoute path="/calendar" component={EnhancedSchedulingPage} />
      <ProtectedRoute path="/shifts-open" component={OpenShiftsPage} />
      <ProtectedRoute path="/shift-requests" component={ShiftRequestsPage} />
      <ProtectedRoute path="/time-clock" component={TimeClockPage} />
      <ProtectedRoute path="/staff" component={StaffPage} />
      <ProtectedRoute path="/staff/contractors" component={StaffPage} />
      <ProtectedRoute path="/staff/referrals" component={ReferralPage} />
      <ProtectedRoute path="/analytics/overtime" component={OvertimeReportPage} />
      <ProtectedRoute path="/analytics/attendance" component={AttendancePage} />
      <ProtectedRoute path="/analytics/agency" component={AgencyUsagePage} />
      <ProtectedRoute path="/analytics/compliance" component={CompliancePage} />
      <ProtectedRoute path="/analytics" component={AnalyticsPage} />
      <ProtectedRoute path="/messages" component={MessagingPage} />
      <ProtectedRoute path="/credentials" component={CredentialsPage} />
      <ProtectedRoute path="/invoices" component={InvoicesPage} />
      <ProtectedRoute path="/settings" component={SettingsPage} />
      <ProtectedRoute path="/admin/impersonation" component={AdminImpersonationPage} />
      <ProtectedRoute path="/facility-management" component={FacilityManagementPage} />
      <ProtectedRoute path="/job-posting" component={EnhancedJobPostingPage} />
      <ProtectedRoute path="/workflow-automation" component={WorkflowAutomationPage} />
      <ProtectedRoute path="/advanced-scheduling" component={AdvancedSchedulingPage} />
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
