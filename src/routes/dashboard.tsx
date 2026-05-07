import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { TopNav } from "@/components/TopNav";
import { supabase } from "@/integrations/supabase/client";
import { STATUSES, type OrderRow, type Role, getRoles, highestRole } from "@/lib/nova";

export const Route = createFileRoute("/dashboard")({ component: DashboardPage });

function DashboardPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [role, setRole] = useState<Role>("user");
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [qaCounts, setQaCounts] = useState<Record<string, number>>({});
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) {
        router.navigate({ to: "/login" });
        return;
      }
      const roles = await getRoles(data.session.user.id);
      setRole(highestRole(roles));
      setReady(true);
    });
  }, [router]);

  const load = useCallback(async () => {
    setError("");
    let q = supabase.from("orders").select("*").order("created_at", { ascending: false });
    if (statusFilter) q = q.eq("status", statusFilter as OrderRow["status"]);
    if (search) q = q.or(`part_name.ilike.%${search}%,material.ilike.%${search}%,notes.ilike.%${search}%`);
    const { data, error } = await q;
    if (error) return setError(error.message);
    setOrders((data ?? []) as OrderRow[]);

    const ids = (data ?? []).map((o) => o.id);
    if (ids.length) {
      const { data: qa } = await supabase.from("quality_logs").select("order_id").in("order_id", ids);
      const counts: Record<string, number> = {};
      (qa ?? []).forEach((r) => { counts[r.order_id] = (counts[r.order_id] || 0) + 1; });
      setQaCounts(counts);
    } else {
      setQaCounts({});
    }
  }, [statusFilter, search]);

  useEffect(() => {
    if (ready) void load();
  }, [ready, statusFilter, load]);

  // Realtime
  useEffect(() => {
    if (!ready) return;
    const ch = supabase
      .channel("orders-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => void load())
      .on("postgres_changes", { event: "*", schema: "public", table: "quality_logs" }, () => void load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [ready, load]);

  const updateStatus = async (id: string, status: OrderRow["status"]) => {
    const { error } = await supabase.from("orders").update({ status }).eq("id", id);
    if (error) setError(error.message);
    else void load();
  };

  if (!ready) return null;

  const stats = {
    total: orders.length,
    byStatus: STATUSES.reduce<Record<string, number>>((acc, s) => {
      acc[s] = orders.filter((o) => o.status === s).length;
      return acc;
    }, {}),
  };

  const canEdit = role === "ops" || role === "admin";

  return (
    <div className="min-h-screen">
      <TopNav />
      <main className="mx-auto max-w-6xl px-6 py-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Dashboard</h1>
            <p className="text-sm text-muted-foreground">
              Live view of all manufacturing orders.{!canEdit && " (read-only — ops/admin can edit)"}
            </p>
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

        <div className="mt-6 grid gap-3 md:grid-cols-4">
          <Stat label="Total orders" value={stats.total} />
          {(["Received", "In Review", "Accepted"] as const).map((s) => (
            <Stat key={s} label={s} value={stats.byStatus[s] || 0} />
          ))}
        </div>

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
                <tr key={o.id} className="border-b border-border/40 last:border-0 hover:bg-secondary/40">
                  <td className="px-4 py-3 font-mono text-primary">#{o.order_number}</td>
                  <td className="px-4 py-3">{o.part_name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{o.material || "—"}</td>
                  <td className="px-4 py-3">{o.quantity}</td>
                  <td className="px-4 py-3 text-muted-foreground">{o.dimensions || "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground">{o.deadline ? new Date(o.deadline).toLocaleDateString() : "—"}</td>
                  <td className="px-4 py-3">
                    {canEdit ? (
                      <select
                        value={o.status}
                        onChange={(e) => updateStatus(o.id, e.target.value as OrderRow["status"])}
                        className="rounded-md border border-input bg-background/60 px-2 py-1 text-xs"
                      >
                        {STATUSES.map((s) => <option key={s}>{s}</option>)}
                      </select>
                    ) : (
                      <span className="text-xs">{o.status}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{qaCounts[o.id] || 0}</td>
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
