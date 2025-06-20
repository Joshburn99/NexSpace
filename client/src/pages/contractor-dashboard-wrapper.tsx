import ContractorDashboardPage from "./contractor-dashboard-page";
import { ErrorBoundary } from "@/components/ErrorBoundary";

export default function ContractorDashboardWrapper() {
  return (
    <ErrorBoundary>
      <ContractorDashboardPage />
    </ErrorBoundary>
  );
}
