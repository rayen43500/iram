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
    name: 'Crédit SAYARA',
    slug: 'credit-sayara',
    category: 'Voitures',
    shortDescription: 'Financement de votre véhicule neuf ou d’occasion avec des conditions souples.',
    description: 'Vous souhaitez acheter une voiture neuve ou d\'occasion, utilitaire ou de luxe, pour la famille ou pour votre activité professionnelle. ATB vous propose une solution adaptée à vos besoins.',
    minAmount: 3000,
    maxAmount: 200000,
    minDurationMonths: 12,
    maxDurationMonths: 84,
    annualRate: 6.35,
    hasDocuments: true,
    requiredDocuments: [
      'Une pièce d’identité valide (CIN)',
      'Une fiche de paie récente ou justificatif de revenu',
      'Les 3 dernières fiches de paie pour les salariés',
      'Déclaration Unique de Revenus (DUR) pour les non salariés',
      'Les 6 derniers relevés de l\'ancien compte pour nouveaux clients',
      'Promesse de vente établie + copie carte grise (pour véhicule d’occasion)',
      'Facture pro forma (pour véhicule acheté auprès d’un concessionnaire)',
      'Demande de crédit ATB PDF'
    ],
    features: [
      'Montant : Sans plafond',
      'Financement : Jusqu’à 80% du prix de la voiture',
      'Durée de remboursement : Jusqu’à 7 ans',
      'Possibilité d’associer le conjoint au crédit pour obtenir un montant plus important',
      'Possibilité de bénéficier des offres d’assurances crédits'
    ],
    pdfFiles: [
      { name: 'Demande de crédit ATB', file: 'Demande-de-credit-aux-particuliers.pdf' }
    ],
    isActive: true,
  },
  {
    name: 'Crédit START - Permis de conduire',
    slug: 'credit-start',
    category: 'Voitures',
    shortDescription: 'Financement de votre formation à la conduite (moto, voiture, poids lourd).',
    description: 'START est un crédit destiné aux personnes souhaitant financer leur formation à la conduite. Il permet de passer un permis moto, voiture ou poids lourd.',
    minAmount: 500,
    maxAmount: 2000,
    minDurationMonths: 6,
    maxDurationMonths: 36,
    annualRate: 7.95,
    hasDocuments: true,
    requiredDocuments: [
      'Copie CIN',
      'Demande de crédit ATB',
      '3 dernières fiches de paie ou DUR',
      'Copie engagement avec Auto-école',
      'Justificatif adresse actuelle (STEG, SONEDE, Téléphone...)',
      'Attestation de travail',
      'Attestation de salaire',
      'Caution solidaire',
      'Formulaire informations complémentaires de la caution',
      'Copie CIN de la caution',
      '3 dernières fiches de paie ou DUR de la caution',
      'Ordre de prélèvement ou domiciliation de salaire',
      'Attestation de travail de la caution',
      'Attestation de salaire de la caution'
    ],
    features: [
      'Montant : Jusqu’à 2000 DT',
      'Durée de remboursement : Jusqu’à 36 mois',
      'Accessible aux clients ATB et non clients ATB',
      'Le montant du crédit est transféré directement au compte de l’auto-école'
    ],
    pdfFiles: [
      { name: 'Demande de crédit ATB', file: 'Demande-de-credit-aux-particuliers.pdf' }
    ],
    isActive: true,
  },
  {
    name: 'Crédit Sakan',
    slug: 'credit-sakan',
    category: 'Immobilier',
    shortDescription: 'Prêt immobilier pour l’achat d’un logement principal ou secondaire.',
    description: 'Crédit logement principal ou résidence secondaire (sakan).',
    minAmount: 20000,
    maxAmount: 500000,
    minDurationMonths: 60,
    maxDurationMonths: 300,
    annualRate: 5.1,
    hasDocuments: true,
    requiredDocuments: ['pièce identité', 'promesse ou compromis', 'justificatifs de revenus'],
    features: [
      'Financement de résidences principales ou secondaires',
      'Durée de remboursement jusqu\'à 25 ans',
      'Taux compétitif'
    ],
    pdfFiles: [],
    isActive: true,
  },
  {
    name: 'Crédit Renov',
    slug: 'credit-renov',
    category: 'Immobilier',
    shortDescription: 'Financement de vos travaux d’aménagement et rénovation.',
    description: 'Travaux et rénovation habitat (Rénov).',
    minAmount: 500,
    maxAmount: 150000,
    minDurationMonths: 12,
    maxDurationMonths: 180,
    annualRate: 6.75,
    hasDocuments: true,
    requiredDocuments: ['pièce identité', 'devis travaux', 'titre de propriété ou bail'],
    features: [
      'Travaux d\'aménagement et rénovation',
      'Financement jusqu\'à 100% des travaux',
      'Durée jusqu\'à 15 ans'
    ],
    pdfFiles: [],
    isActive: true,
  },
  {
    name: 'Crédit Mounassib',
    slug: 'credit-mounassib',
    category: 'Consommation',
    shortDescription: 'Prêt personnel à mensualités constantes pour tous vos projets.',
    description: 'Prêt personnel à mensualités équilibrées pour vos projets.',
    minAmount: 1500,
    maxAmount: 50000,
    minDurationMonths: 6,
    maxDurationMonths: 84,
    annualRate: 7.2,
    hasDocuments: true,
    requiredDocuments: ['pièce identité', 'bulletins de salaire', 'justificatif de domicile'],
    features: [
      'Prêt personnel sans justificatif d\'utilisation',
      'Mensualités constantes et équilibrées',
      'Durée jusqu\'à 7 ans'
    ],
    pdfFiles: [],
    isActive: true,
  },
  {
    name: 'Crédit Tahawel',
    slug: 'credit-tahawel',
    category: 'Consommation',
    shortDescription: 'Rachat ou transfert de vos crédits pour alléger vos mensualités.',
    description: 'Rachat ou transfert de crédits pour réduire la mensualité (tahawel).',
    minAmount: 5000,
    maxAmount: 200000,
    minDurationMonths: 12,
    maxDurationMonths: 240,
    annualRate: 6.05,
    hasDocuments: true,
    requiredDocuments: ['pièce identité', 'tableaux d’amortissement', 'relevés bancaires'],
    features: [
      'Rachat de crédits extérieurs',
      'Réduction de la mensualité globale',
      'Allongement de la durée de remboursement'
    ],
    pdfFiles: [],
    isActive: true,
  },
  {
    name: 'Crédit Bien être',
    slug: 'credit-bien-etre',
    category: 'Autres crédits',
    shortDescription: 'Financement de la santé, des études et du confort familial.',
    description: 'Santé, études, formation ou confort familial.',
    minAmount: 2000,
    maxAmount: 40000,
    minDurationMonths: 6,
    maxDurationMonths: 72,
    annualRate: 7,
    hasDocuments: false,
    requiredDocuments: [],
    features: [
      'Financement pour études, santé ou voyages',
      'Durée flexible',
      'Taux préférentiels'
    ],
    pdfFiles: [],
    isActive: true,
  },
  {
    name: 'Crédit Personnel',
    slug: 'credit-personnel',
    category: 'Consommation',
    shortDescription: 'Credit personnel sans affectation pour vos projets courants.',
    description: 'Credit personnel sans affectation pour les besoins du quotidien.',
    minAmount: 1000,
    maxAmount: 80000,
    minDurationMonths: 6,
    maxDurationMonths: 84,
    annualRate: 7.5,
    hasDocuments: true,
    requiredDocuments: ['piece identite', 'bulletins de salaire', 'justificatif de domicile'],
    features: [
      'Credit personnel sans affectation',
      'Mensualites fixes',
      'Duree jusqu\'a 7 ans'
    ],
    pdfFiles: [],
    isActive: true,
  },
  {
    name: 'Crédit Social',
    slug: 'credit-social',
    category: 'Consommation',
    shortDescription: 'Credit social a taux preferentiel.',
    description: 'Credit social a taux preferentiel pour les besoins essentiels.',
    minAmount: 500,
    maxAmount: 30000,
    minDurationMonths: 6,
    maxDurationMonths: 60,
    annualRate: 2.5,
    hasDocuments: true,
    requiredDocuments: ['piece identite', 'justificatif de revenu', 'justificatif de domicile'],
    features: [
      'Taux preferentiel',
      'Accessible aux particuliers',
      'Conditions souples'
    ],
    pdfFiles: [],
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
    where: { email: 'admin@atb.com.tn' },
    defaults: {
      accountNumber: '000000000000',
      cin: '00000000',
      firstName: 'Admin',
      lastName: 'ATB',
      fullName: 'Administrateur ATB',
      email: 'admin@atb.com.tn',
      passwordHash: adminHash,
      role: 'admin',
      accountType: 'particulier',
      salary: 0,
      balance: 0,
    },
  });

  const TUNISIAN_CLIENTS = [
    { email: 'mohamed.trabelsi@gmail.com', firstName: 'Mohamed', lastName: 'Trabelsi', cin: '07451289', accountNumber: '104008123456', profession: "Chef d'entreprise", accountType: 'professionnel', salary: 4500, balance: 12500, phone: '+21698123456', city: 'Tunis, Lac 1' },
    { email: 'youssef.benali@outlook.com', firstName: 'Youssef', lastName: 'Ben Ali', cin: '09124578', accountNumber: '104008123457', profession: 'Commerçant', accountType: 'professionnel', salary: 3200, balance: 7800, phone: '+21622334455', city: 'Sfax, Centre-ville' },
    { email: 'fatma.gharbi@gmail.com', firstName: 'Fatma', lastName: 'Gharbi', cin: '08451296', accountNumber: '104008123458', profession: 'Médecin', accountType: 'professionnel', salary: 5800, balance: 15400, phone: '+21655667788', city: 'Ariana, Raoued' },
    { email: 'amine.chaari@gmail.com', firstName: 'Amine', lastName: 'Chaari', cin: '11024589', accountNumber: '104008123459', profession: 'Ingénieur', accountType: 'particulier', salary: 2800, balance: 4500, phone: '+21671234567', city: 'Sousse, Khzema' },
    { email: 'nour.mellouli@gmail.com', firstName: 'Nour', lastName: 'Mellouli', cin: '12035689', accountNumber: '104008123460', profession: 'Enseignante', accountType: 'particulier', salary: 2100, balance: 3200, phone: '+21698765432', city: 'Monastir, Skanes' },
    { email: 'myriam.gueddari@gmail.com', firstName: 'Myriam', lastName: 'Gueddari', cin: '06985214', accountNumber: '104008123461', profession: 'Pharmacienne', accountType: 'professionnel', salary: 4200, balance: 9300, phone: '+21650111222', city: 'Bizerte, Corniche' },
    { email: 'yassine.bouazizi@gmail.com', firstName: 'Yassine', lastName: 'Bouazizi', cin: '05147896', accountNumber: '104008123462', profession: 'Consultant IT', accountType: 'particulier', salary: 3500, balance: 6200, phone: '+21620304050', city: 'Tunis, Ennasr' },
    { email: 'khaled.khelifi@gmail.com', firstName: 'Khaled', lastName: 'Khelifi', cin: '04896512', accountNumber: '104008123463', profession: 'Avocat', accountType: 'professionnel', salary: 5100, balance: 18200, phone: '+21622113344', city: 'Tunis, Lafayette' },
    { email: 'salma.jebali@yahoo.com', firstName: 'Salma', lastName: 'Jebali', cin: '10345678', accountNumber: '104008123464', profession: 'Architecte', accountType: 'professionnel', salary: 3900, balance: 8700, phone: '+21655443322', city: 'Nabeul, Hammamet' },
    { email: 'riadh.hammami@gmail.com', firstName: 'Riadh', lastName: 'Hammami', cin: '07894561', accountNumber: '104008123465', profession: 'Fonctionnaire', accountType: 'particulier', salary: 2400, balance: 4100, phone: '+21699887766', city: 'Kairouan' },
    { email: 'leila.bouhlel@gmail.com', firstName: 'Leila', lastName: 'Bouhlel', cin: '06543219', accountNumber: '104008123466', profession: 'Infirmière', accountType: 'particulier', salary: 2300, balance: 3800, phone: '+21677665544', city: 'Gabès, Jara' },
    { email: 'hichem.dridi@outlook.com', firstName: 'Hichem', lastName: 'Dridi', cin: '11223344', accountNumber: '104008123467', profession: 'Gérant restaurant', accountType: 'professionnel', salary: 3600, balance: 7200, phone: '+21644556677', city: 'Mahdia, Corniche' },
    { email: 'sonia.abidi@gmail.com', firstName: 'Sonia', lastName: 'Abidi', cin: '08997766', accountNumber: '104008123468', profession: 'Comptable', accountType: 'particulier', salary: 2600, balance: 5400, phone: '+21666778899', city: 'Ben Arous, Ezzahra' },
    { email: 'karim.zouari@gmail.com', firstName: 'Karim', lastName: 'Zouari', cin: '05432198', accountNumber: '104008123469', profession: 'Technicien', accountType: 'particulier', salary: 2200, balance: 2900, phone: '+21633445566', city: 'Gafsa, El Gueitar' },
    { email: 'inès.mansouri@gmail.com', firstName: 'Inès', lastName: 'Mansouri', cin: '06781234', accountNumber: '104008123470', profession: 'Dentiste', accountType: 'professionnel', salary: 6200, balance: 21000, phone: '+21688990011', city: 'La Marsa, Tunis' },
    { email: 'wassim.ferchichi@gmail.com', firstName: 'Wassim', lastName: 'Ferchichi', cin: '04567891', accountNumber: '104008123471', profession: 'Agent immobilier', accountType: 'professionnel', salary: 3400, balance: 6500, phone: '+21622331100', city: 'Hammam Sousse' },
    { email: 'marwa.saidi@gmail.com', firstName: 'Marwa', lastName: 'Saidi', cin: '09876543', accountNumber: '104008123472', profession: 'Graphiste', accountType: 'particulier', salary: 1900, balance: 2600, phone: '+21655112233', city: 'Tunis, Manar' },
    { email: 'omar.jlassi@gmail.com', firstName: 'Omar', lastName: 'Jlassi', cin: '03214567', accountNumber: '104008123473', profession: 'Retraité', accountType: 'particulier', salary: 1800, balance: 12000, phone: '+21677441122', city: 'Kélibia' },
    { email: 'hela.chebbi@gmail.com', firstName: 'Hela', lastName: 'Chebbi', cin: '07654321', accountNumber: '104008123474', profession: 'Gérante boutique', accountType: 'professionnel', salary: 3100, balance: 5900, phone: '+21699663322', city: 'Tozeur, Centre' },
    { email: 'bilel.othmani@gmail.com', firstName: 'Bilel', lastName: 'Othmani', cin: '06129876', accountNumber: '104008123475', profession: 'Électricien', accountType: 'particulier', salary: 2000, balance: 3100, phone: '+21622889900', city: 'Médenine' },
  ];

  for (let i = 0; i < TUNISIAN_CLIENTS.length; i += 1) {
    const clientData = TUNISIAN_CLIENTS[i];
    const passwordHash = await bcrypt.hash('Client@1234', 10);
    const [client, wasCreated] = await User.findOrCreate({
      where: { email: clientData.email },
      defaults: {
        accountNumber: clientData.accountNumber,
        cin: clientData.cin,
        firstName: clientData.firstName,
        lastName: clientData.lastName,
        fullName: `${clientData.firstName} ${clientData.lastName}`.trim(),
        email: clientData.email,
        passwordHash,
        role: 'client',
        accountType: clientData.accountType,
        salary: clientData.salary,
        balance: clientData.balance,
        profession: clientData.profession,
        phone: clientData.phone || '',
        city: clientData.city || '',
      },
    });

    if (!wasCreated) {
      await client.update({
        phone: clientData.phone || client.phone,
        city: clientData.city || client.city,
        profession: clientData.profession || client.profession,
        accountType: clientData.accountType,
        salary: clientData.salary,
        balance: clientData.balance,
      });
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
      applicationForm: null,
    });
  }

  console.log('Seed termine.');
  console.log('Admin:', admin.email, 'password: Admin@1234');
  console.log(`Clients tunisiens: ${TUNISIAN_CLIENTS.length} (Client Normal / Client Personnel)`);
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

