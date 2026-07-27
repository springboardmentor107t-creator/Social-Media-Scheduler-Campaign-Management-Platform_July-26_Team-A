"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import MapLoader from "@/components/MapLoader";
import ThemeToggle from "@/components/ThemeToggle";

const ROLES = ["Content Creator", "Marketing Team", "Business User", "Administrator"];

const COPY = {
  login: {
    eyebrow: "Welcome back",
    headline: "Every account, one control tower.",
    subhead:
      "Log in to schedule, publish, and track campaigns across every platform your team runs.",
  },
  signup: {
    eyebrow: "Get started",
    headline: "Built for teams, not just accounts.",
    subhead: "Roles decide what each teammate can post, approve, or measure.",
  },
};

export default function AuthScreen({ initialMode = "login" }) {
  const router = useRouter();
  const [mode, setMode] = useState(initialMode); // "login" | "signup"
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState("");

  const switchMode = (next) => {
    setMode(next);
    // keep the URL in sync (/login <-> /signup) without a full page reload,
    // since both routes render this same component client-side
    window.history.replaceState(null, "", `/${next}`);
  };

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(""), 2200);
  };

  const handleLogin = (e) => {
    e.preventDefault();
    setSubmitting(true);
    showToast("Signed in — loading your workspace…");
    // TODO: replace with real POST /api/auth/login call to the FastAPI backend
    setTimeout(() => router.push("/dashboard"), 500);
  };

  const handleSignup = (e) => {
    e.preventDefault();
    setSubmitting(true);
    showToast("Account created — welcome aboard!");
    // TODO: replace with real POST /api/auth/register call to the FastAPI backend
    setTimeout(() => router.push("/dashboard"), 500);
  };

  const copy = COPY[mode];

  return (
    <div className="min-h-screen grid grid-cols-1 md:grid-cols-2 relative">
      <div className="absolute top-6 right-6 z-10">
        <ThemeToggle />
      </div>

      {/* Visual side */}
      <div
        className="relative hidden md:flex flex-col justify-between p-12 overflow-hidden"
        style={{ background: "var(--bg-canvas)", borderRight: "1px solid var(--line)" }}
      >
        <div className="flex items-center gap-2.5">
          <span className="w-7 h-7 rounded-full" style={{ background: "var(--teal)" }} />
          <span className="font-semibold text-[17px]">SocialPilot</span>
        </div>

        <div className="w-full max-w-md mx-auto">
          <MapLoader variant="side" />
        </div>

        <div>
          <p className="text-lg font-semibold leading-snug max-w-sm mb-2">{copy.headline}</p>
          <p className="text-sm max-w-sm leading-relaxed" style={{ color: "var(--ink-muted)" }}>
            {copy.subhead}
          </p>
        </div>
      </div>

      {/* Form side — login and signup live on the same screen, only this block swaps */}
      <div className="flex items-center justify-center p-8 md:p-12">
        <div className="w-full max-w-sm">
          <div className="md:hidden flex items-center gap-2 mb-8">
            <span className="w-6 h-6 rounded-full" style={{ background: "var(--teal)" }} />
            <span className="font-semibold">SocialPilot</span>
          </div>

          <p className="text-xs font-semibold tracking-wide uppercase mb-1" style={{ color: "var(--ink-muted)" }}>
            {copy.eyebrow}
          </p>

          {mode === "login" ? (
            <>
              <h1 className="text-2xl font-semibold mb-7">Log in to your workspace</h1>
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="field-label" htmlFor="email">Email address</label>
                  <input id="email" type="email" required placeholder="you@company.com" className="input-field" />
                </div>
                <div>
                  <label className="field-label" htmlFor="password">Password</label>
                  <input id="password" type="password" required placeholder="••••••••" className="input-field" />
                </div>
                <div className="flex items-center justify-between text-sm pt-1">
                  <label className="flex items-center gap-2" style={{ color: "var(--ink-muted)" }}>
                    <input type="checkbox" />
                    Remember me
                  </label>
                  <a href="#" className="font-medium" style={{ color: "var(--teal-dim)" }}>
                    Forgot password?
                  </a>
                </div>
                <button type="submit" disabled={submitting} className="btn-primary-teal w-full mt-2">
                  {submitting ? "Logging in..." : "Log in"}
                </button>
                <button type="button" className="btn-outline-soft w-full">
                  Continue with Google
                </button>
              </form>
              <p className="text-sm text-center mt-7" style={{ color: "var(--ink-muted)" }}>
                New to SocialPilot?{" "}
                <button
                  type="button"
                  onClick={() => switchMode("signup")}
                  className="font-semibold"
                  style={{ color: "var(--teal-dim)" }}
                >
                  Create an account
                </button>
              </p>
            </>
          ) : (
            <>
              <h1 className="text-2xl font-semibold mb-7">Create your workspace</h1>
              <form onSubmit={handleSignup} className="space-y-4">
                <div>
                  <label className="field-label" htmlFor="name">Full name</label>
                  <input id="name" type="text" required placeholder="Alex Rivera" className="input-field" />
                </div>
                <div>
                  <label className="field-label" htmlFor="signup-email">Work email</label>
                  <input id="signup-email" type="email" required placeholder="you@company.com" className="input-field" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="field-label" htmlFor="signup-password">Password</label>
                    <input id="signup-password" type="password" required placeholder="8+ characters" className="input-field" />
                  </div>
                  <div>
                    <label className="field-label" htmlFor="confirm">Confirm</label>
                    <input id="confirm" type="password" required placeholder="Re-enter" className="input-field" />
                  </div>
                </div>
                <div>
                  <label className="field-label" htmlFor="role">Your role</label>
                  <select id="role" className="input-field" defaultValue={ROLES[0]}>
                    {ROLES.map((role) => (
                      <option key={role} value={role}>{role}</option>
                    ))}
                  </select>
                </div>
                <label className="flex items-start gap-2 text-sm pt-1" style={{ color: "var(--ink-muted)" }}>
                  <input type="checkbox" required className="mt-1" />
                  I agree to the Terms of Service and Privacy Policy
                </label>
                <button type="submit" disabled={submitting} className="btn-primary-teal w-full mt-2">
                  {submitting ? "Creating account..." : "Create account"}
                </button>
              </form>
              <p className="text-sm text-center mt-7" style={{ color: "var(--ink-muted)" }}>
                Already have an account?{" "}
                <button
                  type="button"
                  onClick={() => switchMode("login")}
                  className="font-semibold"
                  style={{ color: "var(--teal-dim)" }}
                >
                  Log in
                </button>
              </p>
            </>
          )}
        </div>
      </div>

      {/* toast */}
      <div
        className="fixed bottom-6 right-6 z-20 px-4 py-3 rounded-xl text-sm font-medium transition-all"
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
    </div>
  );
}
