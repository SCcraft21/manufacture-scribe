import { createFileRoute, Link } from "@tanstack/react-router";
import { TopNav } from "@/components/TopNav";

export const Route = createFileRoute("/")({
  component: Index,
  head: () => ({
    meta: [
      { title: "NOVA NEXUS — AI manufacturing order chat" },
      { name: "description", content: "Create, update and inspect manufacturing orders through natural-language chat. Live dashboard, quality logs, role-based access." },
    ],
  }),
});

function Index() {
  return (
    <div className="min-h-screen">
      <TopNav />
      <main className="mx-auto max-w-6xl px-6 py-20">
        <section className="rounded-2xl border border-border/60 p-10 md:p-16" style={{ background: "var(--gradient-hero)" }}>
          <p className="font-mono text-xs uppercase tracking-[0.3em] text-primary">Manufacturing OS · v1</p>
          <h1 className="mt-4 text-4xl font-bold leading-tight md:text-6xl">
            Talk to the factory.<br />
            <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Orders, status, quality — by chat.
            </span>
          </h1>
          <p className="mt-6 max-w-2xl text-muted-foreground md:text-lg">
            NOVA NEXUS turns natural language into structured manufacturing orders. Type
            "I need 200 titanium flanges, 80mm bore, by July 20" and ship it.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/chat" className="rounded-md bg-primary px-5 py-3 font-semibold text-primary-foreground shadow-[var(--shadow-glow)] hover:opacity-90">
              Open chat
            </Link>
            <Link to="/dashboard" className="rounded-md border border-border bg-card/60 px-5 py-3 font-semibold hover:bg-secondary">
              View dashboard
            </Link>
            <Link to="/register" className="rounded-md px-5 py-3 font-semibold text-muted-foreground hover:text-foreground">
              Create account →
            </Link>
          </div>
        </section>

        <section className="mt-12 grid gap-4 md:grid-cols-3">
          {[
            { t: "Chat → Order", d: "Parses part, material, qty, dimensions and deadline from one sentence." },
            { t: "Status flow", d: "Received → In Review → Accepted. Update inline or via chat." },
            { t: "Quality logs", d: "Timestamped notes attached to each order, exposed via dashboard APIs." },
          ].map((f) => (
            <div key={f.t} className="rounded-xl border border-border/60 p-6" style={{ background: "var(--gradient-panel)" }}>
              <h3 className="text-lg font-semibold">{f.t}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{f.d}</p>
            </div>
          ))}
        </section>

        <section className="mt-12 rounded-xl border border-border/60 p-6 font-mono text-xs text-muted-foreground">
          Backend: Express + MongoDB + JWT + Socket.IO. See <code className="text-primary">backend/README.md</code> for setup. Configure the API URL in Settings after the backend is running.
        </section>
      </main>
    </div>
  );
}
