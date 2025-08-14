import { createRoot } from "react-dom/client";
import App from "./App";
import { AppErrorBoundary } from "./lib/AppErrorBoundary";
import "./index.css";

console.log("Main.tsx loading...");

// Development-only fetch shim and service worker cleanup
if (import.meta.env.DEV) {
  const _fetch = window.fetch.bind(window);
  window.fetch = async (...args) => {
    const res = await _fetch(...args);
    if (!res.ok) {
      const clone = res.clone();
      let body = "";
      try { body = await clone.text(); } catch {}
      console.warn("[fetch fail]", args[0], res.status, body.slice(0, 400));
    }
    return res;
  };
  
  // Unregister service workers and clear caches
  navigator.serviceWorker?.getRegistrations()?.then(rs => rs.forEach(r => r.unregister()));
  // @ts-ignore
  caches?.keys()?.then(keys => keys.forEach(k => caches.delete(k)));
}

const rootElement = document.getElementById("root");
if (rootElement) {
  console.log("Root element found, rendering app...");
  
  createRoot(rootElement).render(
    /* Temporarily disable StrictMode while debugging */
    <AppErrorBoundary>
      <App />
    </AppErrorBoundary>
  );
  console.log("React app rendered successfully");
} else {
  console.error("Root element not found!");
}
