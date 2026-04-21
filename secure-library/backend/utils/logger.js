// utils/logger.js - Winston Logger for Security Auditing
const winston = require('winston');
const path = require('path');

const { combine, timestamp, printf, colorize, json } = winston.format;

// Custom format for console output
const consoleFormat = printf(({ level, message, timestamp, ...meta }) => {
  const metaStr = Object.keys(meta).length ? `\n${JSON.stringify(meta, null, 2)}` : '';
  return `[${timestamp}] ${level.toUpperCase()}: ${message}${metaStr}`;
});

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: combine(
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    json()
  ),
  transports: [
    // All logs
    new winston.transports.File({
      filename: path.join(__dirname, '../logs/combined.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    // Error logs only
    new winston.transports.File({
      filename: path.join(__dirname, '../logs/error.log'),
      level: 'error',
      maxsize: 5242880,
      maxFiles: 5,
    }),
    // Security/suspicious activity logs
    new winston.transports.File({
      filename: path.join(__dirname, '../logs/security.log'),
      level: 'warn',
      maxsize: 5242880,
      maxFiles: 10, // Keep more security logs
    }),
  ],
});

// Also log to console in development
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: combine(colorize(), timestamp({ format: 'HH:mm:ss' }), consoleFormat),
  }));
}

// Morgan stream for HTTP logging
const stream = {
  write: (message) => logger.http(message.trim()),
};

// Suspicious activity logger helper
const logSuspiciousActivity = (type, details) => {
  logger.warn(`SUSPICIOUS_ACTIVITY: ${type}`, {
    ...details,
    timestamp: new Date().toISOString(),
    severity: getSeverity(type),
  });
};

const getSeverity = (type) => {
  const severityMap = {
    BRUTE_FORCE: 'HIGH',
    SQL_INJECTION_ATTEMPT: 'CRITICAL',
    NOSQL_INJECTION: 'CRITICAL',
    XSS_ATTEMPT: 'HIGH',
    UNAUTHORIZED_ACCESS: 'MEDIUM',
    RATE_LIMIT_EXCEEDED: 'MEDIUM',
    INVALID_TOKEN: 'LOW',
    MULTIPLE_FAILED_LOGINS: 'HIGH',
  };
  return severityMap[type] || 'MEDIUM';
};

module.exports = { logger, stream, logSuspiciousActivity };
