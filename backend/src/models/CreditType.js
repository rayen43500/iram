const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/sequelize');

const CreditType = sequelize.define(
  'CreditType',
  {
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    name: { type: DataTypes.STRING, allowNull: false, unique: true },
    slug: { type: DataTypes.STRING, allowNull: false, unique: true },
    description: { type: DataTypes.TEXT, allowNull: false },
    minAmount: { type: DataTypes.FLOAT, allowNull: false },
    maxAmount: { type: DataTypes.FLOAT, allowNull: false },
    minDurationMonths: { type: DataTypes.INTEGER, allowNull: false },
    maxDurationMonths: { type: DataTypes.INTEGER, allowNull: false },
    annualRate: { type: DataTypes.FLOAT, allowNull: false },
    requiredDocuments: { type: DataTypes.JSON, allowNull: false, defaultValue: [] },
    isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  },
  {
    tableName: 'credit_types',
    timestamps: true,
  }
);

module.exports = CreditType;
