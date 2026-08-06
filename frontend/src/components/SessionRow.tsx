interface SessionRowProps {
  device: string;
  browser: string;
  location: string;
  lastActive: string;
  isCurrent?: boolean;
  onRevoke: () => void;
}

export default function SessionRow({
  device,
  browser,
  location,
  lastActive,
  isCurrent = false,
  onRevoke,
}: SessionRowProps) {
  return (
    <div
      className="flex items-center justify-between p-4 rounded-xl border transition-colors"
      style={{
        borderColor: "var(--line)",
        background: "rgba(256, 256, 256, 0.02)",
      }}
    >
      <div className="flex gap-3">
        <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-teal/10 text-teal-dim">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className="w-5.5 h-5.5"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9 17.25v1.007a3 3 0 0 1-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0 1 15 18.257V17.25m6-12V15a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 15V5.25m18 0A2.25 2.25 0 0 0 18.75 3H5.25A2.25 2.25 0 0 0 3 5.25m18 0V12a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 12V5.25"
            />
          </svg>
        </div>

        <div>
          <div className="flex items-center gap-2">
            <span className="font-semibold text-[14px]" style={{ color: "var(--ink)" }}>
              {device} · {browser}
            </span>
            {isCurrent && (
              <span
                className="px-2 py-0.5 text-[10px] font-bold rounded-full uppercase tracking-wider"
                style={{ background: "var(--teal)", color: "#06231D" }}
              >
                Current Session
              </span>
            )}
          </div>
          <p className="text-xs mt-0.5" style={{ color: "var(--ink-muted)" }}>
            {location} · {lastActive}
          </p>
        </div>
      </div>

      {!isCurrent && (
        <button
          type="button"
          onClick={onRevoke}
          className="btn-outline-soft text-xs py-1.5 px-3 rounded-lg border font-medium text-red-500 hover:text-red-700 hover:border-red-500 transition-colors"
          style={{ borderColor: "var(--line)" }}
        >
          Log out
        </button>
      )}
    </div>
  );
}
