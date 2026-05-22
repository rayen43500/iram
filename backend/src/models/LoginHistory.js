const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/sequelize');

const LoginHistory = sequelize.define(
  'LoginHistory',
  {
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    userId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    ip: { type: DataTypes.STRING, allowNull: true },
    userAgent: { type: DataTypes.TEXT, allowNull: true },
    deviceName: { type: DataTypes.STRING, allowNull: true },
    loggedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  },
  {
    tableName: 'login_history',
    timestamps: false,
  }
);

module.exports = LoginHistory;
