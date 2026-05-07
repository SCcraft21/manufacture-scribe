import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { TopNav } from "@/components/TopNav";
import { api, getAuth } from "@/lib/nova-api";

export const Route = createFileRoute("/dashboard")({ component: DashboardPage });

type Order = {
  _id: string;
  orderNumber: number;
  partName: string;
  material?: string;
  quantity: number;
  dimensions?: string;
  deadline?: string;
  status: string;
  qualityLogs: { note: string; createdAt: string }[];
  updatedAt: string;
};

const STATUSES = ["Received", "In Review", "Accepted", "Rejected", "Completed"];

function DashboardPage() {
  const router = useRouter();
  const [stats, setStats] = useState<any>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!getAuth()) router.navigate({ to: "/login" });
  }, [router]);

  const load = async () => {
    setError("");
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.set("status", statusFilter);
      if (search) params.set("search", search);
      const [s, o] = await Promise.all([
        api<any>("/api/dashboard/stats"),
        api<{ items: Order[] }>(`/api/orders?${params}`),
      ]);
      setStats(s);
      setOrders(o.items);
    } catch (e: any) {
      setError(e.message);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  const updateStatus = async (n: number, status: string) => {
    try {
      await api(`/api/orders/${n}/status`, { method: "PATCH", body: JSON.stringify({ status }) });
      await load();
    } catch (e: any) {
      setError(e.message);
    }
  };

  return (
    <div className="min-h-screen">
      <TopNav />
      <main className="mx-auto max-w-6xl px-6 py-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Dashboard</h1>
            <p className="text-sm text-muted-foreground">Live view of all manufacturing orders.</p>
          </div>
          <div className="flex gap-2">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && load()}
              placeholder="Search part / material / notes…"
              className="rounded-md border border-input bg-background/60 px-3 py-2 text-sm outline-none focus:border-primary"
            />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-md border border-input bg-background/60 px-3 py-2 text-sm"
            >
              <option value="">All statuses</option>
              {STATUSES.map((s) => <option key={s}>{s}</option>)}
            </select>
            <button onClick={load} className="rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground hover:opacity-90">
              Refresh
            </button>
          </div>
        </div>

        {error && (
          <div className="mt-4 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
        )}

        {stats && (
          <div className="mt-6 grid gap-3 md:grid-cols-4">
            <Stat label="Total orders" value={stats.total} />
            {STATUSES.slice(0, 3).map((s) => (
              <Stat key={s} label={s} value={stats.byStatus?.[s] || 0} />
            ))}
          </div>
        )}

        <div className="mt-6 overflow-hidden rounded-xl border border-border/60" style={{ background: "var(--gradient-panel)" }}>
          <table className="w-full text-sm">
            <thead className="border-b border-border/60 text-left font-mono text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-3">#</th>
                <th className="px-4 py-3">Part</th>
                <th className="px-4 py-3">Material</th>
                <th className="px-4 py-3">Qty</th>
                <th className="px-4 py-3">Dimensions</th>
                <th className="px-4 py-3">Deadline</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">QA logs</th>
              </tr>
            </thead>
            <tbody>
              {orders.length === 0 && (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">No orders yet — head to the chat and create one.</td></tr>
              )}
              {orders.map((o) => (
                <tr key={o._id} className="border-b border-border/40 last:border-0 hover:bg-secondary/40">
                  <td className="px-4 py-3 font-mono text-primary">#{o.orderNumber}</td>
                  <td className="px-4 py-3">{o.partName}</td>
                  <td className="px-4 py-3 text-muted-foreground">{o.material || "—"}</td>
                  <td className="px-4 py-3">{o.quantity}</td>
                  <td className="px-4 py-3 text-muted-foreground">{o.dimensions || "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground">{o.deadline ? new Date(o.deadline).toLocaleDateString() : "—"}</td>
                  <td className="px-4 py-3">
                    <select
                      value={o.status}
                      onChange={(e) => updateStatus(o.orderNumber, e.target.value)}
                      className="rounded-md border border-input bg-background/60 px-2 py-1 text-xs"
                    >
                      {STATUSES.map((s) => <option key={s}>{s}</option>)}
                    </select>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{o.qualityLogs?.length || 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-border/60 p-4" style={{ background: "var(--gradient-panel)" }}>
      <p className="font-mono text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-1 text-3xl font-bold">{value}</p>
    </div>
  );
}
