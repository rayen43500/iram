const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const env = require('../config/env');
const User = require('../models/User');
const Loan = require('../models/Loan');
const LoginHistory = require('../models/LoginHistory');
const { generateOtpCode } = require('../utils/otp');
const { sendEmail } = require('../utils/mailer');
const { createUserNotification } = require('../utils/notificationService');

function signToken(userId) {
  return jwt.sign({ sub: userId }, env.jwtSecret, { expiresIn: env.jwtExpiresIn });
}

function normalizeEmail(email) {
  return typeof email === 'string' ? email.trim().toLowerCase() : '';
}

async function checkEmail(req, res) {
  const normalizedEmail = normalizeEmail(req.body?.email);
  if (!normalizedEmail) {
    return res.status(400).json({ message: 'email est requis' });
  }
  const existingUser = await User.findOne({ where: { email: normalizedEmail } });
  return res.json({ exists: Boolean(existingUser) });
}

async function register(req, res) {
  const { accountNumber, cin, firstName, lastName, email, password, confirmPassword, salary = 0, accountType = 'particulier' } = req.body;
  const normalizedAccountNumber = typeof accountNumber === 'string' ? accountNumber.trim() : '';
  const normalizedCin = typeof cin === 'string' ? cin.trim() : '';
  const normalizedFirstName = typeof firstName === 'string' ? firstName.trim() : '';
  const normalizedLastName = typeof lastName === 'string' ? lastName.trim() : '';
  const normalizedEmail = normalizeEmail(email);
  const normalizedPassword = typeof password === 'string' ? password : '';
  const normalizedConfirm = typeof confirmPassword === 'string' ? confirmPassword : '';
  const normalizedSalary = Number(salary);
  const normalizedBalance = 0;

  if (!normalizedAccountNumber || !normalizedCin || !normalizedFirstName || !normalizedLastName || !normalizedEmail || !normalizedPassword || !normalizedConfirm) {
    return res.status(400).json({ message: 'accountNumber, cin, firstName, lastName, email, password et confirmPassword sont requis' });
  }

  if (!/^\d{6,30}$/.test(normalizedAccountNumber)) {
    return res.status(400).json({ message: 'Numero de compte invalide' });
  }

  if (!/^\d{8}$/.test(normalizedCin)) {
    return res.status(400).json({ message: 'CIN invalide' });
  }

  if (normalizedPassword.length < 8) {
    return res.status(400).json({ message: 'Le mot de passe doit contenir au moins 8 caracteres' });
  }

  if (normalizedPassword !== normalizedConfirm) {
    return res.status(400).json({ message: 'Confirmation mot de passe invalide' });
  }

  if (Number.isNaN(normalizedSalary) || normalizedSalary < 0) {
    return res.status(400).json({ message: 'salary doit etre une valeur positive' });
  }

  const existingUser = await User.findOne({ where: { email: normalizedEmail } });
  if (existingUser) {
    return res.status(409).json({ message: 'Email deja utilise' });
  }

  const existingAccount = await User.findOne({ where: { accountNumber: normalizedAccountNumber } });
  if (existingAccount) {
    return res.status(409).json({ message: 'Numero de compte deja utilise' });
  }

  const existingCin = await User.findOne({ where: { cin: normalizedCin } });
  if (existingCin) {
    return res.status(409).json({ message: 'CIN deja utilise' });
  }

  const passwordHash = await bcrypt.hash(normalizedPassword, 10);
  const user = await User.create({
    accountNumber: normalizedAccountNumber,
    cin: normalizedCin,
    firstName: normalizedFirstName,
    lastName: normalizedLastName,
    fullName: `${normalizedFirstName} ${normalizedLastName}`.trim(),
    email: normalizedEmail,
    passwordHash,
    salary: normalizedSalary,
    balance: normalizedBalance,
    role: 'client',
    accountType: accountType === 'professionnel' ? 'professionnel' : 'particulier',
    emailVerified: false,
  });

  const otp = generateOtpCode();
  const expiresAt = new Date(Date.now() + env.otpExpiresMinutes * 60 * 1000);
  await user.update({ otpCode: otp, otpExpiresAt: expiresAt });
  await sendEmail({
    to: user.email,
    subject: 'Code de verification email',
    text: `Votre code OTP est ${otp}. Il expire dans ${env.otpExpiresMinutes} minutes.`,
    html: `<p>Votre code OTP est <strong>${otp}</strong>. Il expire dans ${env.otpExpiresMinutes} minutes.</p>`,
  });

  const token = signToken(String(user.id));
  return res.status(201).json({
    token,
    user: {
      id: user.id,
      accountNumber: user.accountNumber,
      cin: user.cin,
      firstName: user.firstName,
      lastName: user.lastName,
      fullName: user.fullName,
      email: user.email,
      role: user.role,
      accountType: user.accountType,
      avatarUrl: user.avatarUrl,
      emailVerified: user.emailVerified,
    },
  });
}

