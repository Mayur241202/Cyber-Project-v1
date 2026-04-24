// middleware/rateLimiter.js - Granular Rate Limiting
const rateLimit = require('express-rate-limit');
const { logSuspiciousActivity } = require('../utils/logger');

const createLimiter = (options) => rateLimit({
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res, next, opts) => {
    logSuspiciousActivity('RATE_LIMIT_EXCEEDED', {
      ip: req.ip,
      path: req.path,
      method: req.method,
      userAgent: req.headers['user-agent'],
      limitType: options.name || 'unknown',
    });
    res.status(opts.statusCode).json({
      error: opts.message.error,
      retryAfter: Math.ceil(opts.windowMs / 1000 / 60) + ' minutes',
    });
  },
  ...options,
});

// ✅ Strict limit for login (prevents brute force)
exports.loginLimiter = createLimiter({
  name: 'login',
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max: 100,                     // 10 attempts per window
  skipSuccessfulRequests: true, // Don't count successful logins
  message: { error: 'Too many login attempts. Please wait 15 minutes.' },
});

// ✅ Register limiter (prevents spam accounts)
exports.registerLimiter = createLimiter({
  name: 'register',
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,
  message: { error: 'Too many registrations from this IP.' },
});

// ✅ API limiter for book operations
exports.apiLimiter = createLimiter({
  name: 'api',
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: { error: 'API rate limit exceeded.' },
});

// ✅ Strict limiter for sensitive operations
exports.sensitiveOpLimiter = createLimiter({
  name: 'sensitive',
  windowMs: 60 * 60 * 1000,
  max: 20,
  message: { error: 'Sensitive operation limit reached.' },
});
