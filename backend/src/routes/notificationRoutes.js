const express = require('express');
const { authRequired } = require('../middlewares/auth');
const { listNotifications, markRead, markAllRead, registerPushToken } = require('../controllers/notificationController');

const router = express.Router();

router.get('/', authRequired, listNotifications);
router.patch('/read-all', authRequired, markAllRead);
router.patch('/:id/read', authRequired, markRead);
router.post('/push-token', authRequired, registerPushToken);

module.exports = router;
