import EmployeeDashboardPage from "./employee-dashboard-page";
import { ErrorBoundary } from "@/components/ErrorBoundary";

export default function EmployeeDashboardWrapper() {
  return (
    <ErrorBoundary>
      <EmployeeDashboardPage />
    </ErrorBoundary>
  );
}
