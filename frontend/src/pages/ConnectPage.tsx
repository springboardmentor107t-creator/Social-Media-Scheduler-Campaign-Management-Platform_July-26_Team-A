import { useState, useEffect, useCallback } from "react";
import DashboardShell from "../components/DashboardShell";
import ConfirmModal from "../components/ConfirmModal";
import EmptyState, { PlatformEmptyIcon } from "../components/EmptyState";
import {
  getConnectedAccounts,
  disconnectAccount,
  type PlatformAccount,
} from "../lib/mockConnectAccounts";
import { apiFetch, getAccessToken } from "../services/api";

// ─── Platform SVG icons ───────────────────────────────────────────────────────
const ICONS: Record<string, JSX.Element> = {
  facebook: (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-7 h-7" style={{ color: "#1877F2" }}>
      <path d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047V9.41c0-3.025 1.792-4.697 4.533-4.697 1.312 0 2.686.236 2.686.236v2.97h-1.513c-1.491 0-1.956.93-1.956 1.884v2.25h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073Z" />
    </svg>
  ),
  instagram: (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-7 h-7" style={{ color: "#E1306C" }}>
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069ZM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0Zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324ZM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8Zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881Z" />
    </svg>
  ),
  linkedin: (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-7 h-7" style={{ color: "#0A66C2" }}>
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  ),
  twitter: (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-7 h-7" style={{ color: "var(--ink)" }}>
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  ),
  youtube: (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-7 h-7" style={{ color: "#FF0000" }}>
      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
    </svg>
  ),
  pinterest: (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-7 h-7" style={{ color: "#BD081C" }}>
      <path d="M12 0C5.373 0 0 5.372 0 12c0 5.084 3.163 9.426 7.627 11.174-.105-.949-.2-2.405.042-3.441.218-.937 1.407-5.965 1.407-5.965s-.359-.719-.359-1.782c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738a.36.36 0 0 1 .083.345l-.333 1.36c-.053.22-.174.267-.402.161-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.359-.632-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24 12.001 24 18.628 24 24 18.628 24 12 24 5.373 18.627 0 12 0z" />
    </svg>
  ),
};

// ─── Status pill ─────────────────────────────────────────────────────────────
function StatusPill({ status }: { status: PlatformAccount["status"] }) {
  const styles = {
    connected:    { bg: "rgba(16,185,129,0.08)",  color: "#10b981", border: "1px solid rgba(16,185,129,0.2)",  label: "Connected" },
    pending:      { bg: "rgba(245,158,11,0.08)",  color: "#f59e0b", border: "1px solid rgba(245,158,11,0.2)",  label: "Pending Auth" },
    disconnected: { bg: "rgba(107,114,128,0.08)", color: "var(--ink-muted)", border: "1px solid rgba(107,114,128,0.2)", label: "Not Connected" },
  }[status];
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold" style={{ background: styles.bg, color: styles.color, border: styles.border }}>
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: styles.color }} />
      {styles.label}
    </span>
  );
}

