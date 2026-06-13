/** Libellés affichés — ne pas montrer « Particulier » à l'utilisateur */

export function accountTypeLabel(accountType, role) {
  if (role === 'admin') return 'Administrateur';
  if (accountType === 'professionnel') return 'Client Personnel';
  return 'Client Normal';
}

export function accountTypeShort(accountType, role) {
  if (role === 'admin') return 'Admin';
  if (accountType === 'professionnel') return 'Personnel';
  return 'Normal';
}

export const ACCOUNT_TYPE_OPTIONS = [
  { value: 'particulier', label: 'Client Normal', hint: 'Crédit et services grand public' },
  { value: 'professionnel', label: 'Client Personnel', hint: 'Commerçant, libéral, entreprise' },
];
