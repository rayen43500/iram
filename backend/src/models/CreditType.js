const mongoose = require('mongoose');

const creditTypeSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true },
    slug: { type: String, required: true, unique: true },
    description: { type: String, required: true },
    minAmount: { type: Number, required: true },
    maxAmount: { type: Number, required: true },
    minDurationMonths: { type: Number, required: true },
    maxDurationMonths: { type: Number, required: true },
    annualRate: { type: Number, required: true },
    requiredDocuments: [{ type: String }],
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('CreditType', creditTypeSchema);
