import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { TopNav } from "@/components/TopNav";
import { getApiUrl, setApiUrl, api } from "@/lib/nova-api";

export const Route = createFileRoute("/settings")({ component: SettingsPage });

function SettingsPage() {
  const [url, setUrl] = useState("");
  const [status, setStatus] = useState<"idle" | "ok" | "fail">("idle");
  const [msg, setMsg] = useState("");

  useEffect(() => setUrl(getApiUrl()), []);

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    setApiUrl(url);
    setMsg("Saved.");
    setTimeout(() => setMsg(""), 1500);
  };

  const test = async () => {
    setStatus("idle");
    setMsg("Testing…");
    try {
      const res = await api<{ status: string }>("/api/health", { auth: false });
      setStatus(res.status === "ok" ? "ok" : "fail");
      setMsg(res.status === "ok" ? "Backend reachable ✓" : "Unexpected response");
    } catch (e: any) {
      setStatus("fail");
      setMsg(`Cannot reach backend: ${e.message}`);
    }
  };

  return (
    <div className="min-h-screen">
      <TopNav />
      <main className="mx-auto max-w-2xl px-6 py-12">
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Point the frontend at your running NOVA NEXUS backend.
        </p>

        <form onSubmit={save} className="mt-8 space-y-4 rounded-xl border border-border/60 p-6" style={{ background: "var(--gradient-panel)" }}>
          <label className="block">
            <span className="mb-1 block text-xs font-mono uppercase tracking-wider text-muted-foreground">Backend API URL</span>
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://your-backend.onrender.com"
              className="w-full rounded-md border border-input bg-background/60 px-3 py-2 outline-none focus:border-primary"
            />
          </label>
          <div className="flex gap-2">
            <button type="submit" className="rounded-md bg-primary px-4 py-2 font-semibold text-primary-foreground hover:opacity-90">Save</button>
            <button type="button" onClick={test} className="rounded-md border border-border px-4 py-2 hover:bg-secondary">Test connection</button>
          </div>
          {msg && (
            <p className={`text-sm ${status === "fail" ? "text-destructive" : status === "ok" ? "text-accent" : "text-muted-foreground"}`}>{msg}</p>
          )}
        </form>

        <section className="mt-8 rounded-xl border border-border/60 p-6 text-sm text-muted-foreground" style={{ background: "var(--gradient-panel)" }}>
          <p className="font-semibold text-foreground">Run the backend locally:</p>
          <pre className="mt-2 overflow-auto rounded-md bg-background/60 p-3 font-mono text-xs">
{`cd backend
cp .env.example .env   # set MONGO_URI + JWT_SECRET
npm install
npm run dev`}
          </pre>
        </section>
      </main>
    </div>
  );
}
