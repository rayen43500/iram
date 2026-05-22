const fetch = require('node-fetch');
const env = require('../config/env');

async function sendExpoPushNotification(tokens, { title, body, data }) {
  if (!env.expoPushEnabled || !Array.isArray(tokens) || tokens.length === 0) {
    return { skipped: true };
  }
  const payload = tokens.map((to) => ({ to, title, body, data }));
  const response = await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const json = await response.json();
  return json;
}

module.exports = { sendExpoPushNotification };
