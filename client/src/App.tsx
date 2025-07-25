import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/use-auth";
import { SessionProvider } from "@/contexts/SessionContext";
import { ProtectedRoute } from "./lib/protected-route";
import { FacilityPermissionsProvider } from "@/hooks/use-facility-permissions";
import Layout from "@/components/Layout";
import { ShiftProvider } from "@/contexts/ShiftContext";
import { TimeClockProvider } from "@/contexts/TimeClockContext";
import { CredentialsProvider } from "@/contexts/CredentialsContext";
import { InsightsProvider } from "@/contexts/InsightsContext";
import { InvoiceProvider } from "@/contexts/InvoiceContext";
import { DashboardProvider } from "@/contexts/DashboardContext";
import { StaffProvider } from "@/contexts/StaffContext";
import { NotificationProvider } from "@/contexts/NotificationContext";
import { MessageProvider } from "@/contexts/MessageContext";
import { TeamProvider } from "@/contexts/TeamContext";
import { ProfileProvider } from "@/contexts/ProfileContext";
import { JobProvider } from "@/contexts/JobContext";
import { EnhancedCredentialProvider } from "@/contexts/EnhancedCredentialContext";
import { CredentialVerificationProvider } from "@/contexts/CredentialVerificationContext";
import { PTOProvider } from "@/contexts/PTOContext";
import { MessagingProvider } from "@/contexts/MessagingContext";
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
import StaffDirectory from "@/pages/StaffDirectory";
import TimeClockPage from "@/pages/time-clock-page";
import InvoicesPage from "@/pages/invoices-page";
import EnhancedReferralPage from "@/pages/enhanced-referral-page";
import CompliancePage from "@/pages/compliance-page";
import SettingsPage from "@/pages/settings-page";
import AdminImpersonationPage from "@/pages/admin-impersonation-page";
import FacilityManagementPage from "@/pages/facility-management-page";
import EnhancedJobPostingPage from "@/pages/enhanced-job-posting-page";

import ClinicianDashboardWrapper from "@/pages/clinician-dashboard-wrapper";
import EmployeeDashboardWrapper from "@/pages/employee-dashboard-wrapper";
import FacilityUserDashboard from "@/pages/FacilityUserDashboard";
import ContractorDashboardWrapper from "@/pages/contractor-dashboard-wrapper";

import FacilityRecommendationsPage from "@/pages/facility-recommendations-page";
import VendorInvoicesPage from "@/pages/vendor-invoices-page";
import AdminUserManagementPage from "@/pages/admin-user-management-page";
import AdminTeamsPage from "@/pages/admin-teams-page";
import AdminAuditLogsPage from "@/pages/admin-audit-logs-page";
import AdminDatabaseConsolePage from "@/pages/admin-database-console-page";
import SystemSettingsPage from "@/pages/system-settings-page";
import DetailedShiftAnalyticsPage from "@/pages/detailed-shift-analytics-page";
import SchedulingConfigPage from "@/pages/scheduling-config-page";
import NotificationsPage from "@/pages/notifications-page";
import PTOPage from "@/pages/pto-page";
import EnhancedProfilePage from "@/pages/enhanced-profile-page";
import EnhancedMessagingPage from "@/pages/enhanced-messaging-page";
import MySchedulePage from "@/pages/MySchedulePage";
import EnhancedCalendarPage from "@/pages/enhanced-calendar-page";
import SchedulingTemplatesPage from "@/pages/scheduling-templates-page";
import ShiftTemplatesPage from "@/pages/shift-templates-page";
import AdvancedSchedulingPage from "@/pages/advanced-scheduling-page";
import FacilitySchedulePage from "@/pages/facility-schedule-page";
import WorkerOpenShiftsPage from "@/pages/worker-open-shifts-page";
import WorkerMyRequestsPage from "@/pages/worker-my-requests-page";
import FacilityProfilePage from "@/pages/FacilityProfilePage";
import FacilitySettingsPage from "@/pages/FacilitySettingsPage";
import FacilityUsersManagementPage from "@/pages/FacilityUsersManagementPage";
import FacilityAuditLogsPage from "@/pages/FacilityAuditLogsPage";
import BillingDashboard from "@/pages/BillingDashboard";
import RatesManagementPage from "@/pages/RatesManagementPage";
import ReportsPage from "@/pages/reports-page";
import MessagesPage from "@/pages/messages-page";
import JobPostingsPage from "@/pages/JobPostingsPage";
import CreateJobPostingPage from "@/pages/CreateJobPostingPage";
import ReferralSystemPage from "@/pages/ReferralSystemPage";
import WorkflowAutomationPage from "@/pages/WorkflowAutomationPage";
import AttendancePage from "@/pages/AttendancePage";
import OvertimeReportPage from "@/pages/OvertimeReportPage";
import FloatPoolAnalyticsPage from "@/pages/FloatPoolAnalyticsPage";
import AgencyUsagePage from "@/pages/AgencyUsagePage";
import NotFound from "@/pages/not-found";

