const SavedSimulation = require('../models/SavedSimulation');
const CreditType = require('../models/CreditType');

async function listSavedSimulations(req, res) {
  const items = await SavedSimulation.findAll({
    where: { userId: req.user.id },
    order: [['createdAt', 'DESC']],
    include: [{ model: CreditType, attributes: ['id', 'name', 'slug'] }],
  });
  return res.json(items);
}

async function saveSimulation(req, res) {
  const {
    creditTypeId,
    label = '',
    amount,
    durationMonths,
    annualRate,
    monthlyPayment,
    totalCost,
    debtRatio,
    acceptanceProbability,
  } = req.body;

  if (!creditTypeId || !amount || !durationMonths) {
    return res.status(400).json({ message: 'creditTypeId, amount et durationMonths sont requis' });
  }

  const ct = await CreditType.findByPk(creditTypeId);
  if (!ct) {
    return res.status(404).json({ message: 'Type de credit introuvable' });
  }

  const created = await SavedSimulation.create({
    userId: req.user.id,
    creditTypeId: ct.id,
    label: String(label || '').trim(),
    amount: Number(amount),
    durationMonths: Number(durationMonths),
    annualRate: Number(annualRate ?? ct.annualRate),
    monthlyPayment: Number(monthlyPayment || 0),
    totalCost: Number(totalCost || 0),
    debtRatio: Number(debtRatio || 0),
    acceptanceProbability: Number(acceptanceProbability || 0),
  });

  return res.status(201).json(created);
}

async function deleteSimulation(req, res) {
  const item = await SavedSimulation.findOne({ where: { id: req.params.id, userId: req.user.id } });
  if (!item) {
    return res.status(404).json({ message: 'Simulation introuvable' });
  }
  await item.destroy();
  return res.json({ message: 'Simulation supprimee' });
}

module.exports = {
  listSavedSimulations,
  saveSimulation,
  deleteSimulation,
};
