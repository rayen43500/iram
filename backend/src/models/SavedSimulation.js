const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/sequelize');

const SavedSimulation = sequelize.define(
  'SavedSimulation',
  {
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    userId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    creditTypeId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    label: { type: DataTypes.STRING, allowNull: false, defaultValue: '' },
    amount: { type: DataTypes.FLOAT, allowNull: false },
    durationMonths: { type: DataTypes.INTEGER, allowNull: false },
    annualRate: { type: DataTypes.FLOAT, allowNull: false },
    monthlyPayment: { type: DataTypes.FLOAT, allowNull: false },
    totalCost: { type: DataTypes.FLOAT, allowNull: false },
    debtRatio: { type: DataTypes.FLOAT, allowNull: false },
    acceptanceProbability: { type: DataTypes.FLOAT, allowNull: false },
  },
  {
    tableName: 'saved_simulations',
    timestamps: true,
  }
);

module.exports = SavedSimulation;
