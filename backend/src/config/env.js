const dotenv = require('dotenv');

dotenv.config();

const isProduction = process.env.NODE_ENV === 'production';

function requiredInProduction(name, value) {
  if (isProduction && (!value || String(value).trim() === '')) {
    throw new Error(`${name} est requis en production`);
  }
  return value;
}

const jwtSecret = process.env.JWT_SECRET || 'dev_secret';
const frontendOrigin = process.env.FRONTEND_ORIGIN || '*';
const autoSeedOnStart = (process.env.AUTO_SEED_ON_START || (isProduction ? 'false' : 'true')).toLowerCase() === 'true';

if (isProduction) {
  requiredInProduction('MYSQL_PASSWORD', process.env.MYSQL_PASSWORD);
  requiredInProduction('JWT_SECRET', process.env.JWT_SECRET);
  requiredInProduction('FRONTEND_ORIGIN', process.env.FRONTEND_ORIGIN);
  if (jwtSecret === 'dev_secret' || jwtSecret.length < 32) {
    throw new Error('JWT_SECRET doit etre robuste en production (32 caracteres minimum)');
  }
  if (frontendOrigin === '*') {
    throw new Error('FRONTEND_ORIGIN ne peut pas etre * en production');
  }
}

module.exports = {
  isProduction,
  port: Number(process.env.PORT || 4000),
  mysqlHost: process.env.MYSQL_HOST || '127.0.0.1',
  mysqlPort: Number(process.env.MYSQL_PORT || 3306),
  mysqlDatabase: process.env.MYSQL_DATABASE || 'credit_app',
  mysqlUser: process.env.MYSQL_USER || 'root',
  mysqlPassword: process.env.MYSQL_PASSWORD || '',
  jwtSecret,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  frontendOrigin,
  scoringMaxDebtRatio: Number(process.env.SCORING_MAX_DEBT_RATIO || 0.35),
  autoSeedOnStart,
  /** Mettre à true une fois pour ajouter les nouvelles colonnes (ALTER TABLE). */
  sequelizeAlter: (process.env.SEQUELIZE_ALTER || '').toLowerCase() === 'true',
  smtpHost: process.env.SMTP_HOST || '',
  smtpPort: Number(process.env.SMTP_PORT || 587),
  smtpUser: process.env.SMTP_USER || '',
  smtpPass: process.env.SMTP_PASS || '',
  smtpFrom: process.env.SMTP_FROM || 'no-reply@bank.local',
  otpExpiresMinutes: Number(process.env.OTP_EXPIRES_MINUTES || 10),
  expoPushEnabled: (process.env.EXPO_PUSH_ENABLED || 'false').toLowerCase() === 'true',
  nlpServiceUrl: process.env.NLP_SERVICE_URL || 'http://127.0.0.1:5001',
  nlpServiceTimeoutMs: Number(process.env.NLP_SERVICE_TIMEOUT_MS || 12000),
  geminiApiKey: process.env.GEMINI_API_KEY || '',
};
