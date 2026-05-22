const dotenv = require('dotenv');

dotenv.config();

module.exports = {
  port: Number(process.env.PORT || 4000),
  mysqlHost: process.env.MYSQL_HOST || '127.0.0.1',
  mysqlPort: Number(process.env.MYSQL_PORT || 3306),
  mysqlDatabase: process.env.MYSQL_DATABASE || 'credit_app',
  mysqlUser: process.env.MYSQL_USER || 'root',
  mysqlPassword: process.env.MYSQL_PASSWORD || '',
  jwtSecret: process.env.JWT_SECRET || 'dev_secret',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  frontendOrigin: process.env.FRONTEND_ORIGIN || '*',
  scoringMaxDebtRatio: Number(process.env.SCORING_MAX_DEBT_RATIO || 0.35),
  autoSeedOnStart: (process.env.AUTO_SEED_ON_START || 'true').toLowerCase() === 'true',
  /** Mettre à true une fois pour ajouter les nouvelles colonnes (ALTER TABLE). */
  sequelizeAlter: (process.env.SEQUELIZE_ALTER || '').toLowerCase() === 'true',
  smtpHost: process.env.SMTP_HOST || '',
  smtpPort: Number(process.env.SMTP_PORT || 587),
  smtpUser: process.env.SMTP_USER || '',
  smtpPass: process.env.SMTP_PASS || '',
  smtpFrom: process.env.SMTP_FROM || 'no-reply@bank.local',
  otpExpiresMinutes: Number(process.env.OTP_EXPIRES_MINUTES || 10),
  expoPushEnabled: (process.env.EXPO_PUSH_ENABLED || 'false').toLowerCase() === 'true',
};
