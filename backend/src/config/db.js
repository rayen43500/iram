const mysql = require('mysql2/promise');
const env = require('./env');
const { sequelize } = require('./sequelize');
const User = require('../models/User');
const CreditType = require('../models/CreditType');
const Loan = require('../models/Loan');
const CreditRequest = require('../models/CreditRequest');
const Notification = require('../models/Notification');
const NotificationDevice = require('../models/NotificationDevice');
const LoginHistory = require('../models/LoginHistory');
const SavedSimulation = require('../models/SavedSimulation');
const UserDocument = require('../models/UserDocument');

let associationsInitialized = false;

function initAssociations() {
  if (associationsInitialized) {
    return;
  }

  User.hasMany(Loan, { foreignKey: 'userId' });
  Loan.belongsTo(User, { foreignKey: 'userId' });

  CreditType.hasMany(Loan, { foreignKey: 'creditTypeId' });
  Loan.belongsTo(CreditType, { foreignKey: 'creditTypeId' });

  User.hasMany(CreditRequest, { foreignKey: 'userId' });
  CreditRequest.belongsTo(User, { foreignKey: 'userId' });

  CreditType.hasMany(CreditRequest, { foreignKey: 'creditTypeId' });
  CreditRequest.belongsTo(CreditType, { foreignKey: 'creditTypeId' });

  User.hasMany(Notification, { foreignKey: 'userId' });
  Notification.belongsTo(User, { foreignKey: 'userId' });

  User.hasMany(NotificationDevice, { foreignKey: 'userId' });
  NotificationDevice.belongsTo(User, { foreignKey: 'userId' });

  User.hasMany(LoginHistory, { foreignKey: 'userId' });
  LoginHistory.belongsTo(User, { foreignKey: 'userId' });

  User.hasMany(SavedSimulation, { foreignKey: 'userId' });
  SavedSimulation.belongsTo(User, { foreignKey: 'userId' });

  CreditType.hasMany(SavedSimulation, { foreignKey: 'creditTypeId' });
  SavedSimulation.belongsTo(CreditType, { foreignKey: 'creditTypeId' });

  User.hasMany(UserDocument, { foreignKey: 'userId' });
  UserDocument.belongsTo(User, { foreignKey: 'userId' });

  associationsInitialized = true;
}

async function ensureDatabaseExists() {
  const adminConnection = await mysql.createConnection({
    host: env.mysqlHost,
    port: env.mysqlPort,
    user: env.mysqlUser,
    password: env.mysqlPassword,
  });

  try {
    const safeDatabaseName = String(env.mysqlDatabase || 'credit_app').replace(/`/g, '``');
    await adminConnection.query(
      `CREATE DATABASE IF NOT EXISTS \`${safeDatabaseName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
    );
  } finally {
    await adminConnection.end();
  }
}

/**
 * Anciennes bases sans migration manuelle : ajoute credit_requests.applicationForm si absente.
 */
async function ensureCreditRequestApplicationFormColumn() {
  const dialect = sequelize.getDialect();
  if (!['mysql', 'mariadb'].includes(dialect)) {
    return;
  }
  const [rows] = await sequelize.query(
    `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
     WHERE TABLE_SCHEMA = DATABASE()
     AND TABLE_NAME = 'credit_requests'
     AND COLUMN_NAME = 'applicationForm'
     LIMIT 1`
  );
  if (rows && rows.length > 0) {
    return;
  }
  await sequelize.query(
    'ALTER TABLE `credit_requests` ADD COLUMN `applicationForm` JSON NULL'
  );
  console.log('Schema: colonne credit_requests.applicationForm ajoutee automatiquement.');
}

async function ensureUserAvatarUrlColumn() {
  const dialect = sequelize.getDialect();
  if (!['mysql', 'mariadb'].includes(dialect)) {
    return;
  }
  const [rows] = await sequelize.query(
    `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
     WHERE TABLE_SCHEMA = DATABASE()
     AND TABLE_NAME = 'users'
     AND COLUMN_NAME = 'avatarUrl'
     LIMIT 1`
  );
  if (rows && rows.length > 0) {
    return;
  }
  await sequelize.query(
    'ALTER TABLE `users` ADD COLUMN `avatarUrl` TEXT NULL'
  );
  console.log('Schema: colonne users.avatarUrl ajoutee automatiquement.');
}

async function ensureColumn(tableName, columnName, ddlSql) {
  const dialect = sequelize.getDialect();
  if (!['mysql', 'mariadb'].includes(dialect)) {
    return;
  }
  const [rows] = await sequelize.query(
    `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
     WHERE TABLE_SCHEMA = DATABASE()
     AND TABLE_NAME = '${tableName}'
     AND COLUMN_NAME = '${columnName}'
     LIMIT 1`
  );
  if (rows && rows.length > 0) {
    return;
  }
  await sequelize.query(ddlSql);
  console.log(`Schema: colonne ${tableName}.${columnName} ajoutee automatiquement.`);
}

async function ensureUserSecurityColumns() {
  await ensureColumn('users', 'emailVerified', 'ALTER TABLE `users` ADD COLUMN `emailVerified` TINYINT(1) NOT NULL DEFAULT 0');
  await ensureColumn('users', 'otpCode', 'ALTER TABLE `users` ADD COLUMN `otpCode` VARCHAR(10) NULL');
  await ensureColumn('users', 'otpExpiresAt', 'ALTER TABLE `users` ADD COLUMN `otpExpiresAt` DATETIME NULL');
  await ensureColumn('users', 'phone', 'ALTER TABLE `users` ADD COLUMN `phone` VARCHAR(64) NULL');
  await ensureColumn('users', 'city', 'ALTER TABLE `users` ADD COLUMN `city` VARCHAR(140) NULL');
  await ensureColumn('users', 'profession', 'ALTER TABLE `users` ADD COLUMN `profession` VARCHAR(140) NULL');
  await ensureColumn('users', 'lastLoginAt', 'ALTER TABLE `users` ADD COLUMN `lastLoginAt` DATETIME NULL');
}

async function ensureLoanReminderColumn() {
  await ensureColumn('loans', 'lastReminderAt', 'ALTER TABLE `loans` ADD COLUMN `lastReminderAt` DATETIME NULL');
}

async function connectDb({ forceSync = false } = {}) {
  initAssociations();
  await ensureDatabaseExists();
  await sequelize.authenticate();
  await sequelize.sync({
    force: Boolean(forceSync),
    alter: Boolean(env.sequelizeAlter) && !forceSync,
  });
  await ensureCreditRequestApplicationFormColumn();
  await ensureUserAvatarUrlColumn();
  await ensureUserSecurityColumns();
  await ensureLoanReminderColumn();
  console.log('MySQL connecte');
}

module.exports = {
  connectDb,
  sequelize,
};