async function login(req, res) {
  const { email, password, deviceName } = req.body;
  const normalizedEmail = normalizeEmail(email);
  const normalizedPassword = typeof password === 'string' ? password : '';

  if (!normalizedEmail || !normalizedPassword) {
    return res.status(400).json({ message: 'email et password sont requis' });
  }

  const user = await User.findOne({ where: { email: normalizedEmail } });
  if (!user) {
    return res.status(401).json({ message: 'Identifiants invalides' });
  }

  const ok = await bcrypt.compare(normalizedPassword, user.passwordHash);
  if (!ok) {
    return res.status(401).json({ message: 'Identifiants invalides' });
  }

  await LoginHistory.create({
    userId: user.id,
    ip: req.ip || null,
    userAgent: req.headers['user-agent'] || null,
    deviceName: deviceName ? String(deviceName).slice(0, 120) : null,
    loggedAt: new Date(),
  });
  await user.update({ lastLoginAt: new Date() });

  const activeLoans = await Loan.findAll({ where: { userId: user.id, status: 'active' } });
  const now = Date.now();
  const reminderThresholdMs = 28 * 24 * 60 * 60 * 1000;
  for (const loan of activeLoans) {
    const lastReminderAt = loan.lastReminderAt ? new Date(loan.lastReminderAt).getTime() : 0;
    if (now - lastReminderAt >= reminderThresholdMs) {
      try {
        await createUserNotification(user.id, {
          type: 'monthly_reminder',
          title: 'Rappel mensualite',
          message: 'N’oubliez pas de regler votre mensualite ce mois-ci.',
          data: { loanId: loan.id },
        });
        await loan.update({ lastReminderAt: new Date() });
      } catch (err) {
        console.warn('[login] rappel mensualite non envoye:', err.message);
      }
    }
  }

  const token = signToken(String(user.id));
  return res.json({
    token,
    user: {
      id: user.id,
      accountNumber: user.accountNumber,
      cin: user.cin,
      firstName: user.firstName,
      lastName: user.lastName,
      fullName: user.fullName,
      email: user.email,
      role: user.role,
      accountType: user.accountType,
      avatarUrl: user.avatarUrl,
      emailVerified: user.emailVerified,
    },
  });
}

async function me(req, res) {
  const user = await User.findByPk(req.user.id);
  if (!user) {
    return res.status(404).json({ message: 'Utilisateur introuvable' });
  }

  return res.json({
    id: user.id,
    accountNumber: user.accountNumber || null,
    cin: user.cin || null,
    firstName: user.firstName || null,
    lastName: user.lastName || null,
    fullName: user.fullName,
    email: user.email,
    role: user.role,
    accountType: user.accountType,
    salary: user.salary,
    balance: user.balance,
    avatarUrl: user.avatarUrl || null,
    phone: user.phone || null,
    city: user.city || null,
    profession: user.profession || null,
    emailVerified: Boolean(user.emailVerified),
    lastLoginAt: user.lastLoginAt || null,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  });
}

async function updateProfile(req, res) {
  const { fullName, avatarUrl, phone, city, profession, accountType } = req.body;
  const user = await User.findByPk(req.user.id);
  if (!user) {
    return res.status(404).json({ message: 'Utilisateur introuvable' });
  }

  const patches = {};

  if (accountType !== undefined) {
    if (['particulier', 'professionnel'].includes(accountType)) {
      patches.accountType = accountType;
    }
  }

  if (fullName !== undefined) {
    const n = typeof fullName === 'string' ? fullName.trim() : '';
    if (!n || n.length < 2) {
      return res.status(400).json({ message: 'Nom complet invalide.' });
    }
    patches.fullName = n;
  }

  if (avatarUrl !== undefined) {
    if (avatarUrl === null || avatarUrl === '') {
      patches.avatarUrl = null;
    } else if (typeof avatarUrl !== 'string') {
      return res.status(400).json({ message: 'Format avatar invalide.' });
    } else {
      const a = avatarUrl.trim();
      if (a.length > 550000 || (!a.startsWith('http') && !a.startsWith('data:image/'))) {
        return res.status(400).json({ message: 'Image ou URL de photo invalide.' });
      }
      patches.avatarUrl = a;
    }
  }

  if (phone !== undefined) {
    const p = typeof phone === 'string' ? phone.trim() : '';
    if (p && p.replace(/\D/g, '').length < 8) {
      return res.status(400).json({ message: 'Numero de telephone invalide.' });
    }
    patches.phone = p || null;
  }

  if (city !== undefined) {
    const c = typeof city === 'string' ? city.trim() : '';
    if (c && c.length < 2) {
      return res.status(400).json({ message: 'Ville invalide.' });
    }
    patches.city = c || null;
  }

  if (profession !== undefined) {
    const pr = typeof profession === 'string' ? profession.trim() : '';
    if (pr && pr.length < 2) {
      return res.status(400).json({ message: 'Profession invalide.' });
    }
    patches.profession = pr || null;
  }

  if (Object.keys(patches).length === 0) {
    return res.status(400).json({ message: 'Aucune modification envoyee.' });
  }

  await user.update(patches);
  await user.reload();

  return res.json({
    id: user.id,
    fullName: user.fullName,
    email: user.email,
    role: user.role,
    accountType: user.accountType,
    salary: user.salary,
    balance: user.balance,
    avatarUrl: user.avatarUrl || null,
    phone: user.phone || null,
    city: user.city || null,
    profession: user.profession || null,
    emailVerified: Boolean(user.emailVerified),
    updatedAt: user.updatedAt,
  });
}

module.exports = {
  checkEmail,
  register,
  login,
  me,
  updateProfile,
};
