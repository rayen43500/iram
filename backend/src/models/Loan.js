const mongoose = require('mongoose');

const loanSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    creditType: { type: mongoose.Schema.Types.ObjectId, ref: 'CreditType', required: true },
    amount: { type: Number, required: true },
    durationMonths: { type: Number, required: true },
    annualRate: { type: Number, required: true },
    monthlyPayment: { type: Number, required: true },
    remainingInstallments: { type: Number, required: true },
    status: {
      type: String,
      enum: ['active', 'paid', 'late'],
      default: 'active',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Loan', loanSchema);
