const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/sequelize');

const NotificationDevice = sequelize.define(
  'NotificationDevice',
  {
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    userId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    expoPushToken: { type: DataTypes.STRING, allowNull: false, unique: true },
    platform: { type: DataTypes.STRING, allowNull: false },
    deviceName: { type: DataTypes.STRING, allowNull: true },
    lastSeenAt: { type: DataTypes.DATE, allowNull: true, defaultValue: null },
  },
  {
    tableName: 'notification_devices',
    timestamps: true,
  }
);

module.exports = NotificationDevice;
