const bcrypt = require('bcryptjs');
const { Op } = require('sequelize');
const { faker } = require('@faker-js/faker');
const { connectDb } = require('./config/db');
const CreditType = require('./models/CreditType');
const User = require('./models/User');
const Loan = require('./models/Loan');
const CreditRequest = require('./models/CreditRequest');

const DEFAULT_CREDIT_TYPES = [
  {
    name: 'Crédit Sayara',
    slug: 'credit-sayara',
    description: 'Financement véhicule neuf ou d’occasion (sayara).',
    minAmount: 3000,
    maxAmount: 80000,
    minDurationMonths: 12,
    maxDurationMonths: 84,
    annualRate: 6.35,
    requiredDocuments: ['pièce identité', 'devis véhicule', 'relevés bancaires'],
    isActive: true,
  },
  {
    name: 'Crédit Sakan',
    slug: 'credit-sakan',
    description: 'Crédit logement principal ou résidence secondaire (sakan).',
    minAmount: 20000,
    maxAmount: 500000,
    minDurationMonths: 60,
    maxDurationMonths: 300,
    annualRate: 5.1,
    requiredDocuments: ['pièce identité', 'promesse ou compromis', 'justificatifs de revenus'],
    isActive: true,
  },
  {
    name: 'Crédit Mounassib',
    slug: 'credit-mounassib',
    description: 'Prêt personnel à mensualités équilibrées pour vos projets.',
    minAmount: 1500,
    maxAmount: 50000,
    minDurationMonths: 6,
    maxDurationMonths: 84,
    annualRate: 7.2,
    requiredDocuments: ['pièce identité', 'bulletins de salaire', 'justificatif de domicile'],
    isActive: true,
  },
  {
    name: 'Crédit Tahawel',
    slug: 'credit-tahawel',
    description: 'Rachat ou transfert de crédits pour réduire la mensualité (tahawel).',
    minAmount: 5000,
    maxAmount: 200000,
    minDurationMonths: 12,
    maxDurationMonths: 240,
    annualRate: 6.05,
    requiredDocuments: ['pièce identité', 'tableaux d’amortissement', 'relevés bancaires'],
    isActive: true,
  },
  {
    name: 'Crédit Renov',
    slug: 'credit-renov',
    description: 'Travaux et rénovation habitat (Rénov).',
    minAmount: 5000,
    maxAmount: 150000,
    minDurationMonths: 12,
    maxDurationMonths: 180,
    annualRate: 6.75,
    requiredDocuments: ['pièce identité', 'devis travaux', 'titre de propriété ou bail'],
    isActive: true,
  },
  {
    name: 'Crédit START',
    slug: 'credit-start',
    description: 'Lancement ou développement d’activité, auto‑entrepreneur / micro‑projet.',
    minAmount: 3000,
    maxAmount: 100000,
    minDurationMonths: 12,
    maxDurationMonths: 96,
    annualRate: 7.95,
    requiredDocuments: ['pièce identité', 'prévisions ou business plan léger', 'RIB professionnel ou perso'],
    isActive: true,
  },
  {
    name: 'Crédit Bien être',
    slug: 'credit-bien-etre',
    description: 'Santé, études, formation ou confort familial.',
    minAmount: 2000,
    maxAmount: 40000,
    minDurationMonths: 6,
    maxDurationMonths: 72,
    annualRate: 7,
    requiredDocuments: ['pièce identité', 'quote-part ou convention (si santé)', 'justificatif de revenus'],
    isActive: true,
  },
];

const ACTIVE_SLUGS = DEFAULT_CREDIT_TYPES.map((t) => t.slug);

async function ensureCreditTypes() {
  const creditTypes = [];

  for (const payload of DEFAULT_CREDIT_TYPES) {
    const [creditType] = await CreditType.findOrCreate({
      where: { slug: payload.slug },
      defaults: payload,
    });
    await creditType.update(payload);
    creditTypes.push(creditType);
  }

  await CreditType.update({ isActive: false }, {
    where: { slug: { [Op.notIn]: ACTIVE_SLUGS } },
  });

  return creditTypes;
}

async function seedDatabase({ forceSync = false, skipIfNotEmpty = false, skipConnect = false } = {}) {
  if (!skipConnect) {
    await connectDb({ forceSync });
  }

  if (skipIfNotEmpty) {
    const [userCount, creditTypeCount] = await Promise.all([User.count(), CreditType.count()]);
    if (userCount > 0 || creditTypeCount > 0) {
      console.log('Seed auto ignore: base deja initialisee.');
      return { seeded: false };
    }
  }

  const creditTypes = await ensureCreditTypes();

  const adminHash = await bcrypt.hash('Admin@1234', 10);
  const [admin] = await User.findOrCreate({
    where: { email: 'admin@bank.local' },
    defaults: {
      fullName: 'Admin Banque',
      email: 'admin@bank.local',
      passwordHash: adminHash,
      role: 'admin',
      salary: 0,
      balance: 0,
    },
  });

  for (let i = 0; i < 8; i += 1) {
    const passwordHash = await bcrypt.hash('Client@1234', 10);
    const [client, wasCreated] = await User.findOrCreate({
      where: { email: `client${i + 1}@bank.local` },
      defaults: {
        fullName: faker.person.fullName(),
        email: `client${i + 1}@bank.local`,
        passwordHash,
        role: 'client',
        salary: faker.number.int({ min: 1800, max: 6500 }),
        balance: faker.number.int({ min: 500, max: 12000 }),
      },
    });

    if (!wasCreated) {
      continue;
    }

    const type = creditTypes[faker.number.int({ min: 0, max: creditTypes.length - 1 })];
    const amount = faker.number.int({ min: type.minAmount, max: Math.min(type.maxAmount, type.minAmount + 20000) });
    const duration = faker.number.int({ min: type.minDurationMonths, max: Math.min(type.maxDurationMonths, type.minDurationMonths + 48) });
    const monthlyPayment = Number((amount / duration).toFixed(2));

    await Loan.create({
      userId: client.id,
      creditTypeId: type.id,
      amount,
      durationMonths: duration,
      annualRate: type.annualRate,
      monthlyPayment,
      remainingInstallments: faker.number.int({ min: 1, max: duration }),
      status: 'active',
    });

    await CreditRequest.create({
      userId: client.id,
      creditTypeId: type.id,
      requestedAmount: amount,
      requestedDurationMonths: duration,
      salaryAtRequest: client.salary,
      estimatedMonthlyPayment: monthlyPayment,
      estimatedTotalCost: Number((monthlyPayment * duration - amount).toFixed(2)),
      debtRatio: Number((monthlyPayment / Math.max(client.salary, 1)).toFixed(3)),
      acceptanceProbability: 0.75,
      status: faker.helpers.arrayElement(['pending', 'accepted', 'rejected']),
      adminComment: '',
    });
  }

  console.log('Seed termine.');
  console.log('Admin:', admin.email, 'password: Admin@1234');
  return { seeded: true };
}

async function runAsScript() {
  await seedDatabase({ forceSync: true });
  process.exit(0);
}

if (require.main === module) {
  runAsScript().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}

module.exports = {
  seedDatabase,
  ensureCreditTypes,
};

