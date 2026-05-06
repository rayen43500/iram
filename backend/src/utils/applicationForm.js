function clampStr(v, max) {
  const s = String(v ?? '').trim();
  if (!s) return '';
  return s.length > max ? s.slice(0, max) : s;
}

/**
 * Normalise et valide le formulaire envoyé avec une demande de crédit.
 * @returns {{ ok: boolean, errors?: string[], data?: object }}
 */
function parseApplicationForm(body) {
  const raw = body?.applicationForm;
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { ok: false, errors: ['Formulaire de demande (applicationForm) requis au format objet.'] };
  }

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
  if (city.length < 2) {
    errors.push('Ville / adresse trop courte.');
  }
  if (profession.length < 2) {
    errors.push('Profession ou situation professionnelle requise.');
  }
  if (projectPurpose.length < 15) {
    errors.push("Objet du financement ou description du projet requis (minimum 15 caractères).");
  }
  if (!acceptsAccuracyDeclaration) {
    errors.push('Vous devez confirmer l’exactitude des informations fournies.');
  }
  if (Number.isNaN(monthlyOtherIncome) || monthlyOtherIncome < 0) {
    errors.push('Revenus complémentaires invalides.');
  }

  if (errors.length) {
    return { ok: false, errors };
  }

  const data = {
    phone,
    city,
    profession,
    projectPurpose,
    additionalNotes,
    monthlyOtherIncome: monthlyOtherIncome || 0,
    acceptsAccuracyDeclaration: true,
  };

  return { ok: true, data };
}

module.exports = { parseApplicationForm };
