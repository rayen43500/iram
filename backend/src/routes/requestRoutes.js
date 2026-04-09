const express = require('express');
const { createRequest, listMyRequests } = require('../controllers/requestController');
const { authRequired } = require('../middlewares/auth');

const router = express.Router();

router.post('/', authRequired, createRequest);
router.get('/mine', authRequired, listMyRequests);

module.exports = router;
