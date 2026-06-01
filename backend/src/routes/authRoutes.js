const express = require('express');
const { checkEmail, register, login, me, updateProfile } = require('../controllers/authController');
const { requestEmailOtp, requestEmailOtpPublic, verifyEmailOtp, verifyEmailOtpPublic, changePassword, listLoginHistory } = require('../controllers/securityController');
const { authRequired } = require('../middlewares/auth');

const router = express.Router();

router.post('/register', register);
router.post('/check-email', checkEmail);
router.post('/login', login);
router.get('/me', authRequired, me);
router.patch('/profile', authRequired, updateProfile);
router.post('/request-otp', authRequired, requestEmailOtp);
router.post('/verify-otp', authRequired, verifyEmailOtp);
router.post('/request-otp-public', requestEmailOtpPublic);
router.post('/verify-otp-public', verifyEmailOtpPublic);
router.post('/change-password', authRequired, changePassword);
router.get('/login-history', authRequired, listLoginHistory);

module.exports = router;
