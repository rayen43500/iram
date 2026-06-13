const fetch = require('node-fetch');
const CreditRequest = require('../models/CreditRequest');
const CreditType = require('../models/CreditType');
const env = require('../config/env');

async function buildChatContext(user) {
  const [lastRequest, creditTypes] = await Promise.all([
    CreditRequest.findOne({
      where: { userId: user.id },
      order: [['createdAt', 'DESC']],
      attributes: ['status', 'requestedAmount', 'requestedDurationMonths'],
    }),
    CreditType.findAll({
      where: { isActive: true },
      attributes: ['name'],
      order: [['name', 'ASC']],
    }),
  ]);

  return {
    userName: user.fullName || user.email || 'Client',
    lastRequestStatus: lastRequest?.status || null,
    creditTypes: creditTypes.map((t) => t.name),
    salary: Number(user.salary || 0) || null,
  };
}

async function callNlpService(message, context) {
  const base = String(env.nlpServiceUrl || '').replace(/\/$/, '');
  if (!base) return null;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), env.nlpServiceTimeoutMs);

  try {
    const res = await fetch(`${base}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, context }),
      signal: controller.signal,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.message || `NLP service HTTP ${res.status}`);
    }
    if (!data.answer) return null;
    return {
      answer: String(data.answer),
      intent: data.intent || 'general',
      confidence: Number(data.confidence || 0),
      source: data.source || 'nlp',
    };
  } finally {
    clearTimeout(timeout);
  }
}

function localRuleAnswer(message, context) {
  const text = String(message || '').toLowerCase();

  if (text.includes('document') || text.includes('cin') || text.includes('paie')) {
    return {
      answer: 'Documents habituels : CIN, fiche de paie, relevés bancaires. Déposez-les dans Profil → Documents.',
      intent: 'documents',
      confidence: 0.9,
      source: 'rules',
    };
  }

  if (text.includes('etat') || text.includes('statut') || text.includes('suivi')) {
    if (!context.lastRequestStatus) {
      return { answer: 'Aucune demande trouvée pour le moment.', intent: 'request_status', confidence: 0.9, source: 'rules' };
    }
    return {
      answer: `Votre dernière demande est : ${context.lastRequestStatus}.`,
      intent: 'request_status',
      confidence: 0.9,
      source: 'rules',
    };
  }

  if (text.includes('simulation') || text.includes('estimation') || text.includes('mensual')) {
    return {
      answer: 'Utilisez Simulation : salaire, montant, durée, puis calculez l’estimation avant de soumettre la demande.',
      intent: 'simulation_help',
      confidence: 0.85,
      source: 'rules',
    };
  }

  if (text.includes('sayara') || text.includes('sakan') || text.includes('credit')) {
    const types = context.creditTypes?.length ? context.creditTypes.join(', ') : 'SAYARA, Sakan, Mounassib…';
    return {
      answer: `Produits ATB : ${types}. Choisissez un type dans Simulation ou Crédits.`,
      intent: 'credit_types',
      confidence: 0.7,
      source: 'rules',
    };
  }

  return {
    answer: 'Je peux vous aider sur les crédits, documents, simulation et statut de demande. Posez une question précise.',
    intent: 'general',
    confidence: 0.3,
    source: 'rules',
  };
}

async function handleChat(user, message) {
  const context = await buildChatContext(user);
  const trimmed = String(message || '').trim();
  if (!trimmed) {
    return {
      answer: 'Bonjour ! Comment puis-je vous aider concernant votre crédit ATB ?',
      intent: 'greeting',
      confidence: 1,
      source: 'rules',
    };
  }

  try {
    const nlp = await callNlpService(trimmed, context);
    if (nlp) return nlp;
  } catch (err) {
    console.warn('[chatbot] NLP service indisponible:', err.message);
  }

  return localRuleAnswer(trimmed, context);
}

module.exports = { handleChat, buildChatContext };
