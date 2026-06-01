const bcrypt = require('bcryptjs');
const env = require('../config/env');
const User = require('../models/User');
const LoginHistory = require('../models/LoginHistory');
const { generateOtpCode, isOtpValid } = require('../utils/otp');
const { sendEmail } = require('../utils/mailer');

async function requestEmailOtp(req, res) {
  const user = await User.findByPk(req.user.id);
  if (!user) {
    return res.status(404).json({ message: 'Utilisateur introuvable' });
  }

  const otp = generateOtpCode();
  const expiresAt = new Date(Date.now() + env.otpExpiresMinutes * 60 * 1000);

  await user.update({ otpCode: otp, otpExpiresAt: expiresAt, emailVerified: false });

  await sendEmail({
    to: user.email,
    subject: 'Code de verification email',
    text: `Votre code OTP est ${otp}. Il expire dans ${env.otpExpiresMinutes} minutes.`,
    html: `<p>Votre code OTP est <strong>${otp}</strong>. Il expire dans ${env.otpExpiresMinutes} minutes.</p>`,
  });

  return res.json({ message: 'Code OTP envoye' });
}

async function requestEmailOtpPublic(req, res) {
  const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
  if (!email) {
    return res.status(400).json({ message: 'email est requis' });
  }

  const user = await User.findOne({ where: { email } });
  if (!user) {
    return res.status(404).json({ message: 'Email introuvable' });
  }

  const otp = generateOtpCode();
  const expiresAt = new Date(Date.now() + env.otpExpiresMinutes * 60 * 1000);
  await user.update({ otpCode: otp, otpExpiresAt: expiresAt, emailVerified: false });

  await sendEmail({
    to: user.email,
    subject: 'Code de verification email',
    text: `Votre code OTP est ${otp}. Il expire dans ${env.otpExpiresMinutes} minutes.`,
    html: `<p>Votre code OTP est <strong>${otp}</strong>. Il expire dans ${env.otpExpiresMinutes} minutes.</p>`,
  });

  return res.json({ message: 'Code OTP envoye' });
}

async function verifyEmailOtp(req, res) {
  const { code } = req.body;
  const user = await User.findByPk(req.user.id);
  if (!user) {
    return res.status(404).json({ message: 'Utilisateur introuvable' });
  }

  if (!code || !isOtpValid(user, code)) {
    return res.status(400).json({ message: 'Code OTP invalide ou expire' });
  }

  await user.update({ emailVerified: true, otpCode: null, otpExpiresAt: null });
  return res.json({ message: 'Email verifie', emailVerified: true });
}

async function verifyEmailOtpPublic(req, res) {
  const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
  const code = req.body?.code;
  if (!email || !code) {
    return res.status(400).json({ message: 'email et code sont requis' });
  }

  const user = await User.findOne({ where: { email } });
  if (!user) {
    return res.status(404).json({ message: 'Email introuvable' });
  }

  if (!isOtpValid(user, code)) {
    return res.status(400).json({ message: 'Code OTP invalide ou expire' });
  }

  await user.update({ emailVerified: true, otpCode: null, otpExpiresAt: null });
  return res.json({ message: 'Email verifie', emailVerified: true });
}

async function changePassword(req, res) {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ message: 'currentPassword et newPassword sont requis' });
  }
  if (String(newPassword).length < 8) {
    return res.status(400).json({ message: 'Le mot de passe doit contenir au moins 8 caracteres' });
  }

  const user = await User.findByPk(req.user.id);
  if (!user) {
    return res.status(404).json({ message: 'Utilisateur introuvable' });
  }

  const ok = await bcrypt.compare(String(currentPassword), user.passwordHash);
  if (!ok) {
    return res.status(401).json({ message: 'Mot de passe actuel incorrect' });
  }

  const passwordHash = await bcrypt.hash(String(newPassword), 10);
  await user.update({ passwordHash });

  return res.json({ message: 'Mot de passe mis a jour' });
}

async function listLoginHistory(req, res) {
  const items = await LoginHistory.findAll({
    where: { userId: req.user.id },
    order: [['loggedAt', 'DESC']],
    limit: 50,
  });
  return res.json(items);
}

module.exports = {
  requestEmailOtp,
  requestEmailOtpPublic,
  verifyEmailOtp,
  verifyEmailOtpPublic,
  changePassword,
  listLoginHistory,
};
