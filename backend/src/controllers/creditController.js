const CreditType = require('../models/CreditType');
const Loan = require('../models/Loan');
const CreditRequest = require('../models/CreditRequest');

async function getDashboard(req, res) {
  const [loans, requests] = await Promise.all([
    Loan.findAll({
      where: { userId: req.user.id },
      include: [{ model: CreditType, attributes: ['id', 'name', 'slug'] }],
    }),
    CreditRequest.findAll({
      where: { userId: req.user.id },
      order: [['createdAt', 'DESC']],
      include: [{ model: CreditType, attributes: ['id', 'name', 'slug'] }],
    }),
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
  const creditTypes = await CreditType.findAll({ where: { isActive: true }, order: [['name', 'ASC']] });
  return res.json(creditTypes);
}

async function getCreditTypeBySlug(req, res) {
  const creditType = await CreditType.findOne({ where: { slug: req.params.slug, isActive: true } });
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
