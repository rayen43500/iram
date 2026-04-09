const env = require('../config/env');
const CreditType = require('../models/CreditType');
const Loan = require('../models/Loan');
const { buildEstimation } = require('../utils/estimate');

async function estimate(req, res) {
  const { creditTypeId, amount, durationMonths, salary } = req.body;
  if (!creditTypeId || !amount || !durationMonths || !salary) {
    return res.status(400).json({ message: 'creditTypeId, amount, durationMonths et salary sont requis' });
  }

  const normalizedAmount = Number(amount);
  const normalizedDuration = Number(durationMonths);
  const normalizedSalary = Number(salary);

  if (
    Number.isNaN(normalizedAmount) ||
    Number.isNaN(normalizedDuration) ||
    Number.isNaN(normalizedSalary) ||
    normalizedAmount <= 0 ||
    normalizedDuration <= 0 ||
    normalizedSalary <= 0
  ) {
    return res.status(400).json({ message: 'amount, durationMonths et salary doivent etre > 0' });
  }

  const creditType = await CreditType.findById(creditTypeId).lean();
  if (!creditType || !creditType.isActive) {
    return res.status(404).json({ message: 'Type de credit introuvable' });
  }

  if (
    normalizedAmount < creditType.minAmount ||
    normalizedAmount > creditType.maxAmount ||
    normalizedDuration < creditType.minDurationMonths ||
    normalizedDuration > creditType.maxDurationMonths
  ) {
    return res.status(400).json({
      message: 'Montant ou duree hors limites du type de credit selectionne',
    });
  }

  const currentLoans = await Loan.find({ user: req.user._id, status: 'active' }).lean();
  const existingMonthlyDebt = currentLoans.reduce((sum, loan) => sum + loan.monthlyPayment, 0);

  const result = buildEstimation({
    amount: normalizedAmount,
    annualRate: creditType.annualRate,
    durationMonths: normalizedDuration,
    salary: normalizedSalary,
    existingMonthlyDebt,
    maxDebtRatio: env.scoringMaxDebtRatio,
  });

  return res.json({
    creditType: { id: creditType._id, name: creditType.name, annualRate: creditType.annualRate },
    input: { amount: normalizedAmount, durationMonths: normalizedDuration, salary: normalizedSalary, existingMonthlyDebt },
    estimation: result,
  });
}

module.exports = {
  estimate,
};
