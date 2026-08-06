import { useEffect, useState } from "react";

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  requiresEmailText?: string;
  isDestructive?: boolean;
}

export default function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  requiresEmailText,
  isDestructive = false,
}: ConfirmModalProps) {
  const [emailInput, setEmailInput] = useState("");

  // Handle ESC key press to close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
      setEmailInput(""); // Reset input when opened
    }

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const isConfirmDisabled = requiresEmailText
    ? emailInput !== requiresEmailText
    : false;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm transition-opacity"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div
        className="w-full max-w-md p-6 rounded-2xl surface shadow-2xl animate-in scale-in duration-200"
        style={{ background: "var(--bg-surface)" }}
      >
        <div className="flex flex-col gap-4">
          <div>
            <h2
              id="modal-title"
              className="text-lg font-semibold"
              style={{ color: "var(--ink)" }}
            >
              {title}
            </h2>
            <p
              className="text-sm mt-2 leading-relaxed"
              style={{ color: "var(--ink-muted)" }}
            >
              {message}
            </p>
          </div>

          {requiresEmailText && (
            <div className="mt-2">
              <label className="field-label" htmlFor="confirm-email-input">
                Please type <span className="font-semibold text-teal-dim">{requiresEmailText}</span> to confirm:
              </label>
              <input
                id="confirm-email-input"
                type="text"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                placeholder="type email here"
                className="input-field"
                required
                autoComplete="off"
              />
            </div>
          )}

          <div className="flex items-center justify-end gap-3 mt-4 pt-2" style={{ borderTop: "1px solid var(--line)" }}>
            <button
              type="button"
              onClick={onClose}
              className="btn-outline-soft px-4 py-2 text-sm font-medium"
            >
              {cancelText}
            </button>
            <button
              type="button"
              disabled={isConfirmDisabled}
              onClick={() => {
                onConfirm();
                onClose();
              }}
              className="px-4 py-2 text-sm font-semibold rounded-lg transition-colors cursor-pointer"
              style={
                isDestructive
                  ? {
                      background: isConfirmDisabled ? "#fca5a5" : "#ef4444",
                      color: "#ffffff",
                      opacity: isConfirmDisabled ? 0.6 : 1,
                      cursor: isConfirmDisabled ? "not-allowed" : "pointer",
                    }
                  : {
                      background: isConfirmDisabled ? "var(--teal-dim)" : "var(--teal)",
                      color: "#06231D",
                      opacity: isConfirmDisabled ? 0.6 : 1,
                      cursor: isConfirmDisabled ? "not-allowed" : "pointer",
                    }
              }
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
