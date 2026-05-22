const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/sequelize');

const Notification = sequelize.define(
  'Notification',
  {
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    userId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    type: {
      type: DataTypes.ENUM('request_status', 'monthly_reminder', 'offer', 'system'),
      allowNull: false,
      defaultValue: 'system',
    },
    title: { type: DataTypes.STRING, allowNull: false },
    message: { type: DataTypes.TEXT, allowNull: false },
    data: { type: DataTypes.JSON, allowNull: true, defaultValue: null },
    isRead: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    readAt: { type: DataTypes.DATE, allowNull: true, defaultValue: null },
  },
  {
    tableName: 'notifications',
    timestamps: true,
  }
);

module.exports = Notification;
