const bcrypt = require('bcryptjs');
const { faker } = require('@faker-js/faker');
const { connectDb } = require('./config/db');
const CreditType = require('./models/CreditType');
const User = require('./models/User');
const Loan = require('./models/Loan');
const CreditRequest = require('./models/CreditRequest');

async function run() {
  await connectDb({ forceSync: true });

  const creditTypes = await CreditType.bulkCreate([
    {
      name: 'Credit personnel',
      slug: 'credit-personnel',
      description: 'Pret personnel pour besoins divers.',
      minAmount: 1000,
      maxAmount: 30000,
      minDurationMonths: 6,
      maxDurationMonths: 84,
      annualRate: 7.5,
      requiredDocuments: ['piece identite', 'bulletins salaire', 'justificatif domicile'],
      isActive: true,
    },
    {
      name: 'Credit auto',
      slug: 'credit-auto',
      description: 'Financement de vehicule neuf ou occasion.',
      minAmount: 3000,
      maxAmount: 60000,
      minDurationMonths: 12,
      maxDurationMonths: 84,
      annualRate: 6.2,
      requiredDocuments: ['piece identite', 'devis vehicule', 'releves bancaires'],
      isActive: true,
    },
    {
      name: 'Credit immobilier',
      slug: 'credit-immobilier',
      description: 'Financement immobilier long terme.',
      minAmount: 30000,
      maxAmount: 500000,
      minDurationMonths: 60,
      maxDurationMonths: 300,
      annualRate: 4.9,
      requiredDocuments: ['piece identite', 'compromis vente', 'justificatifs revenus'],
      isActive: true,
    },
  ]);

  const adminHash = await bcrypt.hash('Admin@1234', 10);
  const admin = await User.create({
    fullName: 'Admin Banque',
    email: 'admin@bank.local',
    passwordHash: adminHash,
    role: 'admin',
    salary: 0,
    balance: 0,
  });

  for (let i = 0; i < 8; i += 1) {
    const passwordHash = await bcrypt.hash('Client@1234', 10);
    const client = await User.create({
      fullName: faker.person.fullName(),
      email: `client${i + 1}@bank.local`,
      passwordHash,
      role: 'client',
      salary: faker.number.int({ min: 1800, max: 6500 }),
      balance: faker.number.int({ min: 500, max: 12000 }),
    });

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
  process.exit(0);
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});

