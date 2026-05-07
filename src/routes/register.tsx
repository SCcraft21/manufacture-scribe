import { createFileRoute, useRouter, Link } from "@tanstack/react-router";
import { useState } from "react";
import { TopNav } from "@/components/TopNav";
import { api, setAuth } from "@/lib/nova-api";

export const Route = createFileRoute("/register")({ component: RegisterPage });

function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"user" | "ops" | "admin">("user");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await api<{ user: any; token: string }>("/api/auth/register", {
        method: "POST",
        body: JSON.stringify({ name, email, password, role }),
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
        <h1 className="text-3xl font-bold">Create account</h1>
        <form onSubmit={submit} className="mt-8 space-y-4 rounded-xl border border-border/60 p-6" style={{ background: "var(--gradient-panel)" }}>
          {error && <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}
          <L label="Name"><input value={name} onChange={(e) => setName(e.target.value)} required className="inp" /></L>
          <L label="Email"><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="inp" /></L>
          <L label="Password"><input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} className="inp" /></L>
          <L label="Role">
            <select value={role} onChange={(e) => setRole(e.target.value as any)} className="inp">
              <option value="user">user</option>
              <option value="ops">ops</option>
              <option value="admin">admin</option>
            </select>
          </L>
          <button disabled={loading} className="w-full rounded-md bg-primary py-3 font-semibold text-primary-foreground shadow-[var(--shadow-glow)] hover:opacity-90 disabled:opacity-60">
            {loading ? "Creating..." : "Create account"}
          </button>
          <p className="text-center text-sm text-muted-foreground">
            Have an account? <Link to="/login" className="text-primary hover:underline">Sign in</Link>
          </p>
        </form>
      </main>
      <style>{`.inp{width:100%;border:1px solid var(--input);background:rgba(0,0,0,0.2);border-radius:0.5rem;padding:0.5rem 0.75rem;outline:none;color:var(--foreground)}.inp:focus{border-color:var(--primary)}`}</style>
    </div>
  );
}

function L({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-mono uppercase tracking-wider text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}
