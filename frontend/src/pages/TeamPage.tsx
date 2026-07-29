import { useState, useMemo } from "react";
import DashboardShell from "../components/DashboardShell";
import RoleBadge from "../components/RoleBadge";
import InviteModal from "../components/InviteModal";
import ConfirmModal from "../components/ConfirmModal";

interface Member {
  id: string;
  name: string;
  email: string;
  role: string;
  status: "Active" | "Pending invite" | "Deactivated";
  lastActive: string;
}

const INITIAL_MEMBERS: Member[] = [
  { id: "1", name: "Alex Rivera", email: "alex.rivera@socialpilot.co", role: "Administrator", status: "Active", lastActive: "Active now" },
  { id: "2", name: "Sarah Connor", email: "sarah.c@socialpilot.co", role: "Business User", status: "Active", lastActive: "2 hours ago" },
  { id: "3", name: "Michael Vance", email: "m.vance@socialpilot.co", role: "Marketing Team", status: "Active", lastActive: "Yesterday" },
  { id: "4", name: "Elena Rostova", email: "elena.r@socialpilot.co", role: "Content Creator", status: "Active", lastActive: "3 days ago" },
  { id: "5", name: "Marcus Brody", email: "marcus.b@socialpilot.co", role: "Content Creator", status: "Pending invite", lastActive: "Never" },
  { id: "6", name: "David Miller", email: "david.m@socialpilot.co", role: "Marketing Team", status: "Deactivated", lastActive: "1 week ago" },
];

const ROLES = ["Content Creator", "Marketing Team", "Business User", "Administrator"];

