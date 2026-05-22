const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/sequelize');

const UserDocument = sequelize.define(
  'UserDocument',
  {
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    userId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    type: {
      type: DataTypes.ENUM('cin', 'payslip', 'selfie', 'other'),
      allowNull: false,
      defaultValue: 'other',
    },
    fileName: { type: DataTypes.STRING, allowNull: false },
    mimeType: { type: DataTypes.STRING, allowNull: false },
    dataUrl: { type: DataTypes.TEXT, allowNull: false },
    status: {
      type: DataTypes.ENUM('pending', 'approved', 'rejected'),
      allowNull: false,
      defaultValue: 'pending',
    },
  },
  {
    tableName: 'user_documents',
    timestamps: true,
  }
);

module.exports = UserDocument;
