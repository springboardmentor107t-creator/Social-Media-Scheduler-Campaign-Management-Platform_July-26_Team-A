import DashboardShell from "@/components/DashboardShell";

const STATS = [
  { label: "Connected accounts", value: "4", hint: "of 6 platforms" },
  { label: "Team members", value: "6", hint: "3 roles active" },
  { label: "Pending invites", value: "1", hint: "awaiting response" },
  { label: "Setup progress", value: "75%", hint: "Milestone 1 checklist" },
];

const CHECKLIST = [
  { status: "Done", label: "Workspace & authentication configured" },
  { status: "Done", label: "Roles & permissions defined" },
  { status: "In progress", label: "Connect remaining social accounts" },
  { status: "Pending", label: "Invite remaining teammates" },
];

function StatusPill({ status }) {
  const styles = {
    Done: { background: "rgba(69,222,196,0.16)", color: "#1C8B77" },
    "In progress": { background: "rgba(52,152,219,0.14)", color: "#2477A8" },
    Pending: { background: "rgba(107,114,128,0.14)", color: "var(--ink-muted)" },
  };
  return (
    <span
      className="text-[11px] font-semibold uppercase tracking-wide px-2.5 py-1 rounded-full"
      style={styles[status]}
    >
      {status}
    </span>
  );
}

export default function DashboardPage() {
  return (
    <DashboardShell active="Dashboard">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {STATS.map((s) => (
          <div key={s.label} className="surface rounded-xl p-5">
            <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: "var(--ink-muted)" }}>
              {s.label}
            </p>
            <p className="text-3xl font-semibold">{s.value}</p>
            <p className="text-xs mt-1" style={{ color: "var(--ink-muted)" }}>{s.hint}</p>
          </div>
        ))}
      </div>

      <div className="surface rounded-xl p-5">
        <p className="font-semibold mb-4">Setup checklist</p>
        <div className="space-y-3">
          {CHECKLIST.map((item) => (
            <div key={item.label} className="flex items-center gap-3 text-sm">
              <StatusPill status={item.status} />
              <span>{item.label}</span>
            </div>
          ))}
        </div>
      </div>
    </DashboardShell>
  );
}
