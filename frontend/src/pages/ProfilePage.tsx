import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import DashboardShell from "../components/DashboardShell";
import SessionRow from "../components/SessionRow";
import ConfirmModal from "../components/ConfirmModal";
import { apiFetch } from "../services/api";

// Fallback profile shape used before API data loads
const INITIAL_PROFILE = {
  fullName: localStorage.getItem("userName") || "",
  email: localStorage.getItem("userEmail") || "",
  phone: "",
  timezone: "UTC",
  bio: "",
  role: "",
  memberSince: "",
  avatarUrl: "",
};

// Initial sessions list
const INITIAL_SESSIONS = [
  { id: "1", device: "macOS Sonoma", browser: "Chrome 124", location: "San Francisco, USA", lastActive: "Active now", isCurrent: true },
  { id: "2", device: "Windows 11", browser: "Edge 122", location: "Seattle, USA", lastActive: "Last active: 2 hours ago", isCurrent: false },
  { id: "3", device: "iPhone 15", browser: "Safari 17", location: "New York, USA", lastActive: "Last active: Yesterday", isCurrent: false },
];

export default function ProfilePage() {
  const navigate = useNavigate();

  // Main form states
  const [fullName, setFullName] = useState(INITIAL_PROFILE.fullName);
  const [email, setEmail] = useState(INITIAL_PROFILE.email);
  const [phone, setPhone] = useState(INITIAL_PROFILE.phone);
  const [timezone, setTimezone] = useState(INITIAL_PROFILE.timezone);
  const [bio, setBio] = useState(INITIAL_PROFILE.bio);
  const [avatarUrl, setAvatarUrl] = useState(INITIAL_PROFILE.avatarUrl);
  const [roleLabel, setRoleLabel] = useState(INITIAL_PROFILE.role);
  const [memberSince, setMemberSince] = useState(INITIAL_PROFILE.memberSince);

  // Email verification state — tracks the last confirmed email from the server
  const [verifiedEmail, setVerifiedEmail] = useState(INITIAL_PROFILE.email);

  // API loading / error states
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [profileError, setProfileError] = useState("");

  // Security states
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [sessions, setSessions] = useState(INITIAL_SESSIONS);
  const [googleConnected, setGoogleConnected] = useState(true);

  // UI state
  const [saving, setSaving] = useState(false);
  const [savingAccount, setSavingAccount] = useState(false);
  const [toast, setToast] = useState("");
  const [currentModal, setCurrentModal] = useState<"delete" | "deactivate" | "revoke_all" | "revoke_single" | null>(null);
  const [activeSessionIdToRevoke, setActiveSessionIdToRevoke] = useState<string | null>(null);

  // Account settings state (synced from PATCH /users/me/account)
  const [notificationPrefs, setNotificationPrefs] = useState<Record<string, unknown>>({});



  // ─── Fetch profile on mount ────────────────────────────────────────────────
  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    if (!token) {
      navigate("/login", { replace: true });
      return;
    }

    (async () => {
      setLoadingProfile(true);
      setProfileError("");
      try {
        const data = await apiFetch<{
          full_name?: string;
          email?: string;
          phone_number?: string;
          timezone?: string;
          bio?: string;
          avatar_url?: string;
          role?: string;
          created_at?: string;
          notification_preferences?: Record<string, unknown>;
        }>("/users/me");
        setFullName(data.full_name ?? "");
        setEmail(data.email ?? "");
        setVerifiedEmail(data.email ?? "");
        setPhone(data.phone_number ?? "");
        setTimezone(data.timezone ?? "UTC");
        setBio(data.bio ?? "");
        setAvatarUrl(data.avatar_url ?? "");
        setRoleLabel(data.role ?? "");
        if (data.created_at) {
          setMemberSince(
            new Date(data.created_at).toLocaleDateString("en-US", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })
          );
        }
        if (data.notification_preferences) {
          setNotificationPrefs(data.notification_preferences);
          if (typeof data.notification_preferences.two_factor_enabled === "boolean") {
            setTwoFactorEnabled(data.notification_preferences.two_factor_enabled);
          }
        }
        localStorage.setItem("userName", data.full_name ?? "");
        localStorage.setItem("userEmail", data.email ?? "");
      } catch (err: unknown) {
        setProfileError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoadingProfile(false);
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Show Toast helper
  const showToast = (message: string) => {
    setToast(message);
    setTimeout(() => setToast(""), 2500);
  };

  // Avatar initials helper
  const initials = useMemo(() => {
    if (!fullName) return "SP";
    const parts = fullName.split(" ");
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return fullName.substring(0, 2).toUpperCase();
  }, [fullName]);

  // Dirty state tracking (compares current form values with initial values)
  const isDirty = useMemo(() => {
    return (
      fullName !== INITIAL_PROFILE.fullName ||
      email !== INITIAL_PROFILE.email ||
      phone !== INITIAL_PROFILE.phone ||
      timezone !== INITIAL_PROFILE.timezone ||
      bio !== INITIAL_PROFILE.bio ||
      avatarUrl !== INITIAL_PROFILE.avatarUrl
    );
  }, [fullName, email, phone, timezone, bio, avatarUrl]);

  // Password strength logic
  const passwordStrength = useMemo(() => {
    if (!newPassword) return null;
    let score = 0;
    if (newPassword.length >= 8) score += 1;
    if (/[a-z]/.test(newPassword) && /[A-Z]/.test(newPassword)) score += 1;
    if (/[0-9]/.test(newPassword)) score += 1;
    if (/[^A-Za-z0-9]/.test(newPassword)) score += 1;

    switch (score) {
      case 0:
      case 1:
        return { label: "Weak", color: "#ef4444", pct: 25 };
      case 2:
        return { label: "Medium", color: "#f59e0b", pct: 50 };
      case 3:
        return { label: "Strong", color: "#10b981", pct: 75 };
      case 4:
      default:
        return { label: "Excellent", color: "var(--teal-dim)", pct: 100 };
    }
  }, [newPassword]);

  // ─── PATCH /users/me ───────────────────────────────────────────────────────
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isDirty) return;
    setSaving(true);
    try {
      const updated = await apiFetch<{
        full_name?: string; email?: string; phone_number?: string;
        timezone?: string; bio?: string; avatar_url?: string;
      }>("/users/me", {
        method: "PATCH",
        body: JSON.stringify({
          full_name: fullName,
          phone_number: phone || null,
          timezone,
          bio: bio || null,
          avatar_url: avatarUrl || null,
        }),
      });
      setFullName(updated.full_name ?? "");
      setEmail(updated.email ?? "");
      setVerifiedEmail(updated.email ?? "");
      setPhone(updated.phone_number ?? "");
      setTimezone(updated.timezone ?? "UTC");
      setBio(updated.bio ?? "");
      setAvatarUrl(updated.avatar_url ?? "");
      localStorage.setItem("userName", updated.full_name ?? "");
      showToast("Profile settings saved successfully!");
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : "Failed to save profile");
    } finally {
      setSaving(false);
    }
  };

  // ─── POST /users/me/change-password ───────────────────────────────────────
  const handleSavePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      showToast("New passwords do not match!");
      return;
    }
    setSaving(true);
    try {
      await apiFetch("/users/me/change-password", {
        method: "POST",
        body: JSON.stringify({
          current_password: currentPassword,
          new_password: newPassword,
        }),
      });
      showToast("Password updated successfully!");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : "Failed to update password");
    } finally {
      setSaving(false);
    }
  };

  // ─── PATCH /users/me/account ───────────────────────────────────────────────
  const handleSaveAccountSettings = async (overridePrefs?: Record<string, unknown>) => {
    setSavingAccount(true);
    const prefsToSend = overridePrefs ?? notificationPrefs;
    try {
      const updated = await apiFetch<{
        timezone?: string;
        notification_preferences?: Record<string, unknown>;
      }>("/users/me/account", {
        method: "PATCH",
        body: JSON.stringify({
          timezone,
          notification_preferences: prefsToSend,
        }),
      });
      setTimezone(updated.timezone ?? "UTC");
      if (updated.notification_preferences) {
        setNotificationPrefs(updated.notification_preferences);
      }
      showToast("Account settings saved!");
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : "Failed to save account settings");
    } finally {
      setSavingAccount(false);
    }
  };

  // 2FA toggle — persists into notification_preferences
  const handle2FAToggle = (enabled: boolean) => {
    setTwoFactorEnabled(enabled);
    const updated = { ...notificationPrefs, two_factor_enabled: enabled };
    setNotificationPrefs(updated);
    handleSaveAccountSettings(updated);
  };

  // Revoke individual session handler
  const triggerRevokeSession = (id: string) => {
    setActiveSessionIdToRevoke(id);
    setCurrentModal("revoke_single");
  };

  const confirmRevokeSession = () => {
    if (activeSessionIdToRevoke) {
      setSessions(sessions.filter((s) => s.id !== activeSessionIdToRevoke));
      showToast("Session logged out successfully.");
    }
    setActiveSessionIdToRevoke(null);
  };

  // Revoke all other sessions
  const confirmRevokeAll = () => {
    setSessions(sessions.filter((s) => s.isCurrent));
    showToast("Logged out of all other sessions.");
  };

  // Delete account confirmation
  const confirmDeleteAccount = () => {
    showToast("Your account deletion request has been submitted.");
  };

  // ─── POST /users/me/deactivate ────────────────────────────────────────────
  const confirmDeactivate = async () => {
    try {
      const pwd = currentPassword || window.prompt("Enter your password to confirm deactivation:") || "";
      await apiFetch("/users/me/deactivate", {
        method: "POST",
        body: JSON.stringify({ password: pwd }),
      });
      showToast("Your account has been deactivated.");
      localStorage.removeItem("accessToken");
      localStorage.removeItem("userName");
      localStorage.removeItem("userEmail");
      setTimeout(() => navigate("/login", { replace: true }), 1500);
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : "Deactivation failed");
    }
  };

  // ─── Replace hardcoded role/memberSince references in JSX ────────────────
  // (roleLabel and memberSince are now driven by API data)

  // Loading / error screens
  if (loadingProfile) {
    return (
      <DashboardShell active="Profile">
        <div className="flex items-center justify-center h-64">
          <div className="text-center space-y-3">
            <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin mx-auto" style={{ borderColor: "var(--teal)" }} />
            <p className="text-sm" style={{ color: "var(--ink-muted)" }}>Loading profile…</p>
          </div>
        </div>
      </DashboardShell>
    );
  }

  if (profileError) {
    return (
      <DashboardShell active="Profile">
        <div className="flex items-center justify-center h-64">
          <div className="text-center space-y-3">
            <p className="text-sm font-semibold text-red-500">{profileError}</p>
            <button className="btn-outline-soft text-xs py-2 px-4" onClick={() => window.location.reload()}>Retry</button>
          </div>
        </div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell active="Profile">
      <div className="max-w-4xl mx-auto space-y-8 pb-16">
        
        {/* Profile Header */}
        <div
          className="surface rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between gap-6"
          style={{ background: "var(--bg-surface)" }}
        >
          <div className="flex flex-col md:flex-row items-center gap-5 w-full md:w-auto">
            {/* Avatar Circle */}
            <div className="relative flex-shrink-0">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={fullName}
                  className="w-20 h-20 rounded-full object-cover border-2"
                  style={{ borderColor: "var(--line)" }}
                />
              ) : (
                <div
                  className="w-20 h-20 rounded-full flex items-center justify-center font-bold text-xl select-none"
                  style={{
                    background: "rgba(69, 222, 196, 0.15)",
                    color: "var(--teal-dim)",
                    border: "2.5px solid var(--teal)",
                  }}
                >
                  {initials}
                </div>
              )}
            </div>

            <div className="text-center md:text-left">
              <div className="flex flex-col md:flex-row md:items-center gap-2">
                <h2 className="text-xl font-bold" style={{ color: "var(--ink)" }}>
                  {fullName || "Anonymous Teammate"}
                </h2>
                <span
                  className="inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold self-center"
                  style={{
                    background: "rgba(256, 256, 256, 0.05)",
                    color: "var(--teal-dim)",
                    border: "1px solid var(--line)",
                  }}
                >
                  {roleLabel}
                </span>
              </div>
              <p className="text-xs mt-1" style={{ color: "var(--ink-muted)" }}>
                {memberSince ? `Member since: ${memberSince}` : ""}
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              className="btn-outline-soft text-xs py-2 px-4"
              onClick={() =>
                setAvatarUrl("https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=150")
              }
            >
              Change photo
            </button>
            {avatarUrl && (
              <button
                type="button"
                className="btn-outline-soft text-xs py-2 px-4 text-red-500 hover:text-red-600 hover:border-red-400"
                onClick={() => setAvatarUrl("")}
              >
                Remove
              </button>
            )}
          </div>
        </div>

        {/* Outer Layout: Single column on small screens, grids on medium */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          
          {/* Left Column: Form Settings (2 Columns) */}
          <div className="md:col-span-2 space-y-8">
            
            {/* Personal Information */}
            <div
              className="surface rounded-2xl p-6 space-y-6"
              style={{ background: "var(--bg-surface)" }}
            >
              <div>
                <h3 className="text-md font-bold" style={{ color: "var(--ink)" }}>
                  Personal Information
                </h3>
                <p className="text-xs mt-0.5" style={{ color: "var(--ink-muted)" }}>
                  Your basic info and settings displayed across the workspace.
                </p>
              </div>

              <form onSubmit={handleSaveProfile} className="space-y-4">
                <div>
                  <label className="field-label" htmlFor="full-name-input">
                    Full Name
                  </label>
                  <input
                    id="full-name-input"
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="input-field"
                    placeholder="Enter full name"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="field-label mb-0" htmlFor="email-input">
                      Email Address
                    </label>
                    {email !== verifiedEmail && (
                      <span className="text-[10px] font-bold bg-amber-500/10 text-amber-500 border border-amber-500/20 px-2 py-0.5 rounded-full uppercase tracking-wider">
                        Pending verification
                      </span>
                    )}
                  </div>
                  <input
                    id="email-input"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="input-field"
                    placeholder="you@company.com"
                  />
                </div>

                <div>
                  <label className="field-label" htmlFor="phone-input">
                    Phone Number (Optional)
                  </label>
                  <input
                    id="phone-input"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="input-field"
                    placeholder="+1 (555) 000-0000"
                  />
                </div>

                <div>
                  <label className="field-label" htmlFor="timezone-select">
                    Time Zone
                  </label>
                  <select
                    id="timezone-select"
                    value={timezone}
                    onChange={(e) => setTimezone(e.target.value)}
                    className="input-field"
                  >
                    <option value="America/New_York">Eastern Time (ET)</option>
                    <option value="America/Chicago">Central Time (CT)</option>
                    <option value="America/Denver">Mountain Time (MT)</option>
                    <option value="America/Los_Angeles">Pacific Time (PT)</option>
                    <option value="UTC">UTC / GMT</option>
                  </select>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="field-label mb-0" htmlFor="bio-textarea">
                      Bio
                    </label>
                    <span className="text-xs" style={{ color: bio.length > 160 ? "#ef4444" : "var(--ink-muted)" }}>
                      {bio.length}/160
                    </span>
                  </div>
                  <textarea
                    id="bio-textarea"
                    value={bio}
                    onChange={(e) => setBio(e.target.value.slice(0, 160))}
                    className="input-field h-24 resize-none"
                    placeholder="Tell us a little bit about yourself..."
                  />
                </div>

                <div className="flex items-center justify-end pt-2">
                  <button
                    type="submit"
                    disabled={!isDirty || saving}
                    className="btn-primary-teal w-full md:w-auto"
                    style={{ opacity: !isDirty || saving ? 0.6 : 1 }}
                  >
                    {saving ? "Saving..." : "Save changes"}
                  </button>
                </div>
              </form>
            </div>

            {/* Password & Security */}
            <div
              className="surface rounded-2xl p-6 space-y-6"
              style={{ background: "var(--bg-surface)" }}
            >
              <div>
                <h3 className="text-md font-bold" style={{ color: "var(--ink)" }}>
                  Password & Security
                </h3>
                <p className="text-xs mt-0.5" style={{ color: "var(--ink-muted)" }}>
                  Manage your credential configuration and two-factor options.
                </p>
              </div>

              <form onSubmit={handleSavePassword} className="space-y-4">
                <div>
                  <label className="field-label" htmlFor="current-pass-input">
                    Current Password
                  </label>
                  <input
                    id="current-pass-input"
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="••••••••"
                    className="input-field"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="field-label" htmlFor="new-pass-input">
                      New Password
                    </label>
                    <input
                      id="new-pass-input"
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="••••••••"
                      className="input-field"
                    />
                  </div>
                  <div>
                    <label className="field-label" htmlFor="confirm-pass-input">
                      Confirm New Password
                    </label>
                    <input
                      id="confirm-pass-input"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      className="input-field"
                    />
                  </div>
                </div>

                {/* Password Strength Indicator */}
                {passwordStrength && (
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs font-semibold">
                      <span>Password Strength:</span>
                      <span style={{ color: passwordStrength.color }}>{passwordStrength.label}</span>
                    </div>
                    <div className="w-full h-1.5 bg-line rounded-full overflow-hidden" style={{ background: "var(--line)" }}>
                      <div
                        className="h-full transition-all duration-300"
                        style={{
                          width: `${passwordStrength.pct}%`,
                          backgroundColor: passwordStrength.color,
                        }}
                      />
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-end pt-2">
                  <button
                    type="submit"
                    disabled={!currentPassword || !newPassword || !confirmPassword || saving}
                    className="btn-primary-teal w-full md:w-auto"
                    style={{ opacity: !currentPassword || !newPassword || !confirmPassword || saving ? 0.6 : 1 }}
                  >
                    Change password
                  </button>
                </div>
              </form>

              {/* Two-Factor Authentication */}
              <div
                className="p-4 rounded-xl border flex items-center justify-between gap-4"
                style={{ borderColor: "var(--line)", background: "rgba(256, 256, 256, 0.01)" }}
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-[14px]" style={{ color: "var(--ink)" }}>
                      Two-factor authentication (2FA)
                    </span>
                    <span
                      className="px-2 py-0.5 text-[9px] font-bold rounded-full uppercase tracking-wider"
                      style={
                        twoFactorEnabled
                          ? { background: "rgba(16, 185, 129, 0.1)", color: "#10b981" }
                          : { background: "rgba(239, 68, 68, 0.1)", color: "#ef4444" }
                      }
                    >
                      {twoFactorEnabled ? "Enabled" : "Disabled"}
                    </span>
                  </div>
                  <p className="text-xs mt-0.5" style={{ color: "var(--ink-muted)" }}>
                    Secure your account with an extra layer of security using authentication apps.
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  {!twoFactorEnabled && (
                    <button
                      type="button"
                      onClick={() => handle2FAToggle(true)}
                      disabled={savingAccount}
                      className="btn-outline-soft text-xs py-1.5 px-3"
                      style={{ opacity: savingAccount ? 0.6 : 1 }}
                    >
                      Set up 2FA
                    </button>
                  )}
                  <label className="relative inline-flex items-center cursor-pointer select-none">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={twoFactorEnabled}
                      disabled={savingAccount}
                      onChange={(e) => handle2FAToggle(e.target.checked)}
                      aria-label="Toggle two-factor authentication"
                    />
                    <div className="w-9 h-5 bg-gray-300 dark:bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-teal" />
                  </label>
                  {savingAccount && (
                    <span className="text-xs" style={{ color: "var(--ink-muted)" }}>Saving…</span>
                  )}
                </div>
              </div>

              {/* Save Account Settings */}
              <div className="flex items-center justify-end pt-2">
                <button
                  type="button"
                  disabled={savingAccount}
                  onClick={() => handleSaveAccountSettings()}
                  className="btn-primary-teal w-full md:w-auto"
                  style={{ opacity: savingAccount ? 0.6 : 1 }}
                >
                  {savingAccount ? "Saving…" : "Save account settings"}
                </button>
              </div>
            </div>
          </div>

          {/* Right Column: Sessions, Connected Accounts, Danger Zone */}
          <div className="space-y-8">
            
            {/* Connected Identity */}
            <div
              className="surface rounded-2xl p-6 space-y-4"
              style={{ background: "var(--bg-surface)" }}
            >
              <div>
                <h3 className="text-md font-bold" style={{ color: "var(--ink)" }}>
                  Connected Identity
                </h3>
                <p className="text-xs mt-0.5" style={{ color: "var(--ink-muted)" }}>
                  Linked authentication providers.
                </p>
              </div>

              <div className="space-y-3">
                {/* Email provider - permanent */}
                <div
                  className="flex items-center justify-between p-3 rounded-xl border text-sm"
                  style={{ borderColor: "var(--line)" }}
                >
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-teal" />
                    <span style={{ color: "var(--ink)" }}>Email / Password</span>
                  </div>
                  <span className="text-xs font-semibold" style={{ color: "var(--ink-muted)" }}>
                    Connected
                  </span>
                </div>

                {/* Google provider */}
                <div
                  className="flex items-center justify-between p-3 rounded-xl border text-sm"
                  style={{ borderColor: "var(--line)" }}
                >
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ background: googleConnected ? "#4285F4" : "var(--ink-muted)" }} />
                    <span style={{ color: "var(--ink)" }}>Google Sign-In</span>
                  </div>
                  {googleConnected ? (
                    <button
                      type="button"
                      onClick={() => setGoogleConnected(false)}
                      className="text-xs font-semibold text-red-500 hover:underline"
                    >
                      Disconnect
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setGoogleConnected(true)}
                      className="text-xs font-semibold text-teal-dim hover:underline"
                    >
                      Connect
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Active Sessions */}
            <div
              className="surface rounded-2xl p-6 space-y-4"
              style={{ background: "var(--bg-surface)" }}
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-md font-bold" style={{ color: "var(--ink)" }}>
                    Active Sessions
                  </h3>
                  <p className="text-xs mt-0.5" style={{ color: "var(--ink-muted)" }}>
                    Logged-in devices.
                  </p>
                </div>
                {sessions.length > 1 && (
                  <button
                    type="button"
                    onClick={() => setCurrentModal("revoke_all")}
                    className="text-xs font-semibold text-red-500 hover:underline"
                  >
                    Log out others
                  </button>
                )}
              </div>

              <div className="space-y-3">
                {sessions.map((session) => (
                  <SessionRow
                    key={session.id}
                    device={session.device}
                    browser={session.browser}
                    location={session.location}
                    lastActive={session.lastActive}
                    isCurrent={session.isCurrent}
                    onRevoke={() => triggerRevokeSession(session.id)}
                  />
                ))}
              </div>
            </div>

            {/* Danger Zone */}
            <div
              className="rounded-2xl p-6 space-y-4 border border-red-500/20"
              style={{ background: "rgba(239, 68, 68, 0.02)" }}
            >
              <div>
                <h3 className="text-md font-bold text-red-500">Danger Zone</h3>
                <p className="text-xs mt-0.5 text-red-500/70">
                  Critical actions to deactivate or close your workspace.
                </p>
              </div>

              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => setCurrentModal("deactivate")}
                  className="w-full text-left font-semibold text-xs border border-red-500/30 text-red-500 hover:bg-red-500/10 transition-colors py-2.5 px-4 rounded-xl"
                >
                  Deactivate Account
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentModal("delete")}
                  className="w-full text-left font-semibold text-xs bg-red-500 hover:bg-red-600 text-white transition-colors py-2.5 px-4 rounded-xl"
                >
                  Delete Account permanently
                </button>
              </div>
            </div>

          </div>
        </div>

        {/* Modal confirmations */}
        <ConfirmModal
          isOpen={currentModal === "delete"}
          onClose={() => setCurrentModal(null)}
          onConfirm={confirmDeleteAccount}
          title="Permanently delete account?"
          message="This action is absolute. You will lose access to all scheduled content, social accounts, and campaign details immediately."
          confirmText="Delete my account"
          isDestructive={true}
          requiresEmailText={email}
        />

        <ConfirmModal
          isOpen={currentModal === "deactivate"}
          onClose={() => setCurrentModal(null)}
          onConfirm={confirmDeactivate}
          title="Deactivate account temporarily?"
          message="Your account and posts will be paused. Teammates won't see your changes, but you can log back in anytime to reactivate."
          confirmText="Deactivate"
          isDestructive={true}
        />

        <ConfirmModal
          isOpen={currentModal === "revoke_single"}
          onClose={() => setCurrentModal(null)}
          onConfirm={confirmRevokeSession}
          title="Log out of selected session?"
          message="This will immediately end the session on that device. They will have to log back in to access the dashboard."
          confirmText="Log out session"
        />

        <ConfirmModal
          isOpen={currentModal === "revoke_all"}
          onClose={() => setCurrentModal(null)}
          onConfirm={confirmRevokeAll}
          title="Log out of all other sessions?"
          message="This will terminate every active log in session except for this current browser window."
          confirmText="Log out all others"
          isDestructive={true}
        />

        {/* Notification Toast */}
        <div
          className="fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl text-sm font-semibold transition-all shadow-xl border"
          style={{
            background: "var(--ink)",
            color: "var(--bg-canvas)",
            borderColor: "var(--line)",
            opacity: toast ? 1 : 0,
            transform: toast ? "translateY(0)" : "translateY(8px)",
            pointerEvents: "none",
          }}
        >
          {toast}
        </div>

      </div>
    </DashboardShell>
  );
}
