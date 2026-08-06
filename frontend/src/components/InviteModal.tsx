import { useEffect, useState } from "react";

interface InviteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInvite: (emails: string[], role: string, message: string) => void;
}

const ROLES = ["Content Creator", "Marketing Team", "Business User", "Administrator"];

export default function InviteModal({ isOpen, onClose, onInvite }: InviteModalProps) {
  const [emailsInput, setEmailsInput] = useState("");
  const [selectedRole, setSelectedRole] = useState("Content Creator");
  const [message, setMessage] = useState("");

  // Close on ESC key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
      // Reset inputs when opened
      setEmailsInput("");
      setSelectedRole("Content Creator");
      setMessage("");
    }

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Split comma-separated emails, trim whitespace and filter out empty strings
    const emails = emailsInput
      .split(",")
      .map((email) => email.trim())
      .filter((email) => email !== "");

    if (emails.length === 0) return;

    onInvite(emails, selectedRole, message);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm transition-opacity"
      role="dialog"
      aria-modal="true"
      aria-labelledby="invite-modal-title"
    >
      <div
        className="w-full max-w-lg p-6 rounded-2xl surface shadow-2xl animate-in scale-in duration-200"
        style={{ background: "var(--bg-surface)" }}
      >
        <div className="flex flex-col gap-5">
          <div className="flex items-center justify-between pb-3" style={{ borderBottom: "1px solid var(--line)" }}>
            <h2 id="invite-modal-title" className="text-lg font-bold" style={{ color: "var(--ink)" }}>
              Invite Teammates
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors p-1"
              aria-label="Close modal"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="w-5.5 h-5.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="field-label" htmlFor="emails-input">
                Teammate Emails
              </label>
              <input
                id="emails-input"
                type="text"
                required
                value={emailsInput}
                onChange={(e) => setEmailsInput(e.target.value)}
                placeholder="e.g. user1@company.com, user2@company.com"
                className="input-field"
                autoComplete="off"
              />
              <p className="text-[11px] mt-1.5" style={{ color: "var(--ink-muted)" }}>
                Support comma-separated email addresses for inviting multiple users.
              </p>
            </div>

            <div>
              <label className="field-label" htmlFor="role-select">
                Workspace Role
              </label>
              <select
                id="role-select"
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
                className="input-field"
              >
                {ROLES.map((role) => (
                  <option key={role} value={role}>
                    {role}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="field-label" htmlFor="personal-message">
                Personal Message (Optional)
              </label>
              <textarea
                id="personal-message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Add a friendly welcome note..."
                className="input-field h-24 resize-none"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-3" style={{ borderTop: "1px solid var(--line)" }}>
              <button
                type="button"
                onClick={onClose}
                className="btn-outline-soft py-2.5 px-4 text-sm font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn-primary-teal py-2.5 px-4 text-sm font-semibold"
              >
                Send Invites
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
