const Order = require('../models/Order');
const ApiError = require('../utils/ApiError');

function emit(req, event, payload) {
  const io = req.app.get('io');
  if (io) io.emit(event, payload);
}

exports.create = async (req, data) => {
  const order = await Order.create({ ...data, createdBy: req.user?.id });
  order.auditLogs.push({ action: 'created', by: req.user?.id, meta: data });
  await order.save();
  emit(req, 'order:created', order);
  return order;
};

exports.findByNumber = async (orderNumber) => {
  const order = await Order.findOne({ orderNumber });
  if (!order) throw new ApiError(404, `Order #${orderNumber} not found`);
  return order;
};

exports.updateStatus = async (req, orderNumber, status) => {
  const order = await exports.findByNumber(orderNumber);
  const prev = order.status;
  order.status = status;
  order.auditLogs.push({ action: 'status_change', by: req.user?.id, meta: { from: prev, to: status } });
  await order.save();
  emit(req, 'order:updated', order);
  return order;
};

exports.addQualityLog = async (req, orderNumber, note) => {
  const order = await exports.findByNumber(orderNumber);
  order.qualityLogs.push({ note, author: req.user?.id });
  order.auditLogs.push({ action: 'quality_log', by: req.user?.id, meta: { note } });
  await order.save();
  emit(req, 'order:quality', order);
  return order;
};

exports.list = async (q = {}) => {
  const { status, material, search, page = 1, limit = 20, sort = '-createdAt' } = q;
  const filter = {};
  if (status) filter.status = status;
  if (material) filter.material = new RegExp(`^${material}$`, 'i');
  if (search) filter.$or = [
    { partName: new RegExp(search, 'i') },
    { material: new RegExp(search, 'i') },
    { notes: new RegExp(search, 'i') },
  ];
  const skip = (Number(page) - 1) * Number(limit);
  const [items, total] = await Promise.all([
    Order.find(filter).sort(sort).skip(skip).limit(Number(limit)),
    Order.countDocuments(filter),
  ]);
  return { items, total, page: Number(page), limit: Number(limit) };
};

exports.latestQuality = async (limit = 10) => {
  const orders = await Order.find({ 'qualityLogs.0': { $exists: true } })
    .sort({ 'qualityLogs.createdAt': -1 })
    .limit(Number(limit));
  return orders.map((o) => ({
    orderNumber: o.orderNumber,
    partName: o.partName,
    latestLog: o.qualityLogs[o.qualityLogs.length - 1],
  }));
};
