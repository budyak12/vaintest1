import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Layout } from "@/components/Layout";
import { useAuth } from "@/lib/auth";
import { bootstrapAdmin } from "@/server/bootstrap-admin";

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [{ title: "Sign in — vain" }] }),
  loader: async () => {
    try {
      await bootstrapAdmin();
    } catch {
      // non-fatal: page still renders
    }
    return null;
  },
  component: AuthPage,
});

function AuthPage() {
  const { user, signIn, signUp, isLoading } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!isLoading && user) navigate({ to: "/" });
  }, [user, isLoading, navigate]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!username.trim() || password.length < 6) {
      setError("Username required, password ≥ 6 chars.");
      return;
    }
    setBusy(true);
    const fn = mode === "signin" ? signIn : signUp;
    const { error: err } = await fn(username, password);
    setBusy(false);
    if (err) setError(err);
    else navigate({ to: "/" });
  }

  return (
    <Layout>
      <div className="mx-auto max-w-sm">
        <h1 className="font-serif text-2xl font-semibold tracking-tight text-foreground">
          {mode === "signin" ? "Sign in" : "Create account"}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Username + password. No email needed.
        </p>

        <div className="mt-4 inline-flex overflow-hidden rounded-md border border-border text-xs">
          <button
            onClick={() => setMode("signin")}
            className={mode === "signin" ? "bg-foreground px-3 py-1.5 text-background" : "px-3 py-1.5 text-muted-foreground"}
          >
            Sign in
          </button>
          <button
            onClick={() => setMode("signup")}
            className={mode === "signup" ? "bg-foreground px-3 py-1.5 text-background" : "px-3 py-1.5 text-muted-foreground"}
          >
            Sign up
          </button>
        </div>

        <form onSubmit={submit} className="mt-6 flex flex-col gap-3">
          <input
            autoFocus
            value={username}
            onChange={(e) => setUsername(e.target.value.replace(/\s/g, ""))}
            placeholder="username"
            className="rounded-md border border-border bg-subtle px-3 py-2 text-sm focus:outline-none"
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="password"
            className="rounded-md border border-border bg-subtle px-3 py-2 text-sm focus:outline-none"
          />
          {error && <div className="text-xs text-destructive">{error}</div>}
          <button
            type="submit"
            disabled={busy}
            className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
          >
            {busy ? "…" : mode === "signin" ? "Sign in" : "Create account"}
          </button>
        </form>

        <p className="mt-6 text-xs text-muted-foreground">
          Admin login is reserved for <code className="font-mono">vainadminka</code>.{" "}
          <Link to="/" className="underline">Back to feed</Link>
        </p>
      </div>
    </Layout>
  );
}
