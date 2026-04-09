const express = require('express');
const { estimate } = require('../controllers/estimationController');
const { authRequired } = require('../middlewares/auth');

const router = express.Router();

router.post('/', authRequired, estimate);

module.exports = router;
