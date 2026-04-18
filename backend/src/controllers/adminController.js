const CreditType = require('../models/CreditType');
const CreditRequest = require('../models/CreditRequest');
const Loan = require('../models/Loan');
const User = require('../models/User');
const { fn, col } = require('sequelize');

async function listAllRequests(req, res) {
  const items = await CreditRequest.findAll({
    order: [['createdAt', 'DESC']],
    include: [
      { model: User, attributes: ['id', 'fullName', 'email'] },
      { model: CreditType, attributes: ['id', 'name', 'slug', 'annualRate'] },
    ],
  });
  return res.json(items);
}

async function updateRequestStatus(req, res) {
  const { status, adminComment = '' } = req.body;
  if (!['pending', 'accepted', 'rejected'].includes(status)) {
    return res.status(400).json({ message: 'Status invalide' });
  }

  const request = await CreditRequest.findByPk(req.params.id, { include: [{ model: CreditType }] });
  if (!request) {
    return res.status(404).json({ message: 'Demande introuvable' });
  }

  if (request.status === status && status === 'accepted') {
    const existingLoan = await Loan.findOne({
      where: {
      userId: request.userId,
      creditTypeId: request.creditTypeId,
      amount: request.requestedAmount,
      durationMonths: request.requestedDurationMonths,
      status: 'active',
      },
    });

    if (existingLoan) {
      return res.status(409).json({ message: 'Cette demande est deja acceptee et le credit est deja genere' });
    }
  }

  await request.update({ status, adminComment });

  if (status === 'accepted') {
    const existingLoan = await Loan.findOne({
      where: {
      userId: request.userId,
      creditTypeId: request.creditTypeId,
      amount: request.requestedAmount,
      durationMonths: request.requestedDurationMonths,
      status: 'active',
      },
    });

    if (!existingLoan) {
    await Loan.create({
      userId: request.userId,
      creditTypeId: request.creditTypeId,
      amount: request.requestedAmount,
      durationMonths: request.requestedDurationMonths,
      annualRate: request.CreditType.annualRate,
      monthlyPayment: request.estimatedMonthlyPayment,
      remainingInstallments: request.requestedDurationMonths,
      status: 'active',
    });
    }
  }

  return res.json(request);
}

async function createCreditType(req, res) {
  const created = await CreditType.create(req.body);
  return res.status(201).json(created);
}

async function analyticsSummary(req, res) {
  const [totalRequests, acceptedRequests, rejectedRequests, pendingRequests, amountStats] = await Promise.all([
    CreditRequest.count(),
    CreditRequest.count({ where: { status: 'accepted' } }),
    CreditRequest.count({ where: { status: 'rejected' } }),
    CreditRequest.count({ where: { status: 'pending' } }),
    CreditRequest.findOne({
      attributes: [
        [fn('COALESCE', fn('SUM', col('requestedAmount')), 0), 'totalRequested'],
        [fn('COALESCE', fn('AVG', col('requestedAmount')), 0), 'avgRequested'],
      ],
      raw: true,
    }),
  ]);

  const acceptanceRate = totalRequests > 0 ? acceptedRequests / totalRequests : 0;

  return res.json({
    totalRequests,
    acceptedRequests,
    rejectedRequests,
    pendingRequests,
    acceptanceRate: Number(acceptanceRate.toFixed(4)),
    totalRequested: Number(Number(amountStats?.totalRequested || 0).toFixed(2)),
    avgRequested: Number(Number(amountStats?.avgRequested || 0).toFixed(2)),
  });
}

async function updateCreditType(req, res) {
  const creditType = await CreditType.findByPk(req.params.id);
  if (!creditType) {
    return res.status(404).json({ message: 'Type de credit introuvable' });
  }

  const updated = await creditType.update(req.body);
  if (!updated) {
    return res.status(404).json({ message: 'Type de credit introuvable' });
  }
  return res.json(updated);
}

module.exports = {
  listAllRequests,
  updateRequestStatus,
  createCreditType,
  analyticsSummary,
  updateCreditType,
};
