import { useState, useMemo, useEffect } from "react";
import DashboardShell from "../components/DashboardShell";
import RoleBadge from "../components/RoleBadge";
import InviteModal from "../components/InviteModal";
import ConfirmModal from "../components/ConfirmModal";
import EmptyState, { TeamEmptyIcon } from "../components/EmptyState";
import { apiFetch } from "../services/api";

// ─── Role mapping ───────────────────────────────────────────────────────────
// Backend uses: "user" | "manager" | "admin"
// Display labels used in the UI
const BACKEND_TO_DISPLAY: Record<string, string> = {
  user: "Content Creator",
  manager: "Marketing Team",
  admin: "Administrator",
};
const DISPLAY_TO_BACKEND: Record<string, string> = {
  "Content Creator": "user",
  "Marketing Team": "manager",
  "Business User": "manager", // map legacy display value
  Administrator: "admin",
};

const ROLES_DISPLAY = ["Content Creator", "Marketing Team", "Administrator"];

// ─── Helpers ────────────────────────────────────────────────────────────────
function decodeJwtRole(): string {
  try {
    const token = localStorage.getItem("accessToken");
    if (!token) return "user";
    const payload = JSON.parse(atob(token.split(".")[1]));
    return (payload.role as string) ?? "user";
  } catch {
    return "user";
  }
}

function getInitials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .toUpperCase()
    .substring(0, 2);
}

// ─── Types ───────────────────────────────────────────────────────────────────
interface ApiUser {
  id: string;
  full_name?: string;
  username: string;
  email: string;
  role: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface Member {
  id: string;
  name: string;
  email: string;
  role: string; // display label
  backendRole: string; // "user" | "manager" | "admin"
  status: "Active" | "Pending invite" | "Deactivated";
  lastActive: string;
}

function apiUserToMember(u: ApiUser): Member {
  const display = BACKEND_TO_DISPLAY[u.role] ?? u.role;
  return {
    id: u.id,
    name: u.full_name || u.username,
    email: u.email,
    role: display,
    backendRole: u.role,
    status: u.is_active ? "Active" : "Deactivated",
    lastActive: new Date(u.updated_at).toLocaleDateString(),
  };
}

// ─── Skeleton row ─────────────────────────────────────────────────────────
function SkeletonRow() {
  return (
    <tr>
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <td key={i} className="px-6 py-4">
          <div
            className="h-4 rounded animate-pulse"
            style={{ background: "var(--line)", width: i === 1 ? "120px" : i === 2 ? "160px" : "80px" }}
          />
        </td>
      ))}
    </tr>
  );
}