function AppContent() {
  const [location] = useLocation();
  const isAuthPage = location === "/auth";

  const router = (
    <Switch>
      <ProtectedRoute path="/" component={HomePage} />
      <ProtectedRoute path="/dashboard" component={HomePage} />
      <ProtectedRoute path="/facility-dashboard" component={FacilityUserDashboard} />
      <ProtectedRoute path="/workforce" component={EnhancedStaffPage} />
      <ProtectedRoute path="/billing" component={InvoicesPage} />
      <ProtectedRoute path="/billing-dashboard" component={BillingDashboard} />
      <ProtectedRoute path="/billing-rates" component={RatesManagementPage} />
      <ProtectedRoute path="/jobs" component={EnhancedJobBoard} />
      <ProtectedRoute path="/jobs/post" component={EnhancedJobPostingPage} />
      <ProtectedRoute path="/job-board" component={EnhancedJobBoard} />
      <ProtectedRoute path="/schedule" component={EnhancedCalendarPage} />
      <ProtectedRoute path="/calendar" component={EnhancedCalendarPage} />
      <ProtectedRoute path="/calendar-view" component={EnhancedCalendarPage} />
      <ProtectedRoute path="/enhanced-calendar" component={EnhancedCalendarPage} />
      <ProtectedRoute path="/shift-templates" component={ShiftTemplatesPage} />
      <ProtectedRoute path="/facility-schedule" component={FacilitySchedulePage} />
      <ProtectedRoute path="/scheduling" component={ShiftTemplatesPage} />
      <ProtectedRoute path="/advanced-scheduling" component={AdvancedSchedulingPage} />
      <ProtectedRoute path="/scheduling-config" component={SchedulingConfigPage} />
      <ProtectedRoute path="/shifts-open" component={OpenShiftsPage} />
      <ProtectedRoute path="/worker-open-shifts" component={WorkerOpenShiftsPage} />
      <ProtectedRoute path="/shift-requests" component={ShiftRequestsPage} />
      <ProtectedRoute path="/time-clock" component={TimeClockPage} />
      <ProtectedRoute path="/staff" component={EnhancedStaffPage} />
      <ProtectedRoute path="/staff-directory" component={StaffDirectory} />
      <ProtectedRoute path="/staff/contractors" component={EnhancedStaffPage} />
      <ProtectedRoute path="/referrals" component={EnhancedReferralPage} />
      <ProtectedRoute path="/staff/referrals" component={EnhancedReferralPage} />
      <ProtectedRoute path="/analytics" component={AnalyticsPage} />
      <ProtectedRoute path="/analytics/shifts" component={DetailedShiftAnalyticsPage} />
      <ProtectedRoute path="/analytics/float-pool" component={FloatPoolAnalyticsPage} />
      <ProtectedRoute path="/analytics/overtime" component={OvertimeReportPage} />
      <ProtectedRoute path="/analytics/attendance" component={AttendancePage} />
      <ProtectedRoute path="/analytics/agency-usage" component={AgencyUsagePage} />
      <ProtectedRoute path="/analytics/compliance" component={CompliancePage} />
      <ProtectedRoute path="/compliance" component={CompliancePage} />
      <ProtectedRoute path="/messages" component={MessagesPage} />
      <ProtectedRoute path="/messaging" component={EnhancedMessagingPage} />
      <ProtectedRoute path="/reports" component={ReportsPage} />
      <ProtectedRoute path="/notifications" component={NotificationsPage} />
      <ProtectedRoute path="/job-board" component={EnhancedJobBoard} />
      <ProtectedRoute path="/profile" component={SettingsPage} />
      <ProtectedRoute path="/my-profile" component={EnhancedProfilePage} />
      <ProtectedRoute path="/teams" component={EnhancedStaffPage} />
      <ProtectedRoute path="/my-requests" component={WorkerMyRequestsPage} />
      <ProtectedRoute path="/my-schedule" component={MySchedulePage} />
      <ProtectedRoute path="/resources" component={CredentialsPage} />
      <ProtectedRoute path="/my-pto" component={PTOPage} />
      <ProtectedRoute path="/credentials" component={CredentialsPage} />
      <ProtectedRoute path="/invoices" component={InvoicesPage} />
      <ProtectedRoute path="/vendor-invoices" component={VendorInvoicesPage} />
      <ProtectedRoute path="/settings" component={SettingsPage} />
      <ProtectedRoute path="/system-settings" component={SystemSettingsPage} />
      <ProtectedRoute path="/admin/impersonation" component={AdminImpersonationPage} />
      <ProtectedRoute path="/admin/users" component={AdminUserManagementPage} />
      <ProtectedRoute path="/admin/teams" component={AdminTeamsPage} />
      <ProtectedRoute path="/admin/audit" component={AdminAuditLogsPage} />
      <ProtectedRoute path="/admin/database" component={AdminDatabaseConsolePage} />
      <ProtectedRoute path="/facility-management" component={FacilityManagementPage} />
      <ProtectedRoute path="/facility-profile" component={FacilityProfilePage} />
      <ProtectedRoute path="/facility-settings" component={FacilitySettingsPage} />
      <ProtectedRoute path="/facility-users" component={FacilityUsersManagementPage} />
      <ProtectedRoute path="/facility-audit-logs" component={FacilityAuditLogsPage} />
      <ProtectedRoute path="/job-postings" component={JobPostingsPage} />
      <ProtectedRoute path="/create-job-posting" component={CreateJobPostingPage} />
      <ProtectedRoute path="/referral-system" component={ReferralSystemPage} />
      <ProtectedRoute path="/workflow-automation" component={WorkflowAutomationPage} />
      <ProtectedRoute path="/attendance" component={AttendancePage} />
      <ProtectedRoute path="/overtime-report" component={OvertimeReportPage} />
      <ProtectedRoute path="/float-pool-analytics" component={FloatPoolAnalyticsPage} />
      <ProtectedRoute path="/agency-usage" component={AgencyUsagePage} />
      <ProtectedRoute path="/job-posting" component={EnhancedJobPostingPage} />
      <ProtectedRoute path="/clinician-dashboard" component={ClinicianDashboardWrapper} />
      <ProtectedRoute path="/employee-dashboard" component={EmployeeDashboardWrapper} />
      <ProtectedRoute path="/contractor-dashboard" component={ContractorDashboardWrapper} />
      <ProtectedRoute path="/facility-recommendations" component={FacilityRecommendationsPage} />
      <ProtectedRoute path="/detailed-shift-analytics" component={DetailedShiftAnalyticsPage} />
      <Route path="/auth" component={AuthPage} />
      <Route component={NotFound} />
    </Switch>
  );

  if (isAuthPage) {
    return router;
  }

  return <Layout>{router}</Layout>;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <SessionProvider>
          <FacilityPermissionsProvider>
            <NotificationProvider>
              <ShiftProvider>
              <TimeClockProvider>
                <StaffProvider>
                  <TeamProvider>
                    <MessageProvider>
                      <MessagingProvider>
                        <EnhancedCredentialProvider>
                          <CredentialVerificationProvider>
                            <PTOProvider>
                              <JobProvider>
                                <ProfileProvider>
                                  <CredentialsProvider>
                                    <InsightsProvider>
                                      <InvoiceProvider>
                                        <DashboardProvider>
                                          <TooltipProvider>
                                            <Toaster />
                                            <AppContent />
                                          </TooltipProvider>
                                        </DashboardProvider>
                                      </InvoiceProvider>
                                    </InsightsProvider>
                                  </CredentialsProvider>
                                </ProfileProvider>
                              </JobProvider>
                            </PTOProvider>
                          </CredentialVerificationProvider>
                        </EnhancedCredentialProvider>
                      </MessagingProvider>
                  </MessageProvider>
                </TeamProvider>
              </StaffProvider>
            </TimeClockProvider>
          </ShiftProvider>
        </NotificationProvider>
          </FacilityPermissionsProvider>
        </SessionProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
