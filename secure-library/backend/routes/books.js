// routes/books.js
const express = require('express');
const router = express.Router();
const { getAllBooks, getBook, createBook, updateBook, deleteBook } = require('../controllers/bookController');
const { protect, authorize } = require('../middleware/auth');
const { apiLimiter } = require('../middleware/rateLimiter');
const { createBookValidator, updateBookValidator } = require('../middleware/validators');

router.use(apiLimiter);

router.get('/', getAllBooks);                                                    // Public
router.get('/:id', getBook);                                                    // Public
router.post('/', protect, authorize('librarian', 'admin'), createBookValidator, createBook);
router.put('/:id', protect, authorize('librarian', 'admin'), updateBookValidator, updateBook);
router.delete('/:id', protect, authorize('admin'), deleteBook);

module.exports = router;
