const CreditRequest = require('../models/CreditRequest');

async function chat(req, res) {
  const { message = '' } = req.body;
  const text = message.toLowerCase();

  if (text.includes('document')) {
    return res.json({
      answer: 'Documents habituels: piece d identite, justificatif de revenus, releves bancaires recents et justificatif de domicile.',
      intent: 'documents',
    });
  }

  if (text.includes('etat') || text.includes('statut')) {
    const lastRequest = await CreditRequest.findOne({
      where: { userId: req.user.id },
      order: [['createdAt', 'DESC']],
    });
    if (!lastRequest) {
      return res.json({ answer: 'Aucune demande trouvee pour le moment.', intent: 'request_status' });
    }
    return res.json({ answer: `Votre derniere demande est: ${lastRequest.status}.`, intent: 'request_status' });
  }

  if (text.includes('simulation') || text.includes('estimation')) {
    return res.json({
      answer: 'Utilisez le module estimation pour saisir salaire, montant et duree afin d obtenir mensualite, cout total et probabilite d acceptation.',
      intent: 'simulation_help',
    });
  }

  return res.json({
    answer: 'Je peux vous aider sur les types de credits, les documents requis, la simulation et le statut de votre demande.',
    intent: 'fallback',
  });
}

module.exports = {
  chat,
};
