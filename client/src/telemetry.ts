import * as Sentry from "@sentry/react";
import { onCLS, onFID, onLCP, onINP, onTTFB, Metric } from "web-vitals";

function reportMetric(metric: Metric) {
  const line = `[web-vitals] ${metric.name} ${Math.round(metric.value)} (id=${metric.id})`;
  // Always log to console for quick diagnostics
  // eslint-disable-next-line no-console
  console.log(line);
  if (Sentry.getCurrentHub().getClient()) {
    Sentry.captureMessage(line, { level: "info", tags: { metric: metric.name } });
  }
}

export function initTelemetry(): void {
  const dsn = import.meta.env.VITE_SENTRY_DSN;
  if (dsn) {
    Sentry.init({
      dsn,
      integrations: [Sentry.browserTracingIntegration() as any, Sentry.replayIntegration() as any],
      tracesSampleRate: 0.2,
      replaysSessionSampleRate: 0.0,
      replaysOnErrorSampleRate: 1.0,
      environment: import.meta.env.MODE,
    });
  }

  // Global error handlers
  window.addEventListener("error", (e) => {
    // eslint-disable-next-line no-console
    console.error("[client-error]", e.error || e.message);
    if (Sentry.getCurrentHub().getClient()) {
      Sentry.captureException(e.error || e);
    }
  });
  window.addEventListener("unhandledrejection", (e) => {
    // eslint-disable-next-line no-console
    console.error("[unhandled-rejection]", e.reason);
    if (Sentry.getCurrentHub().getClient()) {
      Sentry.captureException(e.reason || e);
    }
  });

  // Web vitals
  onCLS(reportMetric);
  onFID(reportMetric);
  onLCP(reportMetric);
  onINP(reportMetric);
  onTTFB(reportMetric);
}


