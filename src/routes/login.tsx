import { createFileRoute, useRouter, Link } from "@tanstack/react-router";
import { useState } from "react";
import { TopNav } from "@/components/TopNav";
import { api, setAuth } from "@/lib/nova-api";

export const Route = createFileRoute("/login")({ component: LoginPage });

function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await api<{ user: any; token: string }>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
        auth: false,
      });
      setAuth({ token: res.token, user: res.user });
      router.navigate({ to: "/chat" });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen">
      <TopNav />
      <main className="mx-auto max-w-md px-6 py-16">
        <h1 className="text-3xl font-bold">Sign in</h1>
        <p className="mt-2 text-sm text-muted-foreground">Welcome back to NOVA NEXUS.</p>
        <form onSubmit={submit} className="mt-8 space-y-4 rounded-xl border border-border/60 p-6" style={{ background: "var(--gradient-panel)" }}>
          {error && <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}
          <Field label="Email" type="email" value={email} onChange={setEmail} />
          <Field label="Password" type="password" value={password} onChange={setPassword} />
          <button disabled={loading} className="w-full rounded-md bg-primary py-3 font-semibold text-primary-foreground shadow-[var(--shadow-glow)] hover:opacity-90 disabled:opacity-60">
            {loading ? "Signing in..." : "Sign in"}
          </button>
          <p className="text-center text-sm text-muted-foreground">
            No account? <Link to="/register" className="text-primary hover:underline">Create one</Link>
          </p>
        </form>
      </main>
    </div>
  );
}

function Field({ label, type, value, onChange }: { label: string; type: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-mono uppercase tracking-wider text-muted-foreground">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required
        className="w-full rounded-md border border-input bg-background/60 px-3 py-2 outline-none focus:border-primary focus:ring-2 focus:ring-ring/40"
      />
    </label>
  );
}
