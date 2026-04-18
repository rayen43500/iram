const mysql = require('mysql2/promise');
const env = require('./env');
const { sequelize } = require('./sequelize');
const User = require('../models/User');
const CreditType = require('../models/CreditType');
const Loan = require('../models/Loan');
const CreditRequest = require('../models/CreditRequest');

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

async function connectDb({ forceSync = false } = {}) {
  initAssociations();
  await ensureDatabaseExists();
  await sequelize.authenticate();
  await sequelize.sync({ force: Boolean(forceSync) });
  console.log('MySQL connecte');
}

module.exports = {
  connectDb,
  sequelize,
};