// ─── Platform card skeleton ───────────────────────────────────────────────────
function CardSkeleton() {
  return (
    <div className="surface rounded-2xl p-5 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="w-10 h-10 rounded-full animate-pulse" style={{ background: "var(--line)" }} />
        <div className="w-20 h-5 rounded animate-pulse" style={{ background: "var(--line)" }} />
      </div>
      <div className="w-28 h-4 rounded animate-pulse" style={{ background: "var(--line)" }} />
      <div className="w-full h-9 rounded-lg animate-pulse" style={{ background: "var(--line)" }} />
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function ConnectPage() {
  const [accounts, setAccounts] = useState<PlatformAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [toast, setToast] = useState("");
  const [disconnectTarget, setDisconnectTarget] = useState<PlatformAccount | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 2800);
  };

  const load = useCallback(async (isSyncAction = false) => {
    if (isSyncAction) setSyncing(true); else setLoading(true);
    try {
      const data = await getConnectedAccounts();
      // Fetch real YouTube status
      try {
        const ytStatus = await apiFetch<{
          connected: boolean;
          accounts: Array<{ channel_id: string; channel_name: string; email?: string }>;
        }>("/youtube/status");
        
        const ytIdx = data.findIndex(a => a.platform === "youtube");
        if (ytIdx !== -1) {
          if (ytStatus.connected && ytStatus.accounts.length > 0) {
            data[ytIdx].status = "connected";
            data[ytIdx].handle = ytStatus.accounts[0].channel_name;
          } else {
            data[ytIdx].status = "disconnected";
            data[ytIdx].handle = undefined;
          }
        }
      } catch (err) {
        console.error("Failed to fetch real YouTube status:", err);
      }
      // Fetch real LinkedIn status
      try {
        const liStatus = await apiFetch<{
          connected: boolean;
          accounts: Array<{ profile_id: string; profile_name: string; email?: string }>;
        }>("/linkedin/status");
        
        const liIdx = data.findIndex(a => a.platform === "linkedin");
        if (liIdx !== -1) {
          if (liStatus.connected && liStatus.accounts.length > 0) {
            data[liIdx].status = "connected";
            data[liIdx].handle = liStatus.accounts[0].profile_name;
          } else {
            data[liIdx].status = "disconnected";
            data[liIdx].handle = undefined;
          }
        }
      } catch (err) {
        console.error("Failed to fetch real LinkedIn status:", err);
      }

      // Fetch real Facebook status
      try {
        const fbStatus = await apiFetch<{
          connected: boolean;
          accounts: Array<{ facebook_id: string; name: string; email?: string }>;
        }>("/facebook/status");
        
        const fbIdx = data.findIndex(a => a.platform === "facebook");
        if (fbIdx !== -1) {
          if (fbStatus.connected && fbStatus.accounts.length > 0) {
            data[fbIdx].status = "connected";
            data[fbIdx].handle = fbStatus.accounts[0].name;
          } else {
            data[fbIdx].status = "disconnected";
            data[fbIdx].handle = undefined;
          }
        }
      } catch (err) {
        console.error("Failed to fetch real Facebook status:", err);
      }

      // Fetch real Instagram status
      try {
        const igStatus = await apiFetch<{
          connected: boolean;
          accounts: Array<{ instagram_id: string; username: string }>;
        }>("/instagram/status");
        
        const igIdx = data.findIndex(a => a.platform === "instagram");
        if (igIdx !== -1) {
          if (igStatus.connected && igStatus.accounts.length > 0) {
            data[igIdx].status = "connected";
            data[igIdx].handle = igStatus.accounts[0].username;
          } else {
            data[igIdx].status = "disconnected";
            data[igIdx].handle = undefined;
          }
        }
      } catch (err) {
        console.error("Failed to fetch real Instagram status:", err);
      }
      setAccounts(data);
    } finally {
      if (isSyncAction) setSyncing(false); else setLoading(false);
    }
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const platform = params.get("platform");
    const platLabel = platform === "linkedin" ? "LinkedIn" : platform === "youtube" ? "YouTube" : platform === "facebook" ? "Facebook" : "Account";
    if (params.get("success") === "true") {
      showToast(`${platLabel} account connected successfully!`);
      window.history.replaceState({}, document.title, window.location.pathname);
      load();
    } else {
      const errorMsg = params.get("error");
      if (errorMsg) {
        showToast(`Failed to connect ${platLabel}: ${decodeURIComponent(errorMsg)}`);
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    }
  }, [load]);

  useEffect(() => { load(); }, [load]);

  const handleConnect = (platform: string) => {
    if (platform === "youtube") {
      const token = getAccessToken();
      if (!token) {
        showToast("You must be logged in to connect a YouTube account.");
        return;
      }
      window.location.href = `http://127.0.0.1:8000/auth/youtube/login?token=${encodeURIComponent(token)}`;
      return;
    }
    if (platform === "linkedin") {
      const token = getAccessToken();
      if (!token) {
        showToast("You must be logged in to connect a LinkedIn account.");
        return;
      }
      window.location.href = `http://127.0.0.1:8000/api/auth/linkedin/login?token=${encodeURIComponent(token)}`;
      return;
    }
    if (platform === "facebook") {
      const token = getAccessToken();
      if (!token) {
        showToast("You must be logged in to connect a Facebook account.");
        return;
      }
      window.location.href = `http://127.0.0.1:8000/auth/facebook/login?token=${encodeURIComponent(token)}`;
      return;
    }
    if (platform === "instagram") {
      const token = getAccessToken();
      if (!token) {
        showToast("You must be logged in to connect an Instagram account.");
        return;
      }
      window.location.href = `http://127.0.0.1:8000/auth/instagram/login?token=${encodeURIComponent(token)}`;
      return;
    }
    showToast(`OAuth for ${platform} is not yet available — coming soon.`);
  };

  const handleDisconnect = async () => {
    if (!disconnectTarget) return;
    const target = disconnectTarget;
    setDisconnectTarget(null);
    try {
      if (target.platform === "youtube") {
        await apiFetch("/youtube/disconnect", { method: "DELETE" });
        setAccounts((prev) =>
          prev.map((a) =>
            a.platform === "youtube" ? { ...a, status: "disconnected", handle: undefined } : a
          )
        );
        showToast("YouTube account disconnected.");
      } else if (target.platform === "linkedin") {
        await apiFetch("/linkedin/disconnect", { method: "DELETE" });
        setAccounts((prev) =>
          prev.map((a) =>
            a.platform === "linkedin" ? { ...a, status: "disconnected", handle: undefined } : a
          )
        );
        showToast("LinkedIn account disconnected.");
      } else if (target.platform === "facebook") {
        await apiFetch("/facebook/disconnect", { method: "DELETE" });
        setAccounts((prev) =>
          prev.map((a) =>
            a.platform === "facebook" ? { ...a, status: "disconnected", handle: undefined } : a
          )
        );
        showToast("Facebook account disconnected.");
      } else if (target.platform === "instagram") {
        await apiFetch("/instagram/disconnect", { method: "DELETE" });
        setAccounts((prev) =>
          prev.map((a) =>
            a.platform === "instagram" ? { ...a, status: "disconnected", handle: undefined } : a
          )
        );
        showToast("Instagram account disconnected.");
      } else {
        await disconnectAccount(target.platform);
        setAccounts((prev) =>
          prev.map((a) =>
            a.platform === target.platform ? { ...a, status: "disconnected", handle: undefined } : a
          )
        );
        showToast(`${target.displayName} disconnected.`);
      }
    } catch (err: any) {
      showToast(err.detail || "Failed to disconnect. Please try again.");
    }
  };

  return (
    <DashboardShell active="Connect Accounts">
      <div className="max-w-5xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h2 className="text-2xl font-bold tracking-tight" style={{ color: "var(--ink)" }}>Connect Accounts</h2>
            <p className="text-sm mt-1" style={{ color: "var(--ink-muted)" }}>
              Link your social media accounts to schedule and publish from one place.
            </p>
            {/* STUB notice */}
            <p className="text-xs mt-1 font-semibold" style={{ color: "#f59e0b" }}>
              ⚠ OAuth backends for YouTube, LinkedIn, Facebook, and Instagram are LIVE.
            </p>
          </div>
          <button
            onClick={() => load(true)}
            disabled={syncing || loading}
            className="btn-outline-soft py-2 px-4 text-sm flex items-center gap-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className={`w-4 h-4 ${syncing ? "animate-spin" : ""}`}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
            </svg>
            {syncing ? "Syncing…" : "Sync all"}
          </button>
        </div>

        {/* Platform cards grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {loading
            ? [1, 2, 3, 4, 5, 6].map((i) => <CardSkeleton key={i} />)
            : accounts.length === 0
            ? (
              <div className="col-span-full">
                <EmptyState
                  icon={<PlatformEmptyIcon />}
                  title="No platforms available"
                  description="No social platforms are configured yet. Contact your administrator to set up integrations."
                />
              </div>
            )
            : accounts.map((account) => (
              <div key={account.platform} className="surface rounded-2xl p-5 flex flex-col gap-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: "var(--line)" }}>
                    {ICONS[account.platform] ?? <span className="text-lg font-bold">{account.displayName[0]}</span>}
                  </div>
                  <StatusPill status={account.status} />
                </div>

                <div>
                  <p className="font-semibold text-sm" style={{ color: "var(--ink)" }}>{account.displayName}</p>
                  {account.handle
                    ? <p className="text-xs mt-0.5" style={{ color: "var(--ink-muted)" }}>{account.handle}</p>
                    : <p className="text-xs mt-0.5" style={{ color: "var(--ink-muted)" }}>No account linked</p>
                  }
                </div>

                <div className="mt-auto">
                  {account.status === "connected" && (
                    <button
                      onClick={() => setDisconnectTarget(account)}
                      className="btn-outline-soft w-full py-2 text-sm"
                    >
                      Disconnect
                    </button>
                  )}
                  {account.status === "pending" && (
                    <button
                      onClick={() => handleConnect(account.platform)}
                      className="btn-outline-soft w-full py-2 text-sm"
                      style={{ borderColor: "#f59e0b", color: "#f59e0b" }}
                    >
                      Reconnect
                    </button>
                  )}
                  {account.status === "disconnected" && (
                    <button
                      onClick={() => handleConnect(account.platform)}
                      className="btn-primary-teal w-full py-2 text-sm"
                    >
                      Connect
                    </button>
                  )}
                </div>
              </div>
            ))}
        </div>
      </div>

      {/* Disconnect confirm modal */}
      <ConfirmModal
        isOpen={!!disconnectTarget}
        onClose={() => setDisconnectTarget(null)}
        onConfirm={handleDisconnect}
        title={`Disconnect ${disconnectTarget?.displayName ?? ""}?`}
        message="Disconnecting this account will stop all scheduled posts on this platform until you reconnect."
        confirmText="Disconnect"
        isDestructive
      />

      {/* Toast */}
      <div
        className="fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl text-sm font-medium shadow-lg transition-all"
        style={{ background: "var(--ink)", color: "var(--bg-canvas)", opacity: toast ? 1 : 0, transform: toast ? "translateY(0)" : "translateY(8px)", pointerEvents: "none" }}
      >
        {toast}
      </div>
    </DashboardShell>
  );
}
