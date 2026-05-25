const Notification = require('../models/Notification');
const NotificationDevice = require('../models/NotificationDevice');
const User = require('../models/User');
const { sendExpoPushNotification } = require('./push');

async function createUserNotification(userId, { type = 'system', title, message, data = null }) {
  const notification = await Notification.create({
    userId,
    type,
    title,
    message,
    data,
  });

  const devices = await NotificationDevice.findAll({ where: { userId } });
  const tokens = devices.map((d) => d.expoPushToken).filter(Boolean);
  if (tokens.length > 0) {
    await sendExpoPushNotification(tokens, { title, body: message, data });
  }

  return notification;
}

async function createRoleNotification(role, payload) {
  const users = await User.findAll({ where: { role }, attributes: ['id'] });
  if (!users.length) return [];
  const tasks = users.map((u) => createUserNotification(u.id, payload));
  return Promise.all(tasks);
}

module.exports = { createUserNotification, createRoleNotification };
