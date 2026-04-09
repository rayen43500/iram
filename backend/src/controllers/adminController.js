const CreditType = require('../models/CreditType');
const CreditRequest = require('../models/CreditRequest');
const Loan = require('../models/Loan');

async function listAllRequests(req, res) {
  const items = await CreditRequest.find().sort({ createdAt: -1 }).populate('user', 'fullName email').populate('creditType', 'name slug annualRate').lean();
  return res.json(items);
}

async function updateRequestStatus(req, res) {
  const { status, adminComment = '' } = req.body;
  if (!['pending', 'accepted', 'rejected'].includes(status)) {
    return res.status(400).json({ message: 'Status invalide' });
  }

  const request = await CreditRequest.findById(req.params.id).populate('creditType').lean();
  if (!request) {
    return res.status(404).json({ message: 'Demande introuvable' });
  }

  if (request.status === status && status === 'accepted') {
    const existingLoan = await Loan.findOne({
      user: request.user,
      creditType: request.creditType._id,
      amount: request.requestedAmount,
      durationMonths: request.requestedDurationMonths,
      status: 'active',
    }).lean();

    if (existingLoan) {
      return res.status(409).json({ message: 'Cette demande est deja acceptee et le credit est deja genere' });
    }
  }

  const updated = await CreditRequest.findByIdAndUpdate(
    req.params.id,
    { status, adminComment },
    { new: true }
  );

  if (status === 'accepted') {
    const existingLoan = await Loan.findOne({
      user: request.user,
      creditType: request.creditType._id,
      amount: request.requestedAmount,
      durationMonths: request.requestedDurationMonths,
      status: 'active',
    }).lean();

    if (!existingLoan) {
    await Loan.create({
      user: request.user,
      creditType: request.creditType._id,
      amount: request.requestedAmount,
      durationMonths: request.requestedDurationMonths,
      annualRate: request.creditType.annualRate,
      monthlyPayment: request.estimatedMonthlyPayment,
      remainingInstallments: request.requestedDurationMonths,
      status: 'active',
    });
    }
  }

  return res.json(updated);
}

async function createCreditType(req, res) {
  const created = await CreditType.create(req.body);
  return res.status(201).json(created);
}

async function analyticsSummary(req, res) {
  const [totalRequests, acceptedRequests, rejectedRequests, pendingRequests, amountStats] = await Promise.all([
    CreditRequest.countDocuments(),
    CreditRequest.countDocuments({ status: 'accepted' }),
    CreditRequest.countDocuments({ status: 'rejected' }),
    CreditRequest.countDocuments({ status: 'pending' }),
    CreditRequest.aggregate([
      {
        $group: {
          _id: null,
          totalRequested: { $sum: '$requestedAmount' },
          avgRequested: { $avg: '$requestedAmount' },
        },
      },
    ]),
  ]);

  const acceptanceRate = totalRequests > 0 ? acceptedRequests / totalRequests : 0;

  return res.json({
    totalRequests,
    acceptedRequests,
    rejectedRequests,
    pendingRequests,
    acceptanceRate: Number(acceptanceRate.toFixed(4)),
    totalRequested: Number((amountStats[0]?.totalRequested || 0).toFixed(2)),
    avgRequested: Number((amountStats[0]?.avgRequested || 0).toFixed(2)),
  });
}

async function updateCreditType(req, res) {
  const updated = await CreditType.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
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
