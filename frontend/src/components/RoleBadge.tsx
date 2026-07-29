interface RoleBadgeProps {
  role: string;
}

export default function RoleBadge({ role }: RoleBadgeProps) {
  let badgeStyle = {
    background: "rgba(256, 256, 256, 0.05)",
    color: "var(--ink-muted)",
    border: "1px solid var(--line)",
  };

  switch (role) {
    case "Administrator":
      badgeStyle = {
        background: "rgba(239, 68, 68, 0.08)", // Soft red
        color: "#f87171",
        border: "1px solid rgba(239, 68, 68, 0.2)",
      };
      break;
    case "Business User":
      badgeStyle = {
        background: "rgba(168, 85, 247, 0.08)", // Soft purple
        color: "#c084fc",
        border: "1px solid rgba(168, 85, 247, 0.2)",
      };
      break;
    case "Marketing Team":
      badgeStyle = {
        background: "rgba(59, 130, 246, 0.08)", // Soft blue
        color: "#60a5fa",
        border: "1px solid rgba(59, 130, 246, 0.2)",
      };
      break;
    case "Content Creator":
      badgeStyle = {
        background: "rgba(69, 222, 196, 0.1)", // Soft teal
        color: "var(--teal-dim)",
        border: "1px solid rgba(69, 222, 196, 0.25)",
      };
      break;
    default:
      break;
  }

  return (
    <span
      className="inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold select-none text-center whitespace-nowrap"
      style={badgeStyle}
    >
      {role}
    </span>
  );
}
