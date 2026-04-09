const mongoose = require('mongoose');

const creditRequestSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    creditType: { type: mongoose.Schema.Types.ObjectId, ref: 'CreditType', required: true },
    requestedAmount: { type: Number, required: true },
    requestedDurationMonths: { type: Number, required: true },
    salaryAtRequest: { type: Number, required: true },
    estimatedMonthlyPayment: { type: Number, required: true },
    estimatedTotalCost: { type: Number, required: true },
    debtRatio: { type: Number, required: true },
    acceptanceProbability: { type: Number, required: true },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'rejected'],
      default: 'pending',
    },
    adminComment: { type: String, default: '' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('CreditRequest', creditRequestSchema);
