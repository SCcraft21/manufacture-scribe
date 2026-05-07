const asyncHandler = require('../utils/asyncHandler');
const orderService = require('../services/order.service');
const { summarizeOrder } = require('../services/nlp.service');

exports.create = asyncHandler(async (req, res) => {
  const order = await orderService.create(req, req.body);
  res.status(201).json(order);
});

exports.list = asyncHandler(async (req, res) => {
  const result = await orderService.list(req.query);
  res.json(result);
});

exports.getOne = asyncHandler(async (req, res) => {
  const order = await orderService.findByNumber(Number(req.params.orderNumber));
  res.json(order);
});

exports.updateStatus = asyncHandler(async (req, res) => {
  const order = await orderService.updateStatus(req, Number(req.params.orderNumber), req.body.status);
  res.json(order);
});

exports.addQuality = asyncHandler(async (req, res) => {
  const order = await orderService.addQualityLog(req, Number(req.params.orderNumber), req.body.note);
  res.json(order);
});

exports.summary = asyncHandler(async (req, res) => {
  const order = await orderService.findByNumber(Number(req.params.orderNumber));
  const summary = await summarizeOrder(order.toObject());
  res.json({ orderNumber: order.orderNumber, summary });
});
