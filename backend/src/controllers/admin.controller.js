const asyncHandler = require('../utils/asyncHandler');
const User = require('../models/User');
const Order = require('../models/Order');

exports.analytics = asyncHandler(async (_req, res) => {
  const [users, orders, byStatus, byMaterial] = await Promise.all([
    User.countDocuments(),
    Order.countDocuments(),
    Order.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
    Order.aggregate([
      { $match: { material: { $ne: null } } },
      { $group: { _id: '$material', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]),
  ]);
  res.json({ users, orders, byStatus, topMaterials: byMaterial });
});

exports.listUsers = asyncHandler(async (_req, res) => {
  res.json(await User.find().sort({ createdAt: -1 }));
});
