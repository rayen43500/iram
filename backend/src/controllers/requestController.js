const CreditType = require('../models/CreditType');
const CreditRequest = require('../models/CreditRequest');
const Loan = require('../models/Loan');
const env = require('../config/env');
const { buildEstimation } = require('../utils/estimate');

async function createRequest(req, res) {
  const { creditTypeId, requestedAmount, requestedDurationMonths } = req.body;
  if (!creditTypeId || !requestedAmount || !requestedDurationMonths) {
    return res.status(400).json({ message: 'creditTypeId, requestedAmount et requestedDurationMonths sont requis' });
  }

  const normalizedAmount = Number(requestedAmount);
  const normalizedDuration = Number(requestedDurationMonths);

  if (
    Number.isNaN(normalizedAmount) ||
    Number.isNaN(normalizedDuration) ||
    normalizedAmount <= 0 ||
    normalizedDuration <= 0
  ) {
    return res.status(400).json({ message: 'requestedAmount et requestedDurationMonths doivent etre > 0' });
  }

  const creditType = await CreditType.findByPk(creditTypeId);
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

  const pendingRequest = await CreditRequest.findOne({
    where: {
      userId: req.user.id,
      creditTypeId: creditType.id,
      status: 'pending',
    },
  });

  if (pendingRequest) {
    return res.status(409).json({ message: 'Une demande en attente existe deja pour ce type de credit' });
  }

  const currentLoans = await Loan.findAll({ where: { userId: req.user.id, status: 'active' } });
  const existingMonthlyDebt = currentLoans.reduce((sum, loan) => sum + loan.monthlyPayment, 0);

  const estimation = buildEstimation({
    amount: normalizedAmount,
    annualRate: creditType.annualRate,
    durationMonths: normalizedDuration,
    salary: Number(req.user.salary || 0),
    existingMonthlyDebt,
    maxDebtRatio: env.scoringMaxDebtRatio,
  });

  const created = await CreditRequest.create({
    userId: req.user.id,
    creditTypeId: creditType.id,
    requestedAmount: normalizedAmount,
    requestedDurationMonths: normalizedDuration,
    salaryAtRequest: Number(req.user.salary || 0),
    estimatedMonthlyPayment: estimation.monthlyPayment,
    estimatedTotalCost: estimation.totalCost,
    debtRatio: estimation.debtRatio,
    acceptanceProbability: estimation.acceptanceProbability,
    status: 'pending',
  });

  return res.status(201).json(created);
}

async function listMyRequests(req, res) {
  const items = await CreditRequest.findAll({
    where: { userId: req.user.id },
    order: [['createdAt', 'DESC']],
    include: [{ model: CreditType, attributes: ['id', 'name', 'slug'] }],
  });
  return res.json(items);
}

module.exports = {
  createRequest,
  listMyRequests,
};
