const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const env = require('../config/env');
const User = require('../models/User');

function signToken(userId) {
  return jwt.sign({ sub: userId }, env.jwtSecret, { expiresIn: env.jwtExpiresIn });
}

function normalizeEmail(email) {
  return typeof email === 'string' ? email.trim().toLowerCase() : '';
}

async function register(req, res) {
  const { fullName, email, password, salary = 0, balance = 0 } = req.body;
  const normalizedEmail = normalizeEmail(email);
  const normalizedName = typeof fullName === 'string' ? fullName.trim() : '';
  const normalizedPassword = typeof password === 'string' ? password : '';
  const normalizedSalary = Number(salary);
  const normalizedBalance = Number(balance);

  if (!normalizedName || !normalizedEmail || !normalizedPassword) {
    return res.status(400).json({ message: 'fullName, email et password sont requis' });
  }

  if (normalizedPassword.length < 8) {
    return res.status(400).json({ message: 'Le mot de passe doit contenir au moins 8 caracteres' });
  }

  if (Number.isNaN(normalizedSalary) || Number.isNaN(normalizedBalance) || normalizedSalary < 0 || normalizedBalance < 0) {
    return res.status(400).json({ message: 'salary et balance doivent etre des valeurs positives' });
  }

  const exists = await User.findOne({ email: normalizedEmail });
  if (exists) {
    return res.status(409).json({ message: 'Email deja utilise' });
  }

  const passwordHash = await bcrypt.hash(normalizedPassword, 10);
  const user = await User.create({
    fullName: normalizedName,
    email: normalizedEmail,
    passwordHash,
    salary: normalizedSalary,
    balance: normalizedBalance,
    role: 'client',
  });

  const token = signToken(user._id.toString());
  return res.status(201).json({ token, user: { id: user._id, fullName: user.fullName, email: user.email, role: user.role } });
}

async function login(req, res) {
  const { email, password } = req.body;
  const normalizedEmail = normalizeEmail(email);
  const normalizedPassword = typeof password === 'string' ? password : '';

  if (!normalizedEmail || !normalizedPassword) {
    return res.status(400).json({ message: 'email et password sont requis' });
  }

  const user = await User.findOne({ email: normalizedEmail });
  if (!user) {
    return res.status(401).json({ message: 'Identifiants invalides' });
  }

  const ok = await bcrypt.compare(normalizedPassword, user.passwordHash);
  if (!ok) {
    return res.status(401).json({ message: 'Identifiants invalides' });
  }

  const token = signToken(user._id.toString());
  return res.json({ token, user: { id: user._id, fullName: user.fullName, email: user.email, role: user.role } });
}

async function me(req, res) {
  const user = await User.findById(req.user._id).select('-passwordHash').lean();
  return res.json(user);
}

module.exports = {
  register,
  login,
  me,
};
