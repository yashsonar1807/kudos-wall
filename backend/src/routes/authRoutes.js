const express = require('express');
const authController = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');
const {
  validateSignup,
  validateLogin,
  validateVerifyEmail,
} = require('../middleware/validationMiddleware');

const router = express.Router();

// Public Auth Endpoints
router.post('/signup', validateSignup, authController.signup);
router.post('/verify-email', validateVerifyEmail, authController.verifyEmail);
router.post('/resend-verification', authController.resendVerification);
router.post('/login', validateLogin, authController.login);
router.post('/logout', authController.logout);
router.post('/refresh', authController.refreshToken);

// Protected Auth Endpoints
router.get('/me', protect, authController.getCurrentUser);

module.exports = router;
