const express = require('express');
const { chat } = require('../controllers/chatbotController');
const { authRequired } = require('../middlewares/auth');

const router = express.Router();

router.post('/', authRequired, chat);

module.exports = router;
