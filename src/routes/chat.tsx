import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { TopNav } from "@/components/TopNav";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/chat")({ component: ChatPage });

type Msg = { role: "user" | "assistant"; content: string; data?: any };

function ChatPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([
    {
      role: "assistant",
      content:
        "Hi — I'm NOVA. Try:\n• \"I need 200 titanium flanges, 80mm bore, by July 20\"\n• \"Mark order #1001 as accepted\"\n• \"Quality update on order #1001 — passed visual inspection\"\n• \"Show me all accepted orders\"",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) router.navigate({ to: "/login" });
      else setReady(true);
    });
  }, [router]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || loading) return;
    setInput("");
    setMessages((m) => [...m, { role: "user", content: text }]);
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("nova-chat", {
        body: { message: text },
      });
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);
      setMessages((m) => [...m, { role: "assistant", content: data.reply || "OK", data }]);
    } catch (err: any) {
      setMessages((m) => [...m, { role: "assistant", content: `⚠️ ${err.message}` }]);
    } finally {
      setLoading(false);
    }
  };

  if (!ready) return null;

  return (
    <div className="flex min-h-screen flex-col">
      <TopNav />
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 py-6">
        <div className="flex-1 space-y-4 overflow-y-auto rounded-xl border border-border/60 p-4" style={{ background: "var(--gradient-panel)" }}>
          {messages.map((m, i) => (
            <Bubble key={i} msg={m} />
          ))}
          {loading && <div className="text-xs text-muted-foreground">NOVA is thinking…</div>}
          <div ref={endRef} />
        </div>

        <form onSubmit={send} className="mt-4 flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Describe an order, update a status, or log a quality note…"
            className="flex-1 rounded-md border border-input bg-background/60 px-4 py-3 outline-none focus:border-primary focus:ring-2 focus:ring-ring/40"
          />
          <button
            disabled={loading}
            className="rounded-md bg-primary px-5 font-semibold text-primary-foreground shadow-[var(--shadow-glow)] hover:opacity-90 disabled:opacity-60"
          >
            Send
          </button>
        </form>
      </main>
    </div>
  );
}

function Bubble({ msg }: { msg: Msg }) {
  const mine = msg.role === "user";
  return (
    <div className={`flex ${mine ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-3 text-sm leading-relaxed ${
          mine
            ? "bg-primary text-primary-foreground"
            : "border border-border/60 bg-card/80 text-foreground"
        }`}
      >
        {msg.content}
        {msg.data?.order && (
          <pre className="mt-3 max-h-48 overflow-auto rounded-md bg-background/60 p-2 font-mono text-[11px] text-muted-foreground">
{JSON.stringify(
  {
    order_number: msg.data.order.order_number,
    part_name: msg.data.order.part_name,
    material: msg.data.order.material,
    quantity: msg.data.order.quantity,
    dimensions: msg.data.order.dimensions,
    deadline: msg.data.order.deadline,
    status: msg.data.order.status,
  },
  null,
  2
)}
          </pre>
        )}
        {Array.isArray(msg.data?.orders) && msg.data.orders.length > 0 && (
          <ul className="mt-3 space-y-1 text-xs">
            {msg.data.orders.map((o: any) => (
              <li key={o.id} className="font-mono">
                #{o.order_number} · {o.quantity}× {o.part_name} · {o.status}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
