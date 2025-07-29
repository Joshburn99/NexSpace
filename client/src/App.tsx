import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/hooks/use-auth";
import { SessionProvider } from "@/contexts/SessionContext";
import { ProtectedRoute, AdminRoute, FacilityRoute } from "./lib/rbac-route-guard";
import { FacilityPermissionsProvider } from "@/hooks/use-facility-permissions";
import { RBACProvider } from "@/hooks/use-rbac";
import Layout from "@/components/Layout";
import { EnhancedErrorBoundary } from "@/components/enhanced-error-boundary";
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
import { EnhancedDataProvider } from "@/components/enhanced-data-provider";
import HomePage from "@/pages/home-page";
import AuthPage from "@/pages/auth-page";
import JobBoard from "@/pages/job-board";
import EnhancedJobBoard from "@/pages/enhanced-job-board";
import JobBoardPage from "@/pages/JobBoardPage";
import UnifiedCalendarPage from "@/pages/unified-calendar-page";
import MessagingPage from "@/pages/messaging-page";
import AnalyticsPage from "@/pages/analytics-page";
import CredentialsPage from "@/pages/credentials-page";
import OpenShiftsPage from "@/pages/shifts-open-page";
import ShiftRequestsPage from "@/pages/shift-requests-page";
import EnhancedStaffPage from "@/pages/enhanced-staff-page";
import StaffDirectory from "@/pages/StaffDirectory";
import AllStaffPage from "@/pages/all-staff-page";
import TimeClockPage from "@/pages/time-clock-page";
import InvoicesPage from "@/pages/invoices-page";
import EnhancedReferralPage from "@/pages/enhanced-referral-page";
import CompliancePage from "@/pages/compliance-page";
import SettingsPage from "@/pages/settings-page";
import AdminImpersonationPage from "@/pages/admin-impersonation-page";
import FacilityManagementPage from "@/pages/facility-management-page";
import SimpleFacilityManagement from "@/pages/simple-facility-management";
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
import AdminAnalytics from "@/pages/AdminAnalytics";
import SystemSettingsPage from "@/pages/system-settings-page";
import DetailedShiftAnalyticsPage from "@/pages/detailed-shift-analytics-page";
import SchedulingConfigPage from "@/pages/scheduling-config-page";
import NotificationsPage from "@/pages/notifications-page";
import PTOPage from "@/pages/pto-page";
import EnhancedProfilePage from "@/pages/enhanced-profile-page";
import EnhancedMessagingPage from "@/pages/enhanced-messaging-page";
import EnhancedRealTimeMessagingPage from "@/pages/enhanced-real-time-messaging";
import { OnboardingWizard } from "@/components/OnboardingWizard";
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
import UnifiedMessagingPage from "@/pages/unified-messaging";
import JobPostingsPage from "@/pages/JobPostingsPage";
import CreateJobPostingPage from "@/pages/CreateJobPostingPage";
import ReferralSystemPage from "@/pages/ReferralSystemPage";
import WorkflowAutomationPage from "@/pages/WorkflowAutomationPage";
import UserProfilePage from "@/pages/user-profile-page";
import AttendancePage from "@/pages/AttendancePage";
import OvertimeReportPage from "@/pages/OvertimeReportPage";
import FloatPoolAnalyticsPage from "@/pages/FloatPoolAnalyticsPage";
import AgencyUsagePage from "@/pages/AgencyUsagePage";
import RoleManagementPage from "@/pages/RoleManagementPage";
import NotFound from "@/pages/not-found";

