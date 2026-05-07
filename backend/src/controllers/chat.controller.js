const asyncHandler = require('../utils/asyncHandler');
const { detectIntent } = require('../services/nlp.service');
const orderService = require('../services/order.service');

/**
 * Single chat endpoint. Routes user's natural language to the right action.
 * Stateless — no chat history is persisted, keeping AI tokens minimal.
 */
exports.handle = asyncHandler(async (req, res) => {
  const { message } = req.body;
  const parsed = await detectIntent(message);

  switch (parsed.intent) {
    case 'create_order': {
      if (!parsed.quantity || !parsed.partName) {
        return res.json({
          reply: "I couldn't detect a part name and quantity. Try: 'I need 200 titanium flanges, 80mm bore, by July 20'.",
          parsed,
        });
      }
      const order = await orderService.create(req, {
        partName: parsed.partName,
        material: parsed.material || undefined,
        quantity: parsed.quantity,
        dimensions: parsed.dimensions || undefined,
        deadline: parsed.deadline || undefined,
        notes: message,
      });
      return res.json({
        reply: `Created order #${order.orderNumber}: ${order.quantity} × ${order.partName}.`,
        order,
        parsed,
      });
    }
    case 'update_status': {
      if (!parsed.orderNumber || !parsed.status) {
        return res.json({ reply: "Tell me the order number and the new status, e.g. 'Mark order #3 as accepted'.", parsed });
      }
      const order = await orderService.updateStatus(req, parsed.orderNumber, parsed.status);
      return res.json({ reply: `Order #${order.orderNumber} is now ${order.status}.`, order, parsed });
    }
    case 'quality_log': {
      if (!parsed.orderNumber) {
        return res.json({ reply: "Which order is this quality note for? Mention #order_id.", parsed });
      }
      const order = await orderService.addQualityLog(req, parsed.orderNumber, parsed.note || message);
      return res.json({ reply: `Quality note added to order #${order.orderNumber}.`, order, parsed });
    }
    case 'query': {
      const { items } = await orderService.list({ search: message.replace(/^(show|list|find|get|search|what)\s+/i, ''), limit: 5 });
      return res.json({ reply: `Found ${items.length} matching order(s).`, items, parsed });
    }
    default:
      return res.json({
        reply: "I didn't understand. Try creating an order, updating a status, or logging a quality note.",
        parsed,
      });
  }
});
