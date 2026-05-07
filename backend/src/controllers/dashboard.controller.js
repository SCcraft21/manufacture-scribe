const asyncHandler = require('../utils/asyncHandler');
const Order = require('../models/Order');
const orderService = require('../services/order.service');

exports.stats = asyncHandler(async (_req, res) => {
  const [total, byStatusAgg, recent] = await Promise.all([
    Order.countDocuments(),
    Order.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
    Order.find().sort({ createdAt: -1 }).limit(5),
  ]);
  const byStatus = byStatusAgg.reduce((acc, x) => ({ ...acc, [x._id]: x.count }), {});
  res.json({ total, byStatus, recent });
});

exports.latestQuality = asyncHandler(async (req, res) => {
  res.json(await orderService.latestQuality(req.query.limit || 10));
});

exports.acceptedOrders = asyncHandler(async (req, res) => {
  res.json(await orderService.list({ ...req.query, status: 'Accepted' }));
});

exports.byMaterial = asyncHandler(async (req, res) => {
  res.json(await orderService.list({ ...req.query, material: req.params.material }));
});

exports.recentActivity = asyncHandler(async (_req, res) => {
  const orders = await Order.find().sort({ updatedAt: -1 }).limit(20).select('orderNumber partName status auditLogs updatedAt');
  res.json(orders);
});