function AppContent() {
  const [location] = useLocation();
  const isAuthPage = location === "/auth";
  const { user } = useAuth();

  // Show onboarding wizard for new users who haven't completed it
  if (user && !user.onboardingCompleted && !isAuthPage) {
    return <OnboardingWizard />;
  }

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
      <ProtectedRoute
        path="/staff"
        component={EnhancedStaffPage}
        requiredPermissions={["staff.view"]}
      />
      <ProtectedRoute
        path="/staff-directory"
        component={AllStaffPage}
        requiredPermissions={["staff.view"]}
      />
      <ProtectedRoute
        path="/staff/contractors"
        component={EnhancedStaffPage}
        requiredPermissions={["staff.view"]}
      />
      <ProtectedRoute path="/referrals" component={EnhancedReferralPage} />
      <ProtectedRoute path="/staff/referrals" component={EnhancedReferralPage} />
      <ProtectedRoute
        path="/analytics"
        component={AnalyticsPage}
        requiredPermissions={["analytics.view"]}
      />
      <ProtectedRoute
        path="/analytics/shifts"
        component={DetailedShiftAnalyticsPage}
        requiredPermissions={["analytics.view"]}
      />
      <ProtectedRoute
        path="/analytics/float-pool"
        component={FloatPoolAnalyticsPage}
        requiredPermissions={["analytics.view_float_pool"]}
      />
      <ProtectedRoute
        path="/analytics/overtime"
        component={OvertimeReportPage}
        requiredPermissions={["analytics.view_overtime"]}
      />
      <ProtectedRoute
        path="/analytics/attendance"
        component={AttendancePage}
        requiredPermissions={["analytics.view_attendance"]}
      />
      <ProtectedRoute
        path="/analytics/agency-usage"
        component={AgencyUsagePage}
        requiredPermissions={["analytics.view_agency_usage"]}
      />
      <ProtectedRoute
        path="/analytics/compliance"
        component={CompliancePage}
        requiredPermissions={["compliance.view"]}
      />
      <ProtectedRoute path="/analytics/insights" component={AnalyticsPage} />
      <ProtectedRoute path="/compliance" component={CompliancePage} />
      <ProtectedRoute path="/messages" component={MessagesPage} />
      <ProtectedRoute path="/messaging" component={EnhancedRealTimeMessagingPage} />
      <ProtectedRoute path="/unified-messaging" component={UnifiedMessagingPage} />
      <ProtectedRoute path="/reports" component={ReportsPage} />
      <ProtectedRoute path="/notifications" component={NotificationsPage} />
      <ProtectedRoute path="/job-board" component={JobBoardPage} />
      <ProtectedRoute path="/profile" component={SettingsPage} />
      <ProtectedRoute path="/my-profile" component={EnhancedProfilePage} />
      <ProtectedRoute path="/user-profile" component={UserProfilePage} />
      <ProtectedRoute path="/teams" component={AdminTeamsPage} />
      <ProtectedRoute path="/my-requests" component={WorkerMyRequestsPage} />
      <ProtectedRoute path="/my-schedule" component={MySchedulePage} />
      <ProtectedRoute path="/resources" component={CredentialsPage} />

      <ProtectedRoute path="/credentials" component={CredentialsPage} />
      <ProtectedRoute path="/invoices" component={InvoicesPage} />
      <ProtectedRoute path="/vendor-invoices" component={VendorInvoicesPage} />
      <ProtectedRoute path="/settings" component={SettingsPage} />
      <ProtectedRoute path="/system-settings" component={SystemSettingsPage} />
      <AdminRoute path="/admin/impersonation" component={AdminImpersonationPage} />
      <AdminRoute path="/admin/users" component={AdminUserManagementPage} />
      <AdminRoute path="/admin/teams" component={AdminTeamsPage} />
      <AdminRoute path="/admin/audit" component={AdminAuditLogsPage} />
      <AdminRoute path="/admin/audit-logs" component={AdminAuditLogsPage} />
      <AdminRoute path="/admin/database" component={AdminDatabaseConsolePage} />
      <AdminRoute path="/admin/analytics" component={AdminAnalytics} />
      <AdminRoute path="/admin/roles" component={RoleManagementPage} />
      <FacilityRoute
        path="/admin/facility-management"
        component={FacilityManagementPage}
        requiredPermissions={["facilities.view"]}
      />
      <FacilityRoute
        path="/facility-profile"
        component={FacilityProfilePage}
        requiredPermissions={["facilities.view_profile"]}
      />
      <FacilityRoute
        path="/facility-settings"
        component={FacilitySettingsPage}
        requiredPermissions={["facilities.manage_settings"]}
      />
      <FacilityRoute
        path="/facility-users"
        component={FacilityUsersManagementPage}
        requiredPermissions={["users.view"]}
      />
      <FacilityRoute
        path="/facility-audit-logs"
        component={FacilityAuditLogsPage}
        requiredPermissions={["system.view_audit_logs"]}
      />
      <ProtectedRoute path="/job-postings" component={JobPostingsPage} />
      <ProtectedRoute path="/create-job-posting" component={CreateJobPostingPage} />
      <ProtectedRoute path="/referral-system" component={ReferralSystemPage} />
      <ProtectedRoute path="/workflow-automation" component={WorkflowAutomationPage} />
      <ProtectedRoute path="/attendance" component={AttendancePage} />
      <ProtectedRoute path="/overtime-report" component={OvertimeReportPage} />
      <ProtectedRoute path="/float-pool-analytics" component={FloatPoolAnalyticsPage} />
      <ProtectedRoute path="/agency-usage" component={AgencyUsagePage} />
      <ProtectedRoute path="/job-posting" component={EnhancedJobPostingPage} />
      
      {/* Additional facility user routes */}
      <ProtectedRoute path="/billing-professional-invoices" component={InvoicesPage} />
      <ProtectedRoute path="/billing-vendor-invoices" component={VendorInvoicesPage} />
      <ProtectedRoute path="/analytics-dashboard" component={AnalyticsPage} />
      <ProtectedRoute path="/custom-reports" component={ReportsPage} />
      <ProtectedRoute path="/reports/attendance" component={AttendancePage} />
      <ProtectedRoute path="/reports/overtime" component={OvertimeReportPage} />
      <ProtectedRoute path="/reports/float-pool-savings" component={FloatPoolAnalyticsPage} />
      <ProtectedRoute path="/reports/agency-usage" component={AgencyUsagePage} />
      <ProtectedRoute path="/facilities" component={FacilityManagementPage} />
      <ProtectedRoute path="/enhanced-facilities" component={FacilityManagementPage} />
      <ProtectedRoute path="/all-facilities" component={FacilityManagementPage} />
      <ProtectedRoute path="/facility-profiles" component={FacilityManagementPage} />
      <ProtectedRoute path="/facility-management" component={FacilityManagementPage} />

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
          <RBACProvider>
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
          </RBACProvider>
        </SessionProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
