const express = require('express');
const { listAllRequests, listUserDocuments, listUsers, updateUserRole, updateRequestStatus, createCreditType, analyticsSummary, updateCreditType } = require('../controllers/adminController');
const { authRequired, adminRequired } = require('../middlewares/auth');

const router = express.Router();

router.get('/requests', authRequired, adminRequired, listAllRequests);
router.get('/users/:userId/documents', authRequired, adminRequired, listUserDocuments);
router.get('/users', authRequired, adminRequired, listUsers);
router.get('/analytics/summary', authRequired, adminRequired, analyticsSummary);
router.patch('/requests/:id/status', authRequired, adminRequired, updateRequestStatus);
router.patch('/users/:id/role', authRequired, adminRequired, updateUserRole);
router.post('/credit-types', authRequired, adminRequired, createCreditType);
router.patch('/credit-types/:id', authRequired, adminRequired, updateCreditType);

module.exports = router;
