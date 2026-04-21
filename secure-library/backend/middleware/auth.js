// middleware/auth.js - JWT Authentication & Authorization
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { logSuspiciousActivity } = require('../utils/logger');

// ✅ Verify JWT Access Token
exports.protect = async (req, res, next) => {
  let token;

  // Extract token from Authorization header
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({ error: 'Access denied. No token provided.' });
  }

  try {
    // ✅ Verify with strong secret + algorithm specification
    const decoded = jwt.verify(token, process.env.JWT_SECRET, {
      algorithms: ['HS256'], // Prevents "alg: none" attack
    });

    // ✅ Fetch fresh user from DB (catches revoked users)
    const user = await User.findById(decoded.id).select('+passwordChangedAt');
    if (!user) {
      logSuspiciousActivity('INVALID_TOKEN', { ip: req.ip, reason: 'user_not_found', decoded });
      return res.status(401).json({ error: 'Token invalid. User no longer exists.' });
    }

    // ✅ Check if account is active
    if (!user.isActive) {
      return res.status(401).json({ error: 'Account deactivated.' });
    }

    // ✅ Check if password changed after token was issued
    if (user.changedPasswordAfter(decoded.iat)) {
      logSuspiciousActivity('INVALID_TOKEN', { ip: req.ip, userId: user._id, reason: 'password_changed' });
      return res.status(401).json({ error: 'Password recently changed. Please log in again.' });
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      logSuspiciousActivity('INVALID_TOKEN', { ip: req.ip, error: error.message });
      return res.status(401).json({ error: 'Invalid token.' });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired. Please log in again.', code: 'TOKEN_EXPIRED' });
    }
    return res.status(500).json({ error: 'Token verification failed.' });
  }
};

// ✅ Role-based access control
exports.authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      logSuspiciousActivity('UNAUTHORIZED_ACCESS', {
        userId: req.user.id,
        userRole: req.user.role,
        requiredRoles: roles,
        path: req.path,
        ip: req.ip,
      });
      return res.status(403).json({
        error: `Access denied. Required role(s): ${roles.join(', ')}`,
      });
    }
    next();
  };
};
