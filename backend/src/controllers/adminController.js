const CreditType = require('../models/CreditType');
const CreditRequest = require('../models/CreditRequest');
const Loan = require('../models/Loan');
const User = require('../models/User');
const { fn, col, Op } = require('sequelize');
const { createUserNotification } = require('../utils/notificationService');

async function listAllRequests(req, res) {
  const { status, q, from, to } = req.query;
  const where = {};
  if (status && ['pending', 'accepted', 'rejected'].includes(status)) {
    where.status = status;
  }
  if (from || to) {
    where.createdAt = {};
    if (from) where.createdAt[Op.gte] = new Date(from);
    if (to) where.createdAt[Op.lte] = new Date(to);
  }

  const items = await CreditRequest.findAll({
    where,
    order: [['createdAt', 'DESC']],
    include: [
      { model: User, attributes: ['id', 'fullName', 'email'], where: q ? { [Op.or]: [{ fullName: { [Op.like]: `%${q}%` } }, { email: { [Op.like]: `%${q}%` } }] } : undefined, required: Boolean(q) },
      { model: CreditType, attributes: ['id', 'name', 'slug', 'annualRate'] },
    ],
  });
  return res.json(items);
}

async function listUsers(req, res) {
  const { q, role } = req.query;
  const where = {};
  if (role && ['client', 'admin'].includes(role)) {
    where.role = role;
  }
  if (q) {
    where[Op.or] = [
      { fullName: { [Op.like]: `%${q}%` } },
      { email: { [Op.like]: `%${q}%` } },
      { accountNumber: { [Op.like]: `%${q}%` } },
      { cin: { [Op.like]: `%${q}%` } },
    ];
  }

  const items = await User.findAll({
    where,
    order: [['createdAt', 'DESC']],
    attributes: [
      'id',
      'accountNumber',
      'cin',
      'firstName',
      'lastName',
      'fullName',
      'email',
      'role',
      'salary',
      'balance',
      'emailVerified',
      'lastLoginAt',
      'createdAt',
    ],
  });
  return res.json(items);
}

async function updateUserRole(req, res) {
  const { role } = req.body;
  if (!['client', 'admin'].includes(role)) {
    return res.status(400).json({ message: 'Role invalide' });
  }

  const user = await User.findByPk(req.params.id);
  if (!user) {
    return res.status(404).json({ message: 'Utilisateur introuvable' });
  }
  if (Number(user.id) === Number(req.user.id) && role !== 'admin') {
    return res.status(400).json({ message: 'Vous ne pouvez pas retirer votre propre role admin' });
  }

  await user.update({ role });
  return res.json({
    id: user.id,
    accountNumber: user.accountNumber,
    cin: user.cin,
    firstName: user.firstName,
    lastName: user.lastName,
    fullName: user.fullName,
    email: user.email,
    role: user.role,
    salary: user.salary,
    balance: user.balance,
    emailVerified: user.emailVerified,
    lastLoginAt: user.lastLoginAt,
    createdAt: user.createdAt,
  });
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

  if (status === 'accepted' || status === 'rejected') {
    const title = status === 'accepted' ? 'Demande acceptee' : 'Demande refusee';
    const message = status === 'accepted'
      ? 'Votre demande de credit a ete acceptee. Un pret est maintenant actif.'
      : 'Votre demande de credit a ete refusee. Vous pouvez consulter le detail dans l’application.';
    await createUserNotification(request.userId, {
      type: 'request_status',
      title,
      message,
      data: { requestId: request.id, status },
    });
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
  listUsers,
  updateUserRole,
  updateRequestStatus,
  createCreditType,
  analyticsSummary,
  updateCreditType,
};
