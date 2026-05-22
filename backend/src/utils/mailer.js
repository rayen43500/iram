const nodemailer = require('nodemailer');
const env = require('../config/env');

let cachedTransport = null;

function getTransport() {
  if (cachedTransport) return cachedTransport;
  if (!env.smtpHost || !env.smtpUser || !env.smtpPass) {
    return null;
  }
  cachedTransport = nodemailer.createTransport({
    host: env.smtpHost,
    port: env.smtpPort,
    secure: env.smtpPort === 465,
    auth: { user: env.smtpUser, pass: env.smtpPass },
  });
  return cachedTransport;
}

async function sendEmail({ to, subject, html, text }) {
  const transport = getTransport();
  if (!transport) {
    console.log('[MAILER] SMTP non configure. Email simule:', { to, subject, text });
    return { simulated: true };
  }
  return transport.sendMail({ from: env.smtpFrom, to, subject, html, text });
}

module.exports = { sendEmail };
