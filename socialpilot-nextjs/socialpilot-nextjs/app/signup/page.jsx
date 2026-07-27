import AuthScreen from "@/components/AuthScreen";

// Renders the same combined auth screen as /login — the mode can be
// switched in place (no page reload) via the "Log in" link.
export default function SignupPage() {
  return <AuthScreen initialMode="signup" />;
}
