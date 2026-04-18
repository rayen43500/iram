const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/sequelize');

const Loan = sequelize.define(
  'Loan',
  {
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    userId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    creditTypeId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    amount: { type: DataTypes.FLOAT, allowNull: false },
    durationMonths: { type: DataTypes.INTEGER, allowNull: false },
    annualRate: { type: DataTypes.FLOAT, allowNull: false },
    monthlyPayment: { type: DataTypes.FLOAT, allowNull: false },
    remainingInstallments: { type: DataTypes.INTEGER, allowNull: false },
    status: {
      type: DataTypes.ENUM('active', 'paid', 'late'),
      allowNull: false,
      defaultValue: 'active',
    },
  },
  {
    tableName: 'loans',
    timestamps: true,
  }
);

module.exports = Loan;
