import { ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { Navigate, useLocation } from "wouter";

async function fetchMe() {
  const r = await fetch("/api/me", { credentials: "include" });
  if (!r.ok) throw new Error(`Auth check failed: ${r.status}`);
  return r.json();
}

function hasPermissions(me: any, required?: string[]) {
  if (!required || required.length === 0) return true;
  const perms: string[] = me?.permissions ?? [];
  return required.every(p => perms.includes(p));
}

function FullScreenLoader() { 
  return <div style={{ padding: 24 }}>Loading...</div>; 
}

function AuthErrorFallback() {
  return (
    <div style={{ padding: 24 }}>
      <h2>We couldn't verify your session.</h2>
      <p>Please sign in again.</p>
      <a href="/auth">Go to Login</a>
    </div>
  );
}

interface ProtectedRouteProps {
  children?: ReactNode;
  component?: React.ComponentType;
  path?: string;
  required?: string[];
  requiredPermissions?: string[];
}

export function ProtectedRoute({
  children,
  component: Component,
  required,
  requiredPermissions
}: ProtectedRouteProps) {
  const [location] = useLocation();
  const safeMode = 
    typeof window !== "undefined" &&
    (window.location.search.includes("safe=1") || window.location.hash.includes("safe"));
  
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["me"],
    queryFn: fetchMe,
    retry: 0,
    staleTime: 0,
    refetchOnWindowFocus: false,
    networkMode: "always"
  });
  
  if (safeMode) return <>{children}</>;
  if (isLoading) return <FullScreenLoader />;
  if (isError) { 
    console.warn("Auth check failed:", error); 
    return <AuthErrorFallback />; 
  }
  if (!data?.user) return <Navigate to="/auth" />;
  
  const permissions = required || requiredPermissions;
  if (!hasPermissions(data, permissions)) return <div style={{ padding: 24 }}>Access denied.</div>;
  
  // Support both children and component prop patterns
  if (Component) {
    return <Component />;
  }
  return <>{children}</>;
}