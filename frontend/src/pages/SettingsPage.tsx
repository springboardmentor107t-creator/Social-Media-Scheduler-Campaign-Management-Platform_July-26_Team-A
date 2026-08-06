import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import DashboardShell from "../components/DashboardShell";
import ConfirmModal from "../components/ConfirmModal";
import { apiFetch, clearSession } from "../services/api";

// ─── Types ───────────────────────────────────────────────────────────────────
interface UserProfile {
  id: string;
  email: string;
  full_name?: string;
  username: string;
  role: string;
  is_active: boolean;
  notification_preferences?: Record<string, boolean>;
}

// ─── Sub-components ──────────────────────────────────────────────────────────
function SectionCard({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <div className="surface rounded-2xl p-6 shadow-sm space-y-4">
      <div>
        <h3 className="font-semibold text-base" style={{ color: "var(--ink)" }}>{title}</h3>
        {description && <p className="text-sm mt-1" style={{ color: "var(--ink-muted)" }}>{description}</p>}
      </div>
      {children}
    </div>
  );
}

function InlineMessage({ type, text }: { type: "success" | "error"; text: string }) {
  if (!text) return null;
  return (
    <p className="text-xs font-semibold px-3 py-2 rounded-lg" style={{
      background: type === "success" ? "rgba(16,185,129,0.08)" : "rgba(239,68,68,0.08)",
      color: type === "success" ? "#10b981" : "#ef4444",
      border: `1px solid ${type === "success" ? "rgba(16,185,129,0.2)" : "rgba(239,68,68,0.2)"}`,
    }}>
      {text}
    </p>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function SettingsPage() {
  const navigate = useNavigate();
  const [toast, setToast] = useState("");
  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(""), 2800); };

  // ── Section 1: Profile summary ─────────────────────────────────────────────
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);

  useEffect(() => {
    apiFetch<UserProfile>("/users/me")
      .then((data) => setProfile(data))
      .catch(() => setProfile(null))
      .finally(() => setProfileLoading(false));
  }, []);

  // ── Section 2: Change password ─────────────────────────────────────────────
  const [pwForm, setPwForm] = useState({ current: "", next: "", confirm: "" });
  const [pwSubmitting, setPwSubmitting] = useState(false);
  const [pwMsg, setPwMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwMsg(null);

    if (pwForm.next !== pwForm.confirm) {
      setPwMsg({ type: "error", text: "New passwords do not match." });
      return;
    }
    if (pwForm.next.length < 8) {
      setPwMsg({ type: "error", text: "New password must be at least 8 characters." });
      return;
    }
    if (!/\d/.test(pwForm.next)) {
      setPwMsg({ type: "error", text: "New password must contain at least one number." });
      return;
    }

    setPwSubmitting(true);
    try {
      await apiFetch("/users/me/change-password", {
        method: "POST",
        body: JSON.stringify({ current_password: pwForm.current, new_password: pwForm.next }),
      });
      setPwForm({ current: "", next: "", confirm: "" });
      setPwMsg({ type: "success", text: "Password updated successfully." });
    } catch (err: unknown) {
      setPwMsg({ type: "error", text: (err as Error).message || "Failed to update password." });
    } finally {
      setPwSubmitting(false);
    }
  };

  // ── Section 3: Notification preferences ───────────────────────────────────
  const [notifs, setNotifs] = useState({ email_notifications: true, push_notifications: false });
  const [notifSaving, setNotifSaving] = useState(false);

  // Populate from profile once loaded
  useEffect(() => {
    if (profile?.notification_preferences) {
      setNotifs({
        email_notifications: profile.notification_preferences.email_notifications ?? true,
        push_notifications: profile.notification_preferences.push_notifications ?? false,
      });
    }
  }, [profile]);

  const handleNotifToggle = async (key: keyof typeof notifs) => {
    const updated = { ...notifs, [key]: !notifs[key] };
    setNotifs(updated);
    setNotifSaving(true);
    try {
      // REAL API — note: backend stores prefs but doesn't send actual notifications yet
      await apiFetch("/users/me/account", {
        method: "PATCH",
        body: JSON.stringify({ notification_preferences: updated }),
      });
      showToast("Notification preferences saved.");
    } catch {
      // Rollback
      setNotifs(notifs);
      showToast("Failed to save preferences.");
    } finally {
      setNotifSaving(false);
    }
  };

  // ── Section 4: Deactivate account (Danger Zone) ───────────────────────────
  const [deactivateOpen, setDeactivateOpen] = useState(false);
  const [deactivatePassword, setDeactivatePassword] = useState("");
  const [deactivateSubmitting, setDeactivateSubmitting] = useState(false);
  const [deactivateMsg, setDeactivateMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handleDeactivate = async () => {
    if (!deactivatePassword.trim()) {
      setDeactivateMsg({ type: "error", text: "Please enter your password to confirm." });
      return;
    }
    setDeactivateSubmitting(true);
    setDeactivateMsg(null);
    try {
      await apiFetch("/users/me/deactivate", {
        method: "POST",
        body: JSON.stringify({ password: deactivatePassword }),
      });
      clearSession();
      navigate("/login");
    } catch (err: unknown) {
      setDeactivateMsg({ type: "error", text: (err as Error).message || "Incorrect password." });
      setDeactivateSubmitting(false);
    }
  };

  const ROLE_DISPLAY: Record<string, string> = { admin: "Administrator", manager: "Marketing Team", user: "Content Creator" };

  return (
    <DashboardShell active="Settings">
      <div className="max-w-2xl mx-auto space-y-6">

        {/* ── Section 1: Profile summary ─────────────────────────────────────── */}
        <SectionCard title="Profile" description="Your public workspace identity.">
          {profileLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-4 rounded animate-pulse w-3/4" style={{ background: "var(--line)" }} />
              ))}
            </div>
          ) : profile ? (
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span style={{ color: "var(--ink-muted)" }}>Name</span>
                <span style={{ color: "var(--ink)" }}>{profile.full_name || profile.username}</span>
              </div>
              <div className="flex justify-between">
                <span style={{ color: "var(--ink-muted)" }}>Email</span>
                <span style={{ color: "var(--ink)" }}>{profile.email}</span>
              </div>
              <div className="flex justify-between">
                <span style={{ color: "var(--ink-muted)" }}>Role</span>
                <span style={{ color: "var(--ink)" }}>{ROLE_DISPLAY[profile.role] ?? profile.role}</span>
              </div>
              <div className="pt-1">
                <Link to="/dashboard/profile" className="text-xs font-semibold" style={{ color: "var(--teal-dim)" }}>
                  Edit profile →
                </Link>
              </div>
            </div>
          ) : (
            <p className="text-sm" style={{ color: "var(--ink-muted)" }}>Could not load profile.</p>
          )}
        </SectionCard>

        {/* ── Section 2: Change password ─────────────────────────────────────── */}
        <SectionCard title="Change Password" description="Use a strong password with at least 8 characters and one number.">
          <form onSubmit={handlePasswordChange} className="space-y-4">
            {[
              { id: "pw-current", label: "Current password", key: "current" },
              { id: "pw-new",     label: "New password",     key: "next" },
              { id: "pw-confirm", label: "Confirm new password", key: "confirm" },
            ].map(({ id, label, key }) => (
              <div key={id}>
                <label htmlFor={id} className="field-label">{label}</label>
                <input
                  id={id}
                  type="password"
                  placeholder="••••••••"
                  value={pwForm[key as keyof typeof pwForm]}
                  onChange={(e) => setPwForm((f) => ({ ...f, [key]: e.target.value }))}
                  className="input-field"
                  required
                />
              </div>
            ))}
            {pwMsg && <InlineMessage type={pwMsg.type} text={pwMsg.text} />}
            <button type="submit" disabled={pwSubmitting} className="btn-primary-teal py-2.5 px-6 text-sm">
              {pwSubmitting ? "Saving…" : "Update password"}
            </button>
          </form>
        </SectionCard>

        {/* ── Section 3: Notification preferences ───────────────────────────── */}
        <SectionCard title="Notification Preferences" description="Note: notification delivery is not yet active on the backend — preferences are saved but not yet sent.">
          <div className="space-y-4">
            {(Object.keys(notifs) as Array<keyof typeof notifs>).map((key) => (
              <div key={key} className="flex items-center justify-between">
                <span className="text-sm font-medium" style={{ color: "var(--ink)" }}>
                  {key === "email_notifications" ? "Email notifications" : "Push notifications"}
                </span>
                <button
                  onClick={() => handleNotifToggle(key)}
                  disabled={notifSaving}
                  aria-label={`Toggle ${key}`}
                  className="relative w-10 h-5 rounded-full transition-colors focus:outline-none"
                  style={{ background: notifs[key] ? "var(--teal)" : "var(--line)" }}
                >
                  <span
                    className="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform"
                    style={{ transform: notifs[key] ? "translateX(20px)" : "translateX(0)" }}
                  />
                </button>
              </div>
            ))}
          </div>
        </SectionCard>

        {/* ── Section 4: Danger zone ─────────────────────────────────────────── */}
        <SectionCard title="Danger Zone">
          <p className="text-sm" style={{ color: "var(--ink-muted)" }}>
            Deactivating your account will immediately revoke your access. You can ask a workspace administrator to reactivate it.
          </p>
          <button
            onClick={() => { setDeactivateMsg(null); setDeactivatePassword(""); setDeactivateOpen(true); }}
            className="btn-outline-soft py-2 px-4 text-sm"
            style={{ borderColor: "#ef4444", color: "#ef4444" }}
          >
            Deactivate account
          </button>
        </SectionCard>
      </div>

      {/* ── Deactivate confirm modal ─────────────────────────────────────────── */}
      {deactivateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.55)" }}>
          <div className="surface rounded-2xl p-6 w-full max-w-sm shadow-xl space-y-4">
            <h3 className="font-bold text-base" style={{ color: "var(--ink)" }}>Deactivate Account?</h3>
            <p className="text-sm" style={{ color: "var(--ink-muted)" }}>
              This will immediately revoke your access. Enter your current password to confirm.
            </p>
            <div>
              <label htmlFor="deactivate-pw" className="field-label">Current password</label>
              <input
                id="deactivate-pw"
                type="password"
                placeholder="••••••••"
                value={deactivatePassword}
                onChange={(e) => setDeactivatePassword(e.target.value)}
                className="input-field"
              />
            </div>
            {deactivateMsg && <InlineMessage type={deactivateMsg.type} text={deactivateMsg.text} />}
            <div className="flex gap-3 pt-1">
              <button onClick={() => setDeactivateOpen(false)} className="btn-outline-soft flex-1 py-2.5 text-sm">Cancel</button>
              <button
                onClick={handleDeactivate}
                disabled={deactivateSubmitting}
                className="flex-1 py-2.5 text-sm font-semibold rounded-lg transition-colors"
                style={{ background: "#ef4444", color: "white", border: "none" }}
              >
                {deactivateSubmitting ? "Deactivating…" : "Deactivate"}
              </button>
            </div>
          </div>
        </div>
      )}

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
