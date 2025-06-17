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
import SchedulingPage from "@/pages/scheduling-page";
import MessagingPage from "@/pages/messaging-page";
import AnalyticsPage from "@/pages/analytics-page";
import CredentialsPage from "@/pages/credentials-page";
import OpenShiftsPage from "@/pages/shifts-open-page";
import StaffPage from "@/pages/staff-page";
import TimeClockPage from "@/pages/time-clock-page";
import InvoicesPage from "@/pages/invoices-page";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <ProtectedRoute path="/" component={HomePage} />
      <ProtectedRoute path="/jobs" component={JobBoard} />
      <ProtectedRoute path="/scheduling" component={SchedulingPage} />
      <ProtectedRoute path="/calendar" component={SchedulingPage} />
      <ProtectedRoute path="/shifts/open" component={OpenShiftsPage} />
      <ProtectedRoute path="/time-clock" component={TimeClockPage} />
      <ProtectedRoute path="/staff" component={StaffPage} />
      <ProtectedRoute path="/staff/contractors" component={StaffPage} />
      <ProtectedRoute path="/messages" component={MessagingPage} />
      <ProtectedRoute path="/analytics" component={AnalyticsPage} />
      <ProtectedRoute path="/credentials" component={CredentialsPage} />
      <ProtectedRoute path="/invoices" component={InvoicesPage} />
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
