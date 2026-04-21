// controllers/authController.js
// Demonstrates: INSECURE login (for demo) vs SECURE login (production)

const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const User = require('../models/User');
const { logger, logSuspiciousActivity } = require('../utils/logger');
const axios = require('axios');

// ─── HELPER: Generate tokens ─────────────────────────────────────────────────
const generateTokens = (userId) => {
  const accessToken = jwt.sign(
    { id: userId },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE || '15m', algorithm: 'HS256' }
  );
  const refreshToken = jwt.sign(
    { id: userId },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: '7d', algorithm: 'HS256' }
  );
  return { accessToken, refreshToken };
};

const sendTokenResponse = (user, statusCode, res) => {
  const { accessToken, refreshToken } = generateTokens(user._id);

  // Store refresh token hashed in DB
  user.refreshToken = refreshToken;
  user.save({ validateBeforeSave: false });

  const cookieOptions = {
    expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    httpOnly: true,         // Prevents JS access
    secure: process.env.NODE_ENV === 'production', // HTTPS only in prod
    sameSite: 'strict',     // CSRF protection
  };

  res
    .status(statusCode)
    .cookie('refreshToken', refreshToken, cookieOptions)
    .json({
      success: true,
      accessToken,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
};

// ─────────────────────────────────────────────────────────────────────────────
// ⚠️  INSECURE LOGIN (DEMO ONLY - DO NOT USE IN PRODUCTION)
// Vulnerable to: NoSQL Injection, Brute Force, Information Disclosure
// ─────────────────────────────────────────────────────────────────────────────
exports.insecureLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    // ❌ VULNERABILITY 1: No input validation
    // ❌ VULNERABILITY 2: Direct MongoDB query with user input (NoSQL Injection)
    //    Attack: { "email": { "$gt": "" }, "password": { "$gt": "" } }
    //    This matches ANY user because "" < any string in MongoDB!
    const user = await User.findOne({ email: email, password: password });

    if (!user) {
      // ❌ VULNERABILITY 3: Reveals whether email exists (information disclosure)
      const emailExists = await User.findOne({ email });
      if (!emailExists) {
        return res.status(401).json({ error: 'Email not found in system' });
      }
      return res.status(401).json({ error: 'Wrong password' });
    }

    // ❌ VULNERABILITY 4: No rate limiting check, no lockout
    // ❌ VULNERABILITY 5: Password stored/compared in plaintext (demo)
    // ❌ VULNERABILITY 6: JWT secret hardcoded
    const token = jwt.sign({ id: user._id }, 'hardcoded_weak_secret_123');

    logger.warn('INSECURE LOGIN USED', { email, ip: req.ip });

    res.json({ success: true, token, message: '⚠️ INSECURE LOGIN - Demo only!' });
  } catch (error) {
    // ❌ VULNERABILITY 7: Leaks stack trace to client
    res.status(500).json({ error: error.message, stack: error.stack });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// ✅  SECURE REGISTER
// ─────────────────────────────────────────────────────────────────────────────
exports.register = async (req, res) => {
  try {
    // ✅ 1. Validate input (see validators)
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, email, password } = req.body;

    // ✅ 2. Check if user exists with generic message
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      // Generic message - doesn't reveal if email exists
      return res.status(400).json({ error: 'Registration failed. Please try different credentials.' });
    }

    // ✅ 3. Password is hashed in pre-save hook (bcrypt, 12 rounds)
    const user = await User.create({ name, email, password, role: 'user' });

    logger.info('New user registered', { userId: user._id, email: user.email });
    sendTokenResponse(user, 201, res);
  } catch (error) {
    logger.error('Register error:', { error: error.message });
    // ✅ 4. Generic error - no stack trace
    res.status(500).json({ error: 'Registration failed. Please try again.' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// ✅  SECURE LOGIN
// ─────────────────────────────────────────────────────────────────────────────
exports.secureLogin = async (req, res) => {
  try {
    // ✅ 1. Express-validator checks (see authValidators.js)
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      logSuspiciousActivity('INVALID_INPUT', { ip: req.ip, errors: errors.array() });
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    // ✅ 2. Fetch user with password (explicitly selected)
    // Mongoose sanitization already stripped any $ operators via express-mongo-sanitize
    const user = await User.findOne({ email: email.toLowerCase() }).select('+password +failedLoginAttempts +lockUntil +isLocked');

    // ✅ 3. Check account lockout BEFORE password comparison
    if (user && user.isLockedOut) {
      const minutesLeft = Math.ceil((user.lockUntil - Date.now()) / 60000);
      logSuspiciousActivity('BRUTE_FORCE', { email, ip: req.ip, minutesLeft });
      return res.status(429).json({
        error: `Account locked due to multiple failed attempts. Try again in ${minutesLeft} minutes.`,
      });
    }

    // ✅ 4. Use bcrypt.compare (timing-safe comparison)
    const isPasswordValid = user ? await user.comparePassword(password) : false;

    // ✅ 5. Generic error message (no information disclosure)
    if (!user || !isPasswordValid) {
      if (user) {
        await user.incLoginAttempts();
        const remaining = 5 - (user.failedLoginAttempts + 1);
        if (remaining <= 2) {
          logSuspiciousActivity('MULTIPLE_FAILED_LOGINS', {
            email, ip: req.ip,
            attempts: user.failedLoginAttempts + 1,
          });
        }
      }
      return res.status(401).json({ error: 'Invalid credentials.' });
    }

    // ✅ 6. Check account active
    if (!user.isActive) {
      return res.status(403).json({ error: 'Account has been deactivated.' });
    }

    // ✅ 7. Reset failed attempts on success
    await user.resetLoginAttempts();

    // ✅ 8. Log login history for ML anomaly detection
    user.loginHistory.push({
      timestamp: new Date(),
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      success: true,
    });
    user.lastLoginIP = req.ip;
    await user.save({ validateBeforeSave: false });

    // ✅ 9. Notify ML service about login event
    try {
      await axios.post(`${process.env.ML_SERVICE_URL}/api/log-login`, {
        userId: user._id.toString(),
        ip: req.ip,
        userAgent: req.headers['user-agent'],
        timestamp: new Date().toISOString(),
      }, { timeout: 2000 }); // Don't block login if ML is slow
    } catch (mlError) {
      logger.warn('ML service unreachable', { error: mlError.message });
    }

    logger.info('Successful login', { userId: user._id, email: user.email, ip: req.ip });
    sendTokenResponse(user, 200, res);
  } catch (error) {
    logger.error('Login error:', { error: error.message });
    res.status(500).json({ error: 'Login failed. Please try again.' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// ✅  REFRESH TOKEN
// ─────────────────────────────────────────────────────────────────────────────
exports.refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.cookies;
    if (!refreshToken) {
      return res.status(401).json({ error: 'No refresh token provided.' });
    }

    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    const user = await User.findById(decoded.id).select('+refreshToken');

    if (!user || user.refreshToken !== refreshToken) {
      logSuspiciousActivity('INVALID_TOKEN', { ip: req.ip, type: 'refresh_token_reuse' });
      return res.status(401).json({ error: 'Invalid refresh token.' });
    }

    sendTokenResponse(user, 200, res);
  } catch (error) {
    res.status(401).json({ error: 'Token verification failed.' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// ✅  LOGOUT
// ─────────────────────────────────────────────────────────────────────────────
exports.logout = async (req, res) => {
  // Clear refresh token from DB
  await User.findByIdAndUpdate(req.user.id, { refreshToken: null });

  res.clearCookie('refreshToken').json({ success: true, message: 'Logged out successfully.' });
};

exports.getMe = async (req, res) => {
  const user = await User.findById(req.user.id);
  res.json({ success: true, user });
};
