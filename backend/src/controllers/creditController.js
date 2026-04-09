const CreditType = require('../models/CreditType');
const Loan = require('../models/Loan');
const CreditRequest = require('../models/CreditRequest');

async function getDashboard(req, res) {
  const [loans, requests] = await Promise.all([
    Loan.find({ user: req.user._id }).populate('creditType', 'name slug').lean(),
    CreditRequest.find({ user: req.user._id }).sort({ createdAt: -1 }).populate('creditType', 'name slug').lean(),
  ]);

  return res.json({
    client: {
      fullName: req.user.fullName,
      balance: req.user.balance,
      salary: req.user.salary,
    },
    loans,
    requests,
  });
}

async function listCreditTypes(req, res) {
  const creditTypes = await CreditType.find({ isActive: true }).sort({ name: 1 }).lean();
  return res.json(creditTypes);
}

async function getCreditTypeBySlug(req, res) {
  const creditType = await CreditType.findOne({ slug: req.params.slug, isActive: true }).lean();
  if (!creditType) {
    return res.status(404).json({ message: 'Type de credit introuvable' });
  }
  return res.json(creditType);
}

module.exports = {
  getDashboard,
  listCreditTypes,
  getCreditTypeBySlug,
};