export default function TeamPage() {
  // Mock role switcher to test permissions
  const [currentUserRole, setCurrentUserRole] = useState<string>("Administrator");
  const [members, setMembers] = useState<Member[]>(INITIAL_MEMBERS);

  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRoleFilter, setSelectedRoleFilter] = useState("All");
  const [selectedStatusFilter, setSelectedStatusFilter] = useState("All");

  // Modals state
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [activeDropdownId, setActiveDropdownId] = useState<string | null>(null);
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    type: "remove" | "deactivate" | "activate" | "change_role" | "";
    memberId: string;
    memberName: string;
    targetRole?: string;
  }>({
    isOpen: false,
    type: "",
    memberId: "",
    memberName: "",
  });

  // Collapsible role info
  const [isRoleGuideOpen, setIsRoleGuideOpen] = useState(true);

  // Toast
  const [toast, setToast] = useState("");
  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 2500);
  };

  // Check if current user is admin/business user
  const isAdmin = currentUserRole === "Administrator" || currentUserRole === "Business User";

  // Filtered members list
  const filteredMembers = useMemo(() => {
    return members.filter((member) => {
      const matchesSearch =
        member.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        member.email.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesRole = selectedRoleFilter === "All" || member.role === selectedRoleFilter;
      const matchesStatus = selectedStatusFilter === "All" || member.status === selectedStatusFilter;
      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [members, searchTerm, selectedRoleFilter, selectedStatusFilter]);

  // Statistics
  const activeCount = members.filter((m) => m.status === "Active").length;
  const pendingCount = members.filter((m) => m.status === "Pending invite").length;

  const handleInvite = (emails: string[], role: string, message: string) => {
    const newInvites: Member[] = emails.map((email, idx) => ({
      id: `optimistic-${Date.now()}-${idx}`,
      name: email.split("@")[0].charAt(0).toUpperCase() + email.split("@")[0].slice(1),
      email,
      role,
      status: "Pending invite",
      lastActive: "Never",
    }));

    setMembers((prev) => [...prev, ...newInvites]);
    const toastMsg = `Successfully invited ${emails.length} teammate${emails.length > 1 ? "s" : ""}`;
    showToast(message.trim() ? `${toastMsg} with personal note.` : toastMsg);
  };

  const handleResendInvite = (member: Member) => {
    setActiveDropdownId(null);
    showToast(`Invitation email resent to ${member.email}`);
  };

  const openConfirmModal = (
    type: "remove" | "deactivate" | "activate" | "change_role",
    member: Member,
    targetRole?: string
  ) => {
    setActiveDropdownId(null);
    setConfirmModal({
      isOpen: true,
      type,
      memberId: member.id,
      memberName: member.name,
      targetRole,
    });
  };

  const handleConfirmAction = () => {
    const { type, memberId, memberName, targetRole } = confirmModal;

    setMembers((prev) => {
      if (type === "remove") {
        return prev.filter((m) => m.id !== memberId);
      }
      return prev.map((m) => {
        if (m.id === memberId) {
          if (type === "deactivate") return { ...m, status: "Deactivated" as const };
          if (type === "activate") return { ...m, status: "Active" as const };
          if (type === "change_role" && targetRole) return { ...m, role: targetRole };
        }
        return m;
      });
    });

    if (type === "remove") {
      showToast(`${memberName} was removed from the workspace.`);
    } else if (type === "deactivate") {
      showToast(`${memberName}'s account has been deactivated.`);
    } else if (type === "activate") {
      showToast(`${memberName}'s account has been activated.`);
    } else if (type === "change_role" && targetRole) {
      showToast(`${memberName}'s role updated to ${targetRole}.`);
    }

    setConfirmModal({ isOpen: false, type: "", memberId: "", memberName: "" });
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .toUpperCase()
      .substring(0, 2);
  };

  const clearFilters = () => {
    setSearchTerm("");
    setSelectedRoleFilter("All");
    setSelectedStatusFilter("All");
  };

  return (
    <DashboardShell active="Team">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Mock Role Switcher (Utility Tool for testing) */}
        <div className="p-3.5 rounded-xl border flex flex-wrap items-center justify-between gap-4" style={{ background: "rgba(69, 222, 196, 0.05)", borderColor: "rgba(69, 222, 196, 0.2)" }}>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-teal animate-pulse" />
            <span className="text-xs font-semibold uppercase tracking-wider text-teal-dim">Tester Controls</span>
            <span className="text-xs text-muted-light dark:text-muted-dark">(Simulate different views)</span>
          </div>
          <div className="flex items-center gap-2">
            <label htmlFor="mock-role-selector" className="text-xs font-medium">Viewing as:</label>
            <select
              id="mock-role-selector"
              value={currentUserRole}
              onChange={(e) => setCurrentUserRole(e.target.value)}
              className="bg-transparent border rounded px-2.5 py-1 text-xs font-semibold focus:outline-none"
              style={{ borderColor: "var(--line)", color: "var(--ink)" }}
            >
              {ROLES.map((r) => (
                <option key={r} value={r} className="text-black">{r}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl font-bold tracking-tight" style={{ color: "var(--ink)" }}>Team</h1>
              {!isAdmin && (
                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider" style={{ background: "rgba(107, 114, 128, 0.15)", color: "var(--ink-muted)" }}>
                  View only
                </span>
              )}
            </div>
            <p className="text-sm mt-0.5" style={{ color: "var(--ink-muted)" }}>
              {activeCount} active member{activeCount !== 1 ? "s" : ""} · {pendingCount} pending invite{pendingCount !== 1 ? "s" : ""}
            </p>
          </div>
          {isAdmin && (
            <button
              onClick={() => setIsInviteOpen(true)}
              className="btn-primary-teal text-sm py-2.5 px-4.5"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4.5 h-4.5 mr-2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              Invite teammate
            </button>
          )}
        </div>

        {/* Filters/Search Bar */}
        <div className="surface p-4 rounded-xl flex flex-col md:flex-row gap-4 items-center shadow-sm">
          {/* Search bar */}
          <div className="relative w-full md:flex-1">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-gray-400">
              <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.637 10.636Z" />
            </svg>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by name or email..."
              className="input-field pl-10 py-2.5 text-sm"
            />
          </div>

          {/* Filter dropdowns */}
          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            <div className="flex-1 sm:flex-initial">
              <select
                value={selectedRoleFilter}
                onChange={(e) => setSelectedRoleFilter(e.target.value)}
                className="input-field py-2.5 text-xs font-medium"
              >
                <option value="All">All Roles</option>
                {ROLES.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>
            <div className="flex-1 sm:flex-initial">
              <select
                value={selectedStatusFilter}
                onChange={(e) => setSelectedStatusFilter(e.target.value)}
                className="input-field py-2.5 text-xs font-medium"
              >
                <option value="All">All Statuses</option>
                <option value="Active">Active</option>
                <option value="Pending invite">Pending</option>
                <option value="Deactivated">Deactivated</option>
              </select>
            </div>
          </div>
        </div>

        {/* Member Table & stacked card list */}
        {filteredMembers.length === 0 ? (
          <div className="surface rounded-2xl p-12 text-center shadow-sm">
            <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: "rgba(107, 114, 128, 0.08)" }}>
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-gray-400">
                <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.97 5.97 0 0 0-.75-2.906m-.113-1.897a3.3 3.3 0 1 1 3.597-3.598 3.3 3.3 0 0 1-3.597 3.599m-12 2.13a9.094 9.094 0 0 0-3.741-.479 3 3 0 0 0 4.682-2.72m-.94 3.197.002.031c0 .225.012.447.037.666A11.944 11.944 0 0 0 12 21c2.17 0 4.207-.576 5.963-1.584A6.062 6.062 0 0 0 18 18.722m-12 0a5.97 5.97 0 0 1 .75-2.906m.113-1.897a3.3 3.3 0 1 0-3.597-3.598 3.3 3.3 0 0 0 3.597 3.599m9-4.996a3 3 0 1 1-6 0 3 3 0 0 1 6 0ZM6 16.25a6 6 0 0 1 12 0v0" />
              </svg>
            </div>
            <h3 className="text-base font-semibold" style={{ color: "var(--ink)" }}>No members match your filters</h3>
            <p className="text-sm mt-1 mb-5" style={{ color: "var(--ink-muted)" }}>
              Try editing your search term or filters to find what you are looking for.
            </p>
            <button
              onClick={clearFilters}
              className="btn-outline-soft py-2 px-4 text-xs font-medium inline-flex items-center gap-1.5"
            >
              Clear filters
            </button>
          </div>
        ) : (
          <div className="surface rounded-2xl overflow-hidden shadow-sm">
            {/* Desktop Table View (>= 768px) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--line)", background: "rgba(256, 256, 256, 0.02)" }}>
                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--ink-muted)" }}>Member</th>
                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--ink-muted)" }}>Email</th>
                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--ink-muted)" }}>Role</th>
                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--ink-muted)" }}>Status</th>
                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--ink-muted)" }}>Last Active</th>
                    {isAdmin && <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-right" style={{ color: "var(--ink-muted)" }}>Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--line)]">
                  {filteredMembers.map((member) => (
                    <tr key={member.id} className="hover:bg-white/[0.02] transition-colors">
                      {/* Name & Avatar */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm bg-teal/15 text-teal-dim shrink-0">
                            {getInitials(member.name)}
                          </div>
                          <div>
                            <div className="font-semibold text-sm" style={{ color: "var(--ink)" }}>{member.name}</div>
                          </div>
                        </div>
                      </td>

                      {/* Email */}
                      <td className="px-6 py-4 text-sm" style={{ color: "var(--ink-muted)" }}>
                        {member.email}
                      </td>

                      {/* Role */}
                      <td className="px-6 py-4">
                        {isAdmin ? (
                          <select
                            value={member.role}
                            onChange={(e) => openConfirmModal("change_role", member, e.target.value)}
                            className="bg-transparent text-sm focus:outline-none border-none py-1 cursor-pointer font-medium"
                            style={{ color: "var(--ink)" }}
                          >
                            {ROLES.map((r) => (
                              <option key={r} value={r} className="text-black">{r}</option>
                            ))}
                          </select>
                        ) : (
                          <RoleBadge role={member.role} />
                        )}
                      </td>

                      {/* Status */}
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold" style={{
                          background: member.status === "Active" ? "rgba(16, 185, 129, 0.08)" : member.status === "Pending invite" ? "rgba(245, 158, 11, 0.08)" : "rgba(107, 114, 128, 0.08)",
                          color: member.status === "Active" ? "#10b981" : member.status === "Pending invite" ? "#f59e0b" : "var(--ink-muted)",
                          border: member.status === "Active" ? "1px solid rgba(16, 185, 129, 0.15)" : member.status === "Pending invite" ? "1px solid rgba(245, 158, 11, 0.15)" : "1px solid rgba(107, 114, 128, 0.15)"
                        }}>
                          <span className="w-1.5 h-1.5 rounded-full" style={{
                            background: member.status === "Active" ? "#10b981" : member.status === "Pending invite" ? "#f59e0b" : "var(--ink-muted)"
                          }} />
                          {member.status}
                        </span>
                      </td>

                      {/* Last active */}
                      <td className="px-6 py-4 text-sm" style={{ color: "var(--ink-muted)" }}>
                        {member.lastActive}
                      </td>

                      {/* Actions */}
                      {isAdmin && (
                        <td className="px-6 py-4 text-right relative">
                          <button
                            onClick={() => setActiveDropdownId(activeDropdownId === member.id ? null : member.id)}
                            className="p-1 text-gray-400 hover:text-gray-600 rounded transition-colors"
                            aria-label="Actions menu"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.75a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5ZM12 12.75a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5ZM12 18.75a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5Z" />
                            </svg>
                          </button>

                          {/* Dropdown Menu */}
                          {activeDropdownId === member.id && (
                            <>
                              <div className="fixed inset-0 z-10" onClick={() => setActiveDropdownId(null)} />
                              <div className="absolute right-6 top-12 z-20 w-44 py-1.5 rounded-lg surface shadow-lg text-left" style={{ background: "var(--bg-surface)" }}>
                                {member.status === "Pending invite" && (
                                  <button
                                    onClick={() => handleResendInvite(member)}
                                    className="w-full px-4 py-2 text-xs font-semibold flex items-center hover:bg-white/[0.04]"
                                    style={{ color: "var(--ink)" }}
                                  >
                                    Resend invite
                                  </button>
                                )}
                                {member.status === "Active" ? (
                                  <button
                                    onClick={() => openConfirmModal("deactivate", member)}
                                    className="w-full px-4 py-2 text-xs font-semibold flex items-center hover:bg-white/[0.04]"
                                    style={{ color: "var(--ink)" }}
                                  >
                                    Deactivate
                                  </button>
                                ) : member.status === "Deactivated" ? (
                                  <button
                                    onClick={() => openConfirmModal("activate", member)}
                                    className="w-full px-4 py-2 text-xs font-semibold flex items-center hover:bg-white/[0.04]"
                                    style={{ color: "var(--ink)" }}
                                  >
                                    Activate
                                  </button>
                                ) : null}
                                <div className="h-[1px] my-1" style={{ background: "var(--line)" }} />
                                <button
                                  onClick={() => openConfirmModal("remove", member)}
                                  className="w-full px-4 py-2 text-xs font-semibold flex items-center hover:bg-white/[0.04] text-red-500"
                                >
                                  Remove from workspace
                                </button>
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

            {/* Mobile Stacked Card View (< 768px) */}
            <div className="md:hidden divide-y divide-[var(--line)]">
              {filteredMembers.map((member) => (
                <div key={member.id} className="p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm bg-teal/15 text-teal-dim shrink-0">
                        {getInitials(member.name)}
                      </div>
                      <div>
                        <h4 className="font-semibold text-sm" style={{ color: "var(--ink)" }}>{member.name}</h4>
                        <span className="text-xs" style={{ color: "var(--ink-muted)" }}>{member.email}</span>
                      </div>
                    </div>

                    {/* Mobile Actions Button */}
                    {isAdmin && (
                      <div className="relative">
                        <button
                          onClick={() => setActiveDropdownId(activeDropdownId === member.id ? null : member.id)}
                          className="p-1.5 text-gray-400 hover:text-gray-600 rounded transition-colors"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5.5 h-5.5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.75a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5ZM12 12.75a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5ZM12 18.75a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5Z" />
                          </svg>
                        </button>
                        {activeDropdownId === member.id && (
                          <>
                            <div className="fixed inset-0 z-10" onClick={() => setActiveDropdownId(null)} />
                            <div className="absolute right-0 top-9 z-20 w-44 py-1.5 rounded-lg surface shadow-lg" style={{ background: "var(--bg-surface)" }}>
                              {member.status === "Pending invite" && (
                                <button
                                  onClick={() => handleResendInvite(member)}
                                  className="w-full px-4 py-2 text-xs font-semibold flex items-center text-left hover:bg-white/[0.04]"
                                  style={{ color: "var(--ink)" }}
                                >
                                  Resend invite
                                </button>
                              )}
                              {member.status === "Active" ? (
                                <button
                                  onClick={() => openConfirmModal("deactivate", member)}
                                  className="w-full px-4 py-2 text-xs font-semibold flex items-center text-left hover:bg-white/[0.04]"
                                  style={{ color: "var(--ink)" }}
                                >
                                  Deactivate
                                </button>
                              ) : member.status === "Deactivated" ? (
                                <button
                                  onClick={() => openConfirmModal("activate", member)}
                                  className="w-full px-4 py-2 text-xs font-semibold flex items-center text-left hover:bg-white/[0.04]"
                                  style={{ color: "var(--ink)" }}
                                >
                                  Activate
                                </button>
                              ) : null}
                              <div className="h-[1px] my-1" style={{ background: "var(--line)" }} />
                              <button
                                onClick={() => openConfirmModal("remove", member)}
                                className="w-full px-4 py-2 text-xs font-semibold flex items-center text-left hover:bg-white/[0.04] text-red-500"
                              >
                                Remove from workspace
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-1.5 text-xs">
                    <div>
                      <span className="font-semibold block uppercase tracking-wider mb-1" style={{ color: "var(--ink-muted)", fontSize: "10px" }}>Role</span>
                      {isAdmin ? (
                        <select
                          value={member.role}
                          onChange={(e) => openConfirmModal("change_role", member, e.target.value)}
                          className="bg-transparent focus:outline-none border-none py-0.5 cursor-pointer font-semibold text-xs"
                          style={{ color: "var(--ink)" }}
                        >
                          {ROLES.map((r) => (
                            <option key={r} value={r} className="text-black">{r}</option>
                          ))}
                        </select>
                      ) : (
                        <RoleBadge role={member.role} />
                      )}
                    </div>
                    <div>
                      <span className="font-semibold block uppercase tracking-wider mb-1" style={{ color: "var(--ink-muted)", fontSize: "10px" }}>Status</span>
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold" style={{
                        background: member.status === "Active" ? "rgba(16, 185, 129, 0.08)" : member.status === "Pending invite" ? "rgba(245, 158, 11, 0.08)" : "rgba(107, 114, 128, 0.08)",
                        color: member.status === "Active" ? "#10b981" : member.status === "Pending invite" ? "#f59e0b" : "var(--ink-muted)",
                        border: member.status === "Active" ? "1px solid rgba(16, 185, 129, 0.15)" : member.status === "Pending invite" ? "1px solid rgba(245, 158, 11, 0.15)" : "1px solid rgba(107, 114, 128, 0.15)"
                      }}>
                        <span className="w-1.5 h-1.5 rounded-full" style={{
                          background: member.status === "Active" ? "#10b981" : member.status === "Pending invite" ? "#f59e0b" : "var(--ink-muted)"
                        }} />
                        {member.status}
                      </span>
                    </div>
                    <div>
                      <span className="font-semibold block uppercase tracking-wider mb-1" style={{ color: "var(--ink-muted)", fontSize: "10px" }}>Last Active</span>
                      <span style={{ color: "var(--ink)" }}>{member.lastActive}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Collapsible Role Permissions Reference Card */}
        <div className="surface rounded-2xl overflow-hidden shadow-sm">
          <button
            onClick={() => setIsRoleGuideOpen(!isRoleGuideOpen)}
            className="w-full p-5 flex items-center justify-between text-left focus:outline-none"
          >
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider" style={{ color: "var(--ink)" }}>
                Role Permissions Reference
              </h3>
              <p className="text-xs mt-1" style={{ color: "var(--ink-muted)" }}>
                Understand what workspace permissions are granted to each role.
              </p>
            </div>
            <span className="p-1 text-gray-400">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className={`w-4 h-4 transition-transform duration-200 ${isRoleGuideOpen ? "rotate-180" : ""}`}>
                <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
              </svg>
            </span>
          </button>

          {isRoleGuideOpen && (
            <div className="p-5 pt-0 border-t" style={{ borderColor: "var(--line)" }}>
              <div className="overflow-x-auto mt-4">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr style={{ borderBottom: "1.5px solid var(--line)" }}>
                      <th className="pb-3 pr-4 font-bold" style={{ color: "var(--ink)" }}>Role</th>
                      <th className="pb-3 font-bold" style={{ color: "var(--ink)" }}>Description of Access Permissions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--line)]">
                    <tr>
                      <td className="py-3.5 pr-4"><RoleBadge role="Administrator" /></td>
                      <td className="py-3.5" style={{ color: "var(--ink-muted)" }}>
                        Full access to all platform controls, including billing, integrations, connected channels, and complete team roles management.
                      </td>
                    </tr>
                    <tr>
                      <td className="py-3.5 pr-4"><RoleBadge role="Business User" /></td>
                      <td className="py-3.5" style={{ color: "var(--ink-muted)" }}>
                        Comprehensive workspace controls, team management capability (inviting and removing members), and campaign scheduling.
                      </td>
                    </tr>
                    <tr>
                      <td className="py-3.5 pr-4"><RoleBadge role="Marketing Team" /></td>
                      <td className="py-3.5" style={{ color: "var(--ink-muted)" }}>
                        Create marketing campaigns, view full analytics logs, schedule social media posts, and approve teammate-submitted posts.
                      </td>
                    </tr>
                    <tr>
                      <td className="py-3.5 pr-4"><RoleBadge role="Content Creator" /></td>
                      <td className="py-3.5" style={{ color: "var(--ink-muted)" }}>
                        Draft and schedule brand campaigns and updates. No direct publishing rights or post approval permissions.
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

      </div>

      {/* Invite Teammate Modal */}
      <InviteModal
        isOpen={isInviteOpen}
        onClose={() => setIsInviteOpen(false)}
        onInvite={handleInvite}
      />

      {/* Action Confirmation Modal */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal({ isOpen: false, type: "", memberId: "", memberName: "" })}
        onConfirm={handleConfirmAction}
        title={
          confirmModal.type === "remove"
            ? "Remove Workspace Member?"
            : confirmModal.type === "deactivate"
            ? "Deactivate Account?"
            : confirmModal.type === "activate"
            ? "Activate Account?"
            : "Update Member Role?"
        }
        message={
          confirmModal.type === "remove"
            ? `Are you sure you want to permanently remove ${confirmModal.memberName} from your workspace? They will lose access to all campaigns.`
            : confirmModal.type === "deactivate"
            ? `Are you sure you want to deactivate ${confirmModal.memberName}'s account? They will not be able to log in until reactivated.`
            : confirmModal.type === "activate"
            ? `Are you sure you want to reactivate ${confirmModal.memberName}'s account? Their platform permissions will be restored.`
            : `Are you sure you want to update ${confirmModal.memberName}'s role to ${confirmModal.targetRole}?`
        }
        confirmText={
          confirmModal.type === "remove"
            ? "Remove Member"
            : confirmModal.type === "deactivate"
            ? "Deactivate"
            : confirmModal.type === "activate"
            ? "Activate"
            : "Update Role"
        }
        isDestructive={confirmModal.type === "remove" || confirmModal.type === "deactivate"}
      />

      {/* Notification Toast */}
      <div
        className="fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl text-sm font-medium transition-all shadow-lg"
        style={{
          background: "var(--ink)",
          color: "var(--bg-canvas)",
          opacity: toast ? 1 : 0,
          transform: toast ? "translateY(0)" : "translateY(8px)",
          pointerEvents: "none",
        }}
      >
        {toast}
      </div>

    </DashboardShell>
  );
}
