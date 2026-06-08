/** État et validation — Demande de crédit ATB (DCRT/03-2016/V3) */

export function createInitialAtbForm(user) {
  const prof = String(user?.profession || '').toLowerCase();
  let professionalStatus = 'titulaire';
  if (prof.includes('contract')) professionalStatus = 'contractuel';
  else if (prof.includes('retrait')) professionalStatus = 'retraite';
  else if (prof.includes('lib') || prof.includes('chef') || prof.includes('entrepr') || user?.accountType === 'professionnel') {
    professionalStatus = 'professionnel';
  }

  return {
    agency: '',
    idType: 'cin',
    idNumber: user?.cin ? String(user.cin) : '',
    professionalStatus,
    address: user?.city ? String(user.city) : '',
    phone: user?.phone ? String(user.phone) : '',
    otherIncomeSources: { personal: false, dividends: false, banking: false, rents: false, other: false },
    otherIncomeOtherText: '',
    otherIncomeAmount: '',
    client2Enabled: false,
    client2Name: '',
    client2IdType: 'cin',
    client2IdNumber: '',
    client2ProfessionalStatus: 'titulaire',
    client2NetSalary: '',
    spouseEnabled: false,
    spouseName: '',
    spouseAtbAccount: '',
    spouseEmployer: '',
    spouseProfessionalStatus: 'titulaire',
    spouseNetSalary: '',
    creditPurpose: '',
    guarantees: 'Domiciliation de salaire et assurance emprunteur',
    repaymentPeriodicity: 'mensuelle',
    convention: 'non',
    conventionName: '',
    creditCategory: 'consommation',
    vehicleFiscalPower: '',
    vehicleIsNew: true,
    vehicleFirstCirculation: '',
    immoConstruction: false,
    immoAmenagement: false,
    immoTerrain: false,
    immoPromoter: false,
    immoParticulier: false,
    propertyValue: '',
    repaymentType: 'constant',
    additionalNotes: '',
    acceptsDeclaration: false,
  };
}

const STATUS_LABELS = {
  titulaire: 'Titulaire / مترسم',
  contractuel: 'Contractuel / متربص',
  retraite: 'Retraité / متقاعد',
  professionnel: 'Professionnel / عمل حر',
};

export function professionalStatusLabel(key) {
  return STATUS_LABELS[key] || key;
}

export function validateAtbForm(form, user) {
  const f = form || {};
  const phoneDigits = String(f.phone || '').replace(/\D/g, '');
  if (phoneDigits.length < 8) return 'Téléphone : au moins 8 chiffres.';
  if (String(f.address || '').trim().length < 2) return 'Ville / adresse requise.';
  if (f.idType === 'cin' && !/^\d{8}$/.test(String(f.idNumber || '').trim())) {
    return 'Numéro CIN invalide (8 chiffres).';
  }
  if (!String(f.idNumber || '').trim()) return 'Numéro de pièce d’identité requis.';
  if (String(f.creditPurpose || '').trim().length < 15) {
    return 'Objet du crédit : minimum 15 caractères.';
  }
  if (!f.acceptsDeclaration) return 'Veuillez certifier l’exactitude des informations.';
  const extra = Number(String(f.otherIncomeAmount || '').replace(',', '.'));
  if (f.otherIncomeAmount && (!Number.isFinite(extra) || extra < 0)) {
    return 'Montant des autres revenus invalide.';
  }
  if (f.client2Enabled) {
    if (String(f.client2Name || '').trim().length < 2) return 'Nom du 2e demandeur requis (compte joint).';
    if (!String(f.client2IdNumber || '').trim()) return 'Pièce d’identité du 2e demandeur requise.';
  }
  if (f.spouseEnabled && String(f.spouseName || '').trim().length < 2) {
    return 'Nom du conjoint requis.';
  }
  if (!user?.accountNumber && !user?.id) {
    return 'Compte client introuvable.';
  }
  return '';
}

export function atbFormToPayload(form, user) {
  const f = form || {};
  const monthlyOtherIncome = Number(String(f.otherIncomeAmount || '').replace(',', '.')) || 0;
  const profession = professionalStatusLabel(f.professionalStatus);

  return {
    formType: 'atb_particuliers_v3',
    agency: String(f.agency || '').trim(),
    accountNumber: user?.accountNumber || null,
    applicant1: {
      fullName: user?.fullName || '',
      idType: f.idType,
      idNumber: String(f.idNumber || '').trim(),
      professionalStatus: f.professionalStatus,
      address: String(f.address || '').trim(),
      phone: String(f.phone || '').trim().replace(/\s/g, ''),
      netMonthlySalary: Number(user?.salary || 0),
      otherIncomeSources: f.otherIncomeSources,
      otherIncomeOtherText: String(f.otherIncomeOtherText || '').trim(),
      otherIncomeAmount: monthlyOtherIncome,
    },
    applicant2: f.client2Enabled ? {
      fullName: String(f.client2Name || '').trim(),
      idType: f.client2IdType,
      idNumber: String(f.client2IdNumber || '').trim(),
      professionalStatus: f.client2ProfessionalStatus,
      netMonthlySalary: Number(String(f.client2NetSalary || '').replace(',', '.')) || 0,
    } : null,
    spouse: f.spouseEnabled ? {
      fullName: String(f.spouseName || '').trim(),
      atbAccount: String(f.spouseAtbAccount || '').trim(),
      employer: String(f.spouseEmployer || '').trim(),
      professionalStatus: f.spouseProfessionalStatus,
      netMonthlySalary: Number(String(f.spouseNetSalary || '').replace(',', '.')) || 0,
    } : null,
    credit: {
      purpose: String(f.creditPurpose || '').trim(),
      guarantees: String(f.guarantees || '').trim(),
      repaymentPeriodicity: f.repaymentPeriodicity,
      convention: f.convention,
      conventionName: String(f.conventionName || '').trim(),
      creditCategory: f.creditCategory,
      vehicleFiscalPower: String(f.vehicleFiscalPower || '').trim(),
      vehicleIsNew: Boolean(f.vehicleIsNew),
      vehicleFirstCirculation: String(f.vehicleFirstCirculation || '').trim(),
      immoConstruction: Boolean(f.immoConstruction),
      immoAmenagement: Boolean(f.immoAmenagement),
      immoTerrain: Boolean(f.immoTerrain),
      immoPromoter: Boolean(f.immoPromoter),
      immoParticulier: Boolean(f.immoParticulier),
      propertyValue: String(f.propertyValue || '').trim(),
      repaymentType: f.repaymentType,
    },
    phone: String(f.phone || '').trim().replace(/\s/g, ''),
    city: String(f.address || '').trim(),
    profession,
    projectPurpose: String(f.creditPurpose || '').trim(),
    monthlyOtherIncome,
    additionalNotes: String(f.additionalNotes || '').trim(),
    acceptsAccuracyDeclaration: Boolean(f.acceptsDeclaration),
  };
}

export function inferCreditCategory(creditName = '') {
  const n = String(creditName).toLowerCase();
  if (n.includes('sayara') || n.includes('véhicule') || n.includes('vehicule') || n.includes('start')) return 'vehicule';
  if (n.includes('sakan') || n.includes('renov') || n.includes('immobil')) return 'immobilier';
  return 'consommation';
}
