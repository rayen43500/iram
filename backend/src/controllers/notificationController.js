const Notification = require('../models/Notification');
const NotificationDevice = require('../models/NotificationDevice');

async function listNotifications(req, res) {
  const items = await Notification.findAll({
    where: { userId: req.user.id },
    order: [['createdAt', 'DESC']],
    limit: 200,
  });
  return res.json(items);
}

async function markRead(req, res) {
  const item = await Notification.findOne({ where: { id: req.params.id, userId: req.user.id } });
  if (!item) {
    return res.status(404).json({ message: 'Notification introuvable' });
  }
  await item.update({ isRead: true, readAt: new Date() });
  return res.json(item);
}

async function markAllRead(req, res) {
  await Notification.update({ isRead: true, readAt: new Date() }, { where: { userId: req.user.id, isRead: false } });
  return res.json({ message: 'Notifications marquees comme lues' });
}

async function registerPushToken(req, res) {
  const { expoPushToken, platform, deviceName } = req.body;
  if (!expoPushToken || !platform) {
    return res.status(400).json({ message: 'expoPushToken et platform sont requis' });
  }

  const existing = await NotificationDevice.findOne({ where: { expoPushToken } });
  if (existing) {
    await existing.update({ userId: req.user.id, platform, deviceName, lastSeenAt: new Date() });
    return res.json(existing);
  }

  const created = await NotificationDevice.create({
    userId: req.user.id,
    expoPushToken,
    platform,
    deviceName: deviceName || null,
    lastSeenAt: new Date(),
  });

  return res.status(201).json(created);
}

module.exports = {
  listNotifications,
  markRead,
  markAllRead,
  registerPushToken,
};