// ─── Component ───────────────────────────────────────────────────────────────
export default function TeamPage() {
  const currentUserRole = decodeJwtRole(); // "user" | "manager" | "admin"
  const isAdmin = currentUserRole === "admin";

  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<{ type: "permission" | "network"; msg: string } | null>(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRoleFilter, setSelectedRoleFilter] = useState("All");
  const [selectedStatusFilter, setSelectedStatusFilter] = useState("All");

  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [activeDropdownId, setActiveDropdownId] = useState<string | null>(null);
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    type: "remove" | "deactivate" | "activate" | "change_role" | "";
    memberId: string;
    memberName: string;
    targetRole?: string;
    targetBackendRole?: string;
  }>({ isOpen: false, type: "", memberId: "", memberName: "" });

  const [isRoleGuideOpen, setIsRoleGuideOpen] = useState(true);
  const [toast, setToast] = useState("");

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 2800);
  };

  // ── Fetch members ──────────────────────────────────────────────────────────
  const fetchMembers = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch<ApiUser[]>("/users");
      setMembers(data.map(apiUserToMember));
    } catch (err: unknown) {
      const msg = (err as Error).message ?? "Unknown error";
      if (msg.toLowerCase().includes("403") || msg.toLowerCase().includes("permission") || msg.toLowerCase().includes("insufficient")) {
        setError({ type: "permission", msg: "You don't have permission to view the team list." });
      } else {
        setError({ type: "network", msg: "Something went wrong loading the team. Please try again." });
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchMembers(); }, []);

  // ── Role change (optimistic) ───────────────────────────────────────────────
  const handleRoleChange = async (member: Member, newDisplayRole: string) => {
    const newBackendRole = DISPLAY_TO_BACKEND[newDisplayRole] ?? newDisplayRole;
    const originalRole = member.role;
    const originalBackendRole = member.backendRole;

    // Optimistic update
    setMembers((prev) =>
      prev.map((m) =>
        m.id === member.id ? { ...m, role: newDisplayRole, backendRole: newBackendRole } : m
      )
    );
    setActiveDropdownId(null);

    try {
      await apiFetch(`/users/${member.id}/role?role=${newBackendRole}`, { method: "PATCH" });
      showToast(`${member.name}'s role updated to ${newDisplayRole}.`);
    } catch (err: unknown) {
      // Rollback
      setMembers((prev) =>
        prev.map((m) =>
          m.id === member.id ? { ...m, role: originalRole, backendRole: originalBackendRole } : m
        )
      );
      showToast((err as Error).message || "Failed to update role.");
    }
  };

  // ── Invite (local optimistic) ─────────────────────────────────────────────
  const handleInvite = (emails: string[], role: string, message: string) => {
    const newInvites: Member[] = emails.map((email, idx) => ({
      id: `optimistic-${Date.now()}-${idx}`,
      name: email.split("@")[0],
      email,
      role,
      backendRole: DISPLAY_TO_BACKEND[role] ?? "user",
      status: "Pending invite",
      lastActive: "Never",
    }));
    setMembers((prev) => [...prev, ...newInvites]);
    showToast(
      message.trim()
        ? `Invited ${emails.length} teammate(s) with personal note.`
        : `Invited ${emails.length} teammate(s).`
    );
  };

  const openConfirmModal = (
    type: "remove" | "deactivate" | "activate" | "change_role",
    member: Member,
    targetRole?: string
  ) => {
    setActiveDropdownId(null);
    setConfirmModal({
      isOpen: true, type,
      memberId: member.id, memberName: member.name,
      targetRole,
      targetBackendRole: targetRole ? DISPLAY_TO_BACKEND[targetRole] : undefined,
    });
  };

  const handleConfirmAction = async () => {
    const { type, memberId, memberName, targetRole, targetBackendRole } = confirmModal;
    setConfirmModal({ isOpen: false, type: "", memberId: "", memberName: "" });

    if (type === "change_role" && targetRole && targetBackendRole) {
      const member = members.find((m) => m.id === memberId);
      if (member) await handleRoleChange(member, targetRole);
      return;
    }

    setMembers((prev) => {
      if (type === "remove") return prev.filter((m) => m.id !== memberId);
      return prev.map((m) => {
        if (m.id !== memberId) return m;
        if (type === "deactivate") return { ...m, status: "Deactivated" as const };
        if (type === "activate") return { ...m, status: "Active" as const };
        return m;
      });
    });

    const msgs: Record<string, string> = {
      remove: `${memberName} was removed from the workspace.`,
      deactivate: `${memberName}'s account has been deactivated.`,
      activate: `${memberName}'s account has been activated.`,
    };
    showToast(msgs[type] ?? "Action complete.");
  };

  const clearFilters = () => { setSearchTerm(""); setSelectedRoleFilter("All"); setSelectedStatusFilter("All"); };

  const filteredMembers = useMemo(() => members.filter((m) => {
    const matchSearch = m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchRole = selectedRoleFilter === "All" || m.role === selectedRoleFilter;
    const matchStatus = selectedStatusFilter === "All" || m.status === selectedStatusFilter;
    return matchSearch && matchRole && matchStatus;
  }), [members, searchTerm, selectedRoleFilter, selectedStatusFilter]);

  const activeCount = members.filter((m) => m.status === "Active").length;
  const pendingCount = members.filter((m) => m.status === "Pending invite").length;

  const statusStyle = (status: string) => ({
    background: status === "Active" ? "rgba(16,185,129,0.08)" : status === "Pending invite" ? "rgba(245,158,11,0.08)" : "rgba(107,114,128,0.08)",
    color: status === "Active" ? "#10b981" : status === "Pending invite" ? "#f59e0b" : "var(--ink-muted)",
    border: `1px solid ${status === "Active" ? "rgba(16,185,129,0.15)" : status === "Pending invite" ? "rgba(245,158,11,0.15)" : "rgba(107,114,128,0.15)"}`,
  });

  return (
    <DashboardShell active="Team">
      <div className="max-w-6xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-2xl font-bold tracking-tight" style={{ color: "var(--ink)" }}>Team</h2>
              {!isAdmin && (
                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider" style={{ background: "rgba(107,114,128,0.15)", color: "var(--ink-muted)" }}>
                  View only
                </span>
              )}
            </div>
            <p className="text-sm mt-0.5" style={{ color: "var(--ink-muted)" }}>
              {activeCount} active · {pendingCount} pending
            </p>
          </div>
          {isAdmin && (
            <button onClick={() => setIsInviteOpen(true)} className="btn-primary-teal text-sm py-2.5 px-5">
              + Invite teammate
            </button>
          )}
        </div>

        {/* Search & Filters */}
        <div className="surface p-4 rounded-xl flex flex-col md:flex-row gap-4 items-center shadow-sm">
          <div className="relative w-full md:flex-1">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400">
              <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.637 10.636Z" />
            </svg>
            <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Search by name or email…" className="input-field pl-10 py-2.5 text-sm" />
          </div>
          <div className="flex flex-wrap gap-3 w-full md:w-auto">
            <select value={selectedRoleFilter} onChange={(e) => setSelectedRoleFilter(e.target.value)} className="input-field py-2.5 text-xs font-medium">
              <option value="All">All Roles</option>
              {ROLES_DISPLAY.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
            <select value={selectedStatusFilter} onChange={(e) => setSelectedStatusFilter(e.target.value)} className="input-field py-2.5 text-xs font-medium">
              <option value="All">All Statuses</option>
              <option value="Active">Active</option>
              <option value="Pending invite">Pending</option>
              <option value="Deactivated">Deactivated</option>
            </select>
          </div>
        </div>

        {/* Error state */}
        {error && (
          <div className="surface rounded-xl p-6 text-center">
            <p className="font-semibold mb-1" style={{ color: "var(--ink)" }}>
              {error.type === "permission" ? "Access Restricted" : "Failed to Load"}
            </p>
            <p className="text-sm mb-4" style={{ color: "var(--ink-muted)" }}>{error.msg}</p>
            {error.type === "network" && (
              <button onClick={fetchMembers} className="btn-outline-soft py-2 px-4 text-xs">Retry</button>
            )}
          </div>
        )}

        {/* Table */}
        {!error && (
          <div className="surface rounded-2xl overflow-hidden shadow-sm">
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--line)" }}>
                    {["Member", "Email", "Role", "Status", "Last Active", ...(isAdmin ? ["Actions"] : [])].map((h) => (
                      <th key={h} className="px-6 py-4 text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--ink-muted)", textAlign: h === "Actions" ? "right" : "left" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--line)]">
                  {loading
                    ? [1, 2, 3].map((i) => <SkeletonRow key={i} />)
                    : filteredMembers.length === 0
                    ? (
                      <tr>
                        <td colSpan={isAdmin ? 6 : 5}>
                          <EmptyState
                            icon={<TeamEmptyIcon />}
                            title={searchTerm || selectedRoleFilter !== "All" || selectedStatusFilter !== "All" ? "No members match your filters" : "No team members yet"}
                            description={searchTerm || selectedRoleFilter !== "All" || selectedStatusFilter !== "All" ? "Try adjusting your search or filters to find who you're looking for." : "Invite teammates to get started."}
                            actionLabel={searchTerm || selectedRoleFilter !== "All" || selectedStatusFilter !== "All" ? "Clear filters" : undefined}
                            onAction={searchTerm || selectedRoleFilter !== "All" || selectedStatusFilter !== "All" ? clearFilters : undefined}
                          />
                        </td>
                      </tr>
                    )
                    : filteredMembers.map((member) => (
                      <tr key={member.id} className="hover:bg-white/[0.02] transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm shrink-0" style={{ background: "rgba(69,222,196,0.15)", color: "var(--teal-dim)" }}>
                              {getInitials(member.name)}
                            </div>
                            <span className="font-semibold text-sm" style={{ color: "var(--ink)" }}>{member.name}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm" style={{ color: "var(--ink-muted)" }}>{member.email}</td>
                        <td className="px-6 py-4">
                          {isAdmin ? (
                            <select
                              value={member.role}
                              onChange={(e) => openConfirmModal("change_role", member, e.target.value)}
                              className="bg-transparent text-sm focus:outline-none border-none py-1 cursor-pointer font-medium"
                              style={{ color: "var(--ink)" }}
                            >
                              {ROLES_DISPLAY.map((r) => <option key={r} value={r} className="text-black">{r}</option>)}
                            </select>
                          ) : (
                            <RoleBadge role={member.role} />
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold" style={statusStyle(member.status)}>
                            <span className="w-1.5 h-1.5 rounded-full" style={{ background: member.status === "Active" ? "#10b981" : member.status === "Pending invite" ? "#f59e0b" : "var(--ink-muted)" }} />
                            {member.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm" style={{ color: "var(--ink-muted)" }}>{member.lastActive}</td>
                        {isAdmin && (
                          <td className="px-6 py-4 text-right relative">
                            <button onClick={() => setActiveDropdownId(activeDropdownId === member.id ? null : member.id)} className="p-1 rounded transition-colors" style={{ color: "var(--ink-muted)" }}>
                              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.75a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5ZM12 12.75a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5ZM12 18.75a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5Z" />
                              </svg>
                            </button>
                            {activeDropdownId === member.id && (
                              <>
                                <div className="fixed inset-0 z-10" onClick={() => setActiveDropdownId(null)} />
                                <div className="absolute right-6 top-12 z-20 w-44 py-1.5 rounded-lg surface shadow-lg text-left" style={{ background: "var(--bg-surface)" }}>
                                  {member.status === "Active" && (
                                    <button onClick={() => openConfirmModal("deactivate", member)} className="w-full px-4 py-2 text-xs font-semibold text-left hover:bg-white/[0.04]" style={{ color: "var(--ink)" }}>Deactivate</button>
                                  )}
                                  {member.status === "Deactivated" && (
                                    <button onClick={() => openConfirmModal("activate", member)} className="w-full px-4 py-2 text-xs font-semibold text-left hover:bg-white/[0.04]" style={{ color: "var(--ink)" }}>Activate</button>
                                  )}
                                  <div className="h-px my-1" style={{ background: "var(--line)" }} />
                                  <button onClick={() => openConfirmModal("remove", member)} className="w-full px-4 py-2 text-xs font-semibold text-left hover:bg-white/[0.04] text-red-500">Remove</button>
                                </div>
                              </>
                            )}
                          </td>
                        )}
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Role permissions reference */}
        <div className="surface rounded-2xl overflow-hidden shadow-sm">
          <button onClick={() => setIsRoleGuideOpen(!isRoleGuideOpen)} className="w-full p-5 flex items-center justify-between text-left focus:outline-none">
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider" style={{ color: "var(--ink)" }}>Role Permissions Reference</h3>
              <p className="text-xs mt-1" style={{ color: "var(--ink-muted)" }}>Understand workspace permissions for each role.</p>
            </div>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className={`w-4 h-4 transition-transform duration-200 ${isRoleGuideOpen ? "rotate-180" : ""}`}>
              <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
            </svg>
          </button>
          {isRoleGuideOpen && (
            <div className="p-5 pt-0 border-t" style={{ borderColor: "var(--line)" }}>
              <table className="w-full text-left text-xs border-collapse mt-4">
                <thead>
                  <tr style={{ borderBottom: "1.5px solid var(--line)" }}>
                    <th className="pb-3 pr-4 font-bold" style={{ color: "var(--ink)" }}>Role</th>
                    <th className="pb-3 font-bold" style={{ color: "var(--ink)" }}>Permissions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--line)]">
                  {[
                    ["Administrator", "Full platform access — billing, integrations, channels, team management."],
                    ["Marketing Team", "Create campaigns, view analytics, schedule posts, approve submissions."],
                    ["Content Creator", "Draft and schedule posts. No direct publishing or approval rights."],
                  ].map(([role, desc]) => (
                    <tr key={role}>
                      <td className="py-3.5 pr-4"><RoleBadge role={role} /></td>
                      <td className="py-3.5" style={{ color: "var(--ink-muted)" }}>{desc}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <InviteModal isOpen={isInviteOpen} onClose={() => setIsInviteOpen(false)} onInvite={handleInvite} />

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal({ isOpen: false, type: "", memberId: "", memberName: "" })}
        onConfirm={handleConfirmAction}
        title={
          confirmModal.type === "remove" ? "Remove Member?" :
          confirmModal.type === "deactivate" ? "Deactivate Account?" :
          confirmModal.type === "activate" ? "Activate Account?" : "Update Role?"
        }
        message={
          confirmModal.type === "remove" ? `Remove ${confirmModal.memberName} from the workspace?` :
          confirmModal.type === "deactivate" ? `Deactivate ${confirmModal.memberName}'s account?` :
          confirmModal.type === "activate" ? `Reactivate ${confirmModal.memberName}'s account?` :
          `Update ${confirmModal.memberName}'s role to ${confirmModal.targetRole}?`
        }
        confirmText={
          confirmModal.type === "remove" ? "Remove" :
          confirmModal.type === "deactivate" ? "Deactivate" :
          confirmModal.type === "activate" ? "Activate" : "Update Role"
        }
        isDestructive={confirmModal.type === "remove" || confirmModal.type === "deactivate"}
      />

      {/* Toast */}
      <div
        className="fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl text-sm font-medium transition-all shadow-lg"
        style={{ background: "var(--ink)", color: "var(--bg-canvas)", opacity: toast ? 1 : 0, transform: toast ? "translateY(0)" : "translateY(8px)", pointerEvents: "none" }}
      >
        {toast}
      </div>
    </DashboardShell>
  );
}
