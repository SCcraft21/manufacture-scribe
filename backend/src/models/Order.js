const mongoose = require('mongoose');

const qualityLogSchema = new mongoose.Schema(
  {
    note: { type: String, required: true },
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

const auditSchema = new mongoose.Schema(
  {
    action: String,
    by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    meta: mongoose.Schema.Types.Mixed,
    at: { type: Date, default: Date.now },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    orderNumber: { type: Number, unique: true, index: true },
    partName: { type: String, required: true },
    material: { type: String },
    quantity: { type: Number, required: true, min: 1 },
    dimensions: { type: String },
    deadline: { type: Date },
    notes: { type: String },
    status: {
      type: String,
      enum: ['Received', 'In Review', 'Accepted', 'Rejected', 'Completed'],
      default: 'Received',
      index: true,
    },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    qualityLogs: [qualityLogSchema],
    auditLogs: [auditSchema],
  },
  { timestamps: true }
);

// Auto-increment orderNumber
orderSchema.pre('save', async function (next) {
  if (this.isNew && !this.orderNumber) {
    const last = await this.constructor.findOne({}, { orderNumber: 1 }).sort({ orderNumber: -1 }).lean();
    this.orderNumber = (last?.orderNumber || 0) + 1;
  }
  next();
});

module.exports = mongoose.model('Order', orderSchema);
