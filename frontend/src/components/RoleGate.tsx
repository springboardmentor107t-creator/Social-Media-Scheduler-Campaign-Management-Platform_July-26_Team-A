/**
 * RoleGate.tsx
 *
 * Shared route-protection component. Wrap each role-specific page with:
 *   <RoleGate allowedRole="admin">...page content...</RoleGate>
 *
 * Behaviour on mount:
 *  1. No access token → redirect to /login
 *  2. Role matches allowedRole → render children
 *  3. Role doesn't match → silently router.replace() to the user's correct dashboard
 *
 * This implements the "wrong role → correct dashboard" requirement
 * (e.g. a Content Creator hitting /dashboard/admin lands on /dashboard/creator).
 */
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getFrontendRole, ROLE_DASHBOARD_PATHS, type FrontendRoleKey } from "../utils/roleUtils";

interface RoleGateProps {
  allowedRole: FrontendRoleKey;
  children: React.ReactNode;
}

export default function RoleGate({ allowedRole, children }: RoleGateProps) {
  const navigate = useNavigate();
  // Three states: "checking" | "allowed" | "redirecting"
  const [status, setStatus] = useState<"checking" | "allowed" | "redirecting">("checking");

  useEffect(() => {
    const token = localStorage.getItem("accessToken");

    // No session → send to login
    if (!token) {
      navigate("/login", { replace: true });
      return;
    }

    const userRole = getFrontendRole();

    if (userRole === allowedRole) {
      setStatus("allowed");
    } else {
      setStatus("redirecting");
      navigate(ROLE_DASHBOARD_PATHS[userRole], { replace: true });
    }
  }, [allowedRole, navigate]);

  if (status === "checking" || status === "redirecting") {
    // Minimal loading state — avoids flash of wrong content
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "var(--bg-canvas)",
          color: "var(--ink-muted)",
          fontFamily: "var(--font-sans, sans-serif)",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <div
            style={{
              width: 32,
              height: 32,
              border: "3px solid var(--teal)",
              borderTopColor: "transparent",
              borderRadius: "50%",
              animation: "spin 0.7s linear infinite",
              margin: "0 auto 12px",
            }}
          />
          <p style={{ fontSize: 13, opacity: 0.6 }}>Loading your workspace…</p>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return <>{children}</>;
}
