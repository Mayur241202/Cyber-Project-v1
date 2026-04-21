// routes/auth.js
const express = require('express');
const router = express.Router();
const { register, secureLogin, insecureLogin, refreshToken, logout, getMe } = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const { loginLimiter, registerLimiter } = require('../middleware/rateLimiter');
const { registerValidator, loginValidator } = require('../middleware/validators');

// ✅ Secure routes
router.post('/register', registerLimiter, registerValidator, register);
router.post('/login', loginLimiter, loginValidator, secureLogin);
router.post('/refresh', refreshToken);
router.post('/logout', protect, logout);
router.get('/me', protect, getMe);

// ⚠️ INSECURE route - DEMO ONLY
router.post('/insecure-login', insecureLogin);

module.exports = router;
