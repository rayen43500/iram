const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/sequelize');

const User = sequelize.define(
  'User',
  {
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    accountNumber: { type: DataTypes.STRING, allowNull: true, unique: true },
    cin: { type: DataTypes.STRING, allowNull: true, unique: true },
    firstName: { type: DataTypes.STRING, allowNull: true },
    lastName: { type: DataTypes.STRING, allowNull: true },
    fullName: { type: DataTypes.STRING, allowNull: false },
    email: { type: DataTypes.STRING, allowNull: false, unique: true },
    passwordHash: { type: DataTypes.STRING, allowNull: false },
    role: { type: DataTypes.ENUM('client', 'admin'), allowNull: false, defaultValue: 'client' },
    salary: { type: DataTypes.FLOAT, allowNull: false, defaultValue: 0 },
    balance: { type: DataTypes.FLOAT, allowNull: false, defaultValue: 0 },
    /** URL distante ou image en data URL (JPEG/PNG) */
    avatarUrl: { type: DataTypes.TEXT, allowNull: true, defaultValue: null },
    phone: { type: DataTypes.STRING, allowNull: true, defaultValue: null },
    city: { type: DataTypes.STRING, allowNull: true, defaultValue: null },
    profession: { type: DataTypes.STRING, allowNull: true, defaultValue: null },
    emailVerified: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    otpCode: { type: DataTypes.STRING, allowNull: true, defaultValue: null },
    otpExpiresAt: { type: DataTypes.DATE, allowNull: true, defaultValue: null },
    lastLoginAt: { type: DataTypes.DATE, allowNull: true, defaultValue: null },
  },
  {
    tableName: 'users',
    timestamps: true,
  }
);

module.exports = User;
