/**
 * DashboardPage.tsx — Generic /dashboard redirector
 *
 * If someone lands on /dashboard directly (bookmarked link, browser back button,
 * or legacy navigation), this page reads their role and router.replace()s to the
 * correct role-specific dashboard without showing any content.
 */
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getDashboardRoute } from "../utils/roleUtils";

export default function DashboardPage() {
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    if (!token) {
      navigate("/login", { replace: true });
      return;
    }
    navigate(getDashboardRoute(), { replace: true });
  }, [navigate]);

  // Minimal loading state while the redirect fires
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
