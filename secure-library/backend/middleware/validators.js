// middleware/validators.js - Input Validation Rules
const { body, param } = require('express-validator');

// ─── AUTH VALIDATORS ──────────────────────────────────────────────────────────
exports.registerValidator = [
  body('name')
    .trim()
    .notEmpty().withMessage('Name is required')
    .isLength({ min: 2, max: 50 }).withMessage('Name must be 2-50 characters')
    .matches(/^[a-zA-Z\s]+$/).withMessage('Name can only contain letters and spaces')
    .escape(), // ✅ HTML-encode special chars

  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Invalid email format')
    .normalizeEmail()  // ✅ Normalizes email (lowercase, remove dots in gmail etc)
    .isLength({ max: 100 }).withMessage('Email too long'),

  body('password')
    .notEmpty().withMessage('Password is required')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('Password must contain uppercase, lowercase, number and special character'),
];

exports.loginValidator = [
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Invalid email format')
    .normalizeEmail()
    .isLength({ max: 100 }),

  body('password')
    .notEmpty().withMessage('Password is required')
    .isLength({ max: 128 }).withMessage('Password too long'), // Prevent bcrypt DoS
];

// ─── BOOK VALIDATORS ──────────────────────────────────────────────────────────
exports.createBookValidator = [
  body('title')
    .trim()
    .notEmpty().withMessage('Title is required')
    .isLength({ max: 200 }).withMessage('Title too long')
    .escape(),

  body('author')
    .trim()
    .notEmpty().withMessage('Author is required')
    .isLength({ max: 100 })
    .matches(/^[a-zA-Z\s.,'-]+$/).withMessage('Invalid author name')
    .escape(),

  body('isbn')
    .trim()
    .notEmpty().withMessage('ISBN is required')
    .matches(/^(?:97[89])?\d{9}[\dX]$/).withMessage('Invalid ISBN format'),

  body('category')
    .notEmpty().withMessage('Category is required')
    .isIn(['Fiction', 'Non-Fiction', 'Science', 'Technology', 'History', 'Biography', 'Reference', 'Other'])
    .withMessage('Invalid category'),

  body('totalCopies')
    .isInt({ min: 1, max: 1000 }).withMessage('Copies must be between 1 and 1000'),

  body('publishedYear')
    .optional()
    .isInt({ min: 1000, max: new Date().getFullYear() })
    .withMessage('Invalid published year'),

  body('description')
    .optional()
    .trim()
    .isLength({ max: 1000 }).withMessage('Description too long')
    .escape(),
];

exports.updateBookValidator = [
  param('id').isMongoId().withMessage('Invalid book ID'),
  body('title').optional().trim().isLength({ max: 200 }).escape(),
  body('author').optional().trim().isLength({ max: 100 }).escape(),
  body('category').optional().isIn(['Fiction', 'Non-Fiction', 'Science', 'Technology', 'History', 'Biography', 'Reference', 'Other']),
  body('totalCopies').optional().isInt({ min: 1, max: 1000 }),
  body('description').optional().trim().isLength({ max: 1000 }).escape(),
];

// ─── ISSUE VALIDATORS ─────────────────────────────────────────────────────────
exports.issueBookValidator = [
  body('bookId').isMongoId().withMessage('Invalid book ID'),
  body('userId').isMongoId().withMessage('Invalid user ID'),
];
