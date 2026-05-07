const Joi = require('joi');

exports.createOrderSchema = Joi.object({
  partName: Joi.string().required(),
  material: Joi.string().allow('', null),
  quantity: Joi.number().integer().min(1).required(),
  dimensions: Joi.string().allow('', null),
  deadline: Joi.date().optional(),
  notes: Joi.string().allow('', null),
});

exports.updateStatusSchema = Joi.object({
  status: Joi.string().valid('Received', 'In Review', 'Accepted', 'Rejected', 'Completed').required(),
});

exports.qualitySchema = Joi.object({
  note: Joi.string().min(2).max(2000).required(),
});

exports.chatSchema = Joi.object({
  message: Joi.string().min(1).max(2000).required(),
});
