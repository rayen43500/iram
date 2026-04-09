const express = require('express');
const { getDashboard, listCreditTypes, getCreditTypeBySlug } = require('../controllers/creditController');
const { authRequired } = require('../middlewares/auth');

const router = express.Router();

router.get('/dashboard', authRequired, getDashboard);
router.get('/types', authRequired, listCreditTypes);
router.get('/types/:slug', authRequired, getCreditTypeBySlug);

module.exports = router;
