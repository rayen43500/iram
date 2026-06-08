function clampStr(v, max) {
  const s = String(v ?? '').trim();
  if (!s) return '';
  return s.length > max ? s.slice(0, max) : s;
}

function validateLegacyForm(raw) {
  const phone = clampStr(raw.phone, 32).replace(/\s/g, '');
  const city = clampStr(raw.city, 140);
  const profession = clampStr(raw.profession, 140);
  const projectPurpose = clampStr(raw.projectPurpose, 4000);
  const additionalNotes = clampStr(raw.additionalNotes, 4000);
  const monthlyOtherIncome = Number(raw.monthlyOtherIncome);
  const acceptsAccuracyDeclaration = Boolean(raw.acceptsAccuracyDeclaration);

  const errors = [];
  if (phone.replace(/\D/g, '').length < 8) {
    errors.push('Numéro de téléphone invalide (au moins 8 chiffres).');
  }
  if (city.length < 2) errors.push('Ville / adresse trop courte.');
  if (profession.length < 2) errors.push('Profession ou situation professionnelle requise.');
  if (projectPurpose.length < 15) {
    errors.push("Objet du financement ou description du projet requis (minimum 15 caractères).");
  }
  if (!acceptsAccuracyDeclaration) {
    errors.push('Vous devez confirmer l’exactitude des informations fournies.');
  }
  if (Number.isNaN(monthlyOtherIncome) || monthlyOtherIncome < 0) {
    errors.push('Revenus complémentaires invalides.');
  }

  if (errors.length) return { ok: false, errors };

  return {
    ok: true,
    data: {
      formType: 'legacy',
      phone,
      city,
      profession,
      projectPurpose,
      additionalNotes,
      monthlyOtherIncome: monthlyOtherIncome || 0,
      acceptsAccuracyDeclaration: true,
    },
  };
}

function validateAtbForm(raw) {
  const a1 = raw.applicant1 || {};
  const phone = clampStr(a1.phone || raw.phone, 32).replace(/\s/g, '');
  const city = clampStr(a1.address || raw.city, 200);
  const projectPurpose = clampStr(raw.credit?.purpose || raw.projectPurpose, 4000);
  const idNumber = clampStr(a1.idNumber, 32);
  const monthlyOtherIncome = Number(a1.otherIncomeAmount ?? raw.monthlyOtherIncome ?? 0);
  const accepts = Boolean(raw.acceptsAccuracyDeclaration);

  const errors = [];
  if (phone.replace(/\D/g, '').length < 8) errors.push('Téléphone invalide (8 chiffres min).');
  if (city.length < 2) errors.push('Adresse / ville requise.');
  if (!idNumber) errors.push('Numéro de pièce d’identité requis.');
  if (a1.idType === 'cin' && !/^\d{8}$/.test(idNumber)) {
    errors.push('CIN invalide (8 chiffres).');
  }
  if (projectPurpose.length < 15) errors.push('Objet du crédit trop court (15 caractères min).');
  if (!accepts) errors.push('Déclaration d’exactitude requise.');

  if (errors.length) return { ok: false, errors };

  const data = { ...raw };
  data.phone = phone;
  data.city = city;
  data.profession = clampStr(raw.profession || a1.professionalStatus, 140);
  data.projectPurpose = projectPurpose;
  data.monthlyOtherIncome = Number.isFinite(monthlyOtherIncome) ? monthlyOtherIncome : 0;
  data.acceptsAccuracyDeclaration = true;
  data.formType = 'atb_particuliers_v3';

  return { ok: true, data };
}

/**
 * Normalise et valide le formulaire envoyé avec une demande de crédit.
 */
function parseApplicationForm(body) {
  const raw = body?.applicationForm;
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { ok: false, errors: ['Formulaire de demande (applicationForm) requis au format objet.'] };
  }

  if (raw.formType === 'atb_particuliers_v3') {
    return validateAtbForm(raw);
  }

  return validateLegacyForm(raw);
}

module.exports = { parseApplicationForm };
