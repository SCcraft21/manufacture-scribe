// NOVA NEXUS chat edge function
// Uses Lovable AI Gateway with tool-calling to extract intents from natural language,
// then performs the matching DB action via the user's Supabase session (RLS enforced).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `You are NOVA NEXUS, an AI assistant for a manufacturing order system.
Read the user message and call EXACTLY ONE tool that matches their intent:
- create_order: when they describe a new manufacturing order (part, qty, material, dimensions, deadline)
- update_status: when they reference an order number and a new status
- log_quality: when they want to add a quality / inspection note to an order
- list_orders: when they want to view orders or stats
- smalltalk: greetings, help, anything else
Always extract structured fields. Dates → ISO 8601. Status must be one of: Received, In Review, Accepted, Rejected, Completed.`;

const tools = [
  {
    type: "function",
    function: {
      name: "create_order",
      description: "Create a new manufacturing order",
      parameters: {
        type: "object",
        properties: {
          part_name: { type: "string" },
          material: { type: "string" },
          quantity: { type: "number" },
          dimensions: { type: "string" },
          deadline: { type: "string", description: "ISO date" },
          notes: { type: "string" },
        },
        required: ["part_name", "quantity"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "update_status",
      description: "Change the status of an existing order by order number",
      parameters: {
        type: "object",
        properties: {
          order_number: { type: "number" },
          status: {
            type: "string",
            enum: ["Received", "In Review", "Accepted", "Rejected", "Completed"],
          },
        },
        required: ["order_number", "status"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "log_quality",
      description: "Append a quality inspection note to an order",
      parameters: {
        type: "object",
        properties: {
          order_number: { type: "number" },
          note: { type: "string" },
        },
        required: ["order_number", "note"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_orders",
      description: "List or filter orders",
      parameters: {
        type: "object",
        properties: {
          status: { type: "string" },
          material: { type: "string" },
          limit: { type: "number" },
        },
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "smalltalk",
      description: "Reply conversationally without DB action",
      parameters: {
        type: "object",
        properties: { reply: { type: "string" } },
        required: ["reply"],
        additionalProperties: false,
      },
    },
  },
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace("Bearer ", "");
    if (!token) return json({ error: "Missing auth" }, 401);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: `Bearer ${token}` } } }
    );

    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return json({ error: "Invalid session" }, 401);

    const { message } = await req.json();
    if (!message) return json({ error: "message required" }, 400);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) return json({ error: "AI not configured" }, 500);

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: message },
        ],
        tools,
        tool_choice: "required",
      }),
    });

    if (aiRes.status === 429)
      return json({ error: "Rate limit exceeded, please retry later." }, 429);
    if (aiRes.status === 402)
      return json({ error: "AI credits exhausted. Add funds to your Lovable workspace." }, 402);
    if (!aiRes.ok) {
      const t = await aiRes.text();
      console.error("AI error", aiRes.status, t);
      return json({ error: "AI gateway error" }, 500);
    }

    const ai = await aiRes.json();
    const call = ai.choices?.[0]?.message?.tool_calls?.[0];
    if (!call) return json({ intent: "smalltalk", reply: ai.choices?.[0]?.message?.content || "OK" });

    const name = call.function?.name;
    const args = JSON.parse(call.function?.arguments || "{}");

    switch (name) {
      case "create_order": {
        const { data, error } = await supabase
          .from("orders")
          .insert({
            part_name: args.part_name,
            material: args.material ?? null,
            quantity: args.quantity,
            dimensions: args.dimensions ?? null,
            deadline: args.deadline ?? null,
            notes: args.notes ?? null,
            created_by: userData.user.id,
          })
          .select()
          .single();
        if (error) return json({ error: error.message }, 400);
        await supabase.from("audit_logs").insert({
          order_id: data.id,
          action: "created",
          by_user: userData.user.id,
          meta: args,
        });
        return json({
          intent: "create_order",
          order: data,
          reply: `Order #${data.order_number} created: ${data.quantity} × ${data.part_name}.`,
        });
      }

      case "update_status": {
        const { data, error } = await supabase
          .from("orders")
          .update({ status: args.status })
          .eq("order_number", args.order_number)
          .select()
          .single();
        if (error) return json({ error: error.message }, 400);
        await supabase.from("audit_logs").insert({
          order_id: data.id,
          action: "status_change",
          by_user: userData.user.id,
          meta: { status: args.status },
        });
        return json({
          intent: "update_status",
          order: data,
          reply: `Order #${data.order_number} → ${data.status}.`,
        });
      }

      case "log_quality": {
        const { data: order, error: oerr } = await supabase
          .from("orders")
          .select("id, order_number")
          .eq("order_number", args.order_number)
          .single();
        if (oerr) return json({ error: oerr.message }, 400);
        const { data, error } = await supabase
          .from("quality_logs")
          .insert({ order_id: order.id, note: args.note, author: userData.user.id })
          .select()
          .single();
        if (error) return json({ error: error.message }, 400);
        return json({
          intent: "log_quality",
          log: data,
          reply: `Quality note added to order #${order.order_number}.`,
        });
      }

      case "list_orders": {
        let q = supabase.from("orders").select("*").order("created_at", { ascending: false });
        if (args.status) q = q.eq("status", args.status);
        if (args.material) q = q.ilike("material", args.material);
        q = q.limit(Math.min(args.limit ?? 10, 50));
        const { data, error } = await q;
        if (error) return json({ error: error.message }, 400);
        return json({
          intent: "list_orders",
          orders: data,
          reply: `Found ${data.length} order(s).`,
        });
      }

      default:
        return json({ intent: "smalltalk", reply: args.reply || "How can I help?" });
    }
  } catch (e) {
    console.error("nova-chat error", e);
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
