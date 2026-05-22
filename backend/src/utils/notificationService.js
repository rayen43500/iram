const Notification = require('../models/Notification');
const NotificationDevice = require('../models/NotificationDevice');
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

module.exports = { createUserNotification };
