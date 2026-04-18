const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/sequelize');

const CreditRequest = sequelize.define(
  'CreditRequest',
  {
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    userId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    creditTypeId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    requestedAmount: { type: DataTypes.FLOAT, allowNull: false },
    requestedDurationMonths: { type: DataTypes.INTEGER, allowNull: false },
    salaryAtRequest: { type: DataTypes.FLOAT, allowNull: false },
    estimatedMonthlyPayment: { type: DataTypes.FLOAT, allowNull: false },
    estimatedTotalCost: { type: DataTypes.FLOAT, allowNull: false },
    debtRatio: { type: DataTypes.FLOAT, allowNull: false },
    acceptanceProbability: { type: DataTypes.FLOAT, allowNull: false },
    status: {
      type: DataTypes.ENUM('pending', 'accepted', 'rejected'),
      allowNull: false,
      defaultValue: 'pending',
    },
    adminComment: { type: DataTypes.TEXT, allowNull: false, defaultValue: '' },
  },
  {
    tableName: 'credit_requests',
    timestamps: true,
  }
);

module.exports = CreditRequest;
