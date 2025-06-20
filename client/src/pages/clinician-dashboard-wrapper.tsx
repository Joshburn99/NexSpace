import ClinicianDashboardPage from "./clinician-dashboard-page";
import { ErrorBoundary } from "@/components/ErrorBoundary";

export default function ClinicianDashboardWrapper() {
  return (
    <ErrorBoundary>
      <ClinicianDashboardPage />
    </ErrorBoundary>
  );
}
