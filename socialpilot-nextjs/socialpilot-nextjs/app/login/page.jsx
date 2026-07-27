import AuthScreen from "@/components/AuthScreen";

// Renders the same combined auth screen as /signup — the mode can be
// switched in place (no page reload) via the "Create an account" link.
export default function LoginPage() {
  return <AuthScreen initialMode="login" />;
}
