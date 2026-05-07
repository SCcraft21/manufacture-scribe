/**
 * NLP service — two modes:
 *   MODE 1 (default): regex/rule-based extraction (no AI cost)
 *   MODE 2: OpenAI structured extraction (USE_OPENAI=true)
 *
 * Public API:
 *   detectIntent(message) -> { intent, ...fields }
 *     intents: 'create_order' | 'update_status' | 'quality_log' | 'query' | 'unknown'
 */

const USE_OPENAI = String(process.env.USE_OPENAI).toLowerCase() === 'true';

let openaiClient = null;
function getOpenAI() {
  if (openaiClient) return openaiClient;
  if (!process.env.OPENAI_API_KEY) return null;
  // Lazy-load so the dep isn't required when USE_OPENAI=false
  const OpenAI = require('openai').default || require('openai');
  openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return openaiClient;
}

/* ---------- Regex / rules ---------- */

const STATUS_MAP = {
  received: 'Received',
  'in review': 'In Review',
  reviewing: 'In Review',
  review: 'In Review',
  accepted: 'Accepted',
  accept: 'Accepted',
  approved: 'Accepted',
  rejected: 'Rejected',
  reject: 'Rejected',
  completed: 'Completed',
  complete: 'Completed',
  done: 'Completed',
};

function findOrderId(text) {
  const m = text.match(/(?:order|#)\s*#?\s*(\d+)/i);
  return m ? Number(m[1]) : null;
}

function findStatus(text) {
  const lower = text.toLowerCase();
  for (const key of Object.keys(STATUS_MAP).sort((a, b) => b.length - a.length)) {
    if (lower.includes(key)) return STATUS_MAP[key];
  }
  return null;
}

function ruleBasedExtract(message) {
  const text = message.trim();
  const lower = text.toLowerCase();

  // Quality log intent
  if (/(quality|inspection|defect|passed|failed|tolerance)/i.test(text) && /order|#|\d/.test(text)) {
    return {
      intent: 'quality_log',
      orderNumber: findOrderId(text),
      note: text,
    };
  }

  // Status update intent
  if (/(mark|set|update|change|now)/i.test(lower) && findStatus(text) && findOrderId(text)) {
    return {
      intent: 'update_status',
      orderNumber: findOrderId(text),
      status: findStatus(text),
    };
  }

  // Generic query
  if (/^(show|list|find|get|search|what)/i.test(lower)) {
    return { intent: 'query', text };
  }

  // Create order: look for quantity + part keywords
  const qtyMatch = text.match(/(\d{1,6})\s*(units?|pcs?|pieces?|x)?\s*(?:of\s+)?([a-z][a-z\s\-]*?)(?:,|\.|with|by|for|delivered|deadline|$)/i);
  // Material keywords
  const materialMatch = text.match(/\b(titanium|aluminum|aluminium|steel|stainless|brass|copper|plastic|abs|carbon|nylon)\b/i);
  // Dimensions like "80mm bore", "10x20 mm", "M8"
  const dimMatch = text.match(/(\d+(?:\.\d+)?\s*(?:mm|cm|m|inch|in|")\s*(?:bore|diameter|dia|width|length|height|thickness)?(?:\s*x\s*\d+(?:\.\d+)?\s*(?:mm|cm|m|inch|in|")?)?)/i);
  // Deadline: "by July 20", "deadline 2024-08-01", "in 5 days"
  let deadline = null;
  const byDate = text.match(/by\s+([A-Za-z]+\s+\d{1,2}(?:,?\s*\d{4})?|\d{4}-\d{2}-\d{2})/i);
  if (byDate) {
    const d = new Date(byDate[1]);
    if (!isNaN(d)) deadline = d.toISOString();
  }
  const inDays = text.match(/in\s+(\d+)\s+days?/i);
  if (!deadline && inDays) {
    const d = new Date();
    d.setDate(d.getDate() + Number(inDays[1]));
    deadline = d.toISOString();
  }

  if (qtyMatch) {
    const quantity = Number(qtyMatch[1]);
    let partName = qtyMatch[3].trim();
    // Strip leading material word from partName
    if (materialMatch) {
      partName = partName.replace(new RegExp(`^${materialMatch[1]}\\s+`, 'i'), '').trim();
    }
    return {
      intent: 'create_order',
      partName: partName || 'unspecified part',
      material: materialMatch ? materialMatch[1] : null,
      quantity,
      dimensions: dimMatch ? dimMatch[1] : null,
      deadline,
    };
  }

  return { intent: 'unknown', text };
}

/* ---------- OpenAI structured extraction ---------- */

const SYSTEM_PROMPT = `You convert manufacturing chat messages into a strict JSON object.
Return ONLY JSON, no prose. Schema:
{
 "intent": "create_order" | "update_status" | "quality_log" | "query" | "unknown",
 "orderNumber": number | null,
 "partName": string | null,
 "material": string | null,
 "quantity": number | null,
 "dimensions": string | null,
 "deadline": string | null,           // ISO date or null
 "status": "Received"|"In Review"|"Accepted"|"Rejected"|"Completed" | null,
 "note": string | null
}`;

async function openaiExtract(message) {
  const client = getOpenAI();
  if (!client) return ruleBasedExtract(message);
  try {
    const resp = await client.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      temperature: 0,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: message },
      ],
    });
    const content = resp.choices?.[0]?.message?.content || '{}';
    return JSON.parse(content);
  } catch (e) {
    // Fall back to rules on any failure (rate limit, parse error, etc.)
    return ruleBasedExtract(message);
  }
}

exports.detectIntent = async (message) => {
  if (USE_OPENAI) return openaiExtract(message);
  return ruleBasedExtract(message);
};

exports.summarizeOrder = async (order) => {
  if (!USE_OPENAI) {
    return `Order #${order.orderNumber}: ${order.quantity} × ${order.partName}` +
      (order.material ? ` (${order.material})` : '') +
      ` — status: ${order.status}.`;
  }
  const client = getOpenAI();
  if (!client) return `Order #${order.orderNumber} (${order.status})`;
  const resp = await client.chat.completions.create({
    model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
    temperature: 0.2,
    messages: [
      { role: 'system', content: 'Summarize this manufacturing order in one short sentence.' },
      { role: 'user', content: JSON.stringify(order) },
    ],
  });
  return resp.choices?.[0]?.message?.content?.trim() || '';
};
