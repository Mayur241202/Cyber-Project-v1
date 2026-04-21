// controllers/bookController.js - Book CRUD Operations
const { validationResult } = require('express-validator');
const Book = require('../models/Book');
const { logger } = require('../utils/logger');

// ✅ GET all books (with search, filter, pagination)
exports.getAllBooks = async (req, res) => {
  try {
    const { search, category, page = 1, limit = 10, sort = '-createdAt' } = req.query;

    // Build query
    let query = {};

    // ✅ Text search uses MongoDB text index (safe - not raw regex injection)
    if (search) {
      query.$text = { $search: search };
    }

    // Whitelist enum-based filter
    const validCategories = ['Fiction', 'Non-Fiction', 'Science', 'Technology', 'History', 'Biography', 'Reference', 'Other'];
    if (category && validCategories.includes(category)) {
      query.category = category;
    }

    // Pagination (sanitized to numbers)
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(50, Math.max(1, parseInt(limit))); // cap at 50
    const skip = (pageNum - 1) * limitNum;

    // Whitelist sort fields
    const validSorts = ['-createdAt', 'createdAt', 'title', '-title', 'author'];
    const safeSort = validSorts.includes(sort) ? sort : '-createdAt';

    const [books, total] = await Promise.all([
      Book.find(query).sort(safeSort).skip(skip).limit(limitNum).populate('addedBy', 'name'),
      Book.countDocuments(query),
    ]);

    res.json({
      success: true,
      count: books.length,
      total,
      totalPages: Math.ceil(total / limitNum),
      currentPage: pageNum,
      books,
    });
  } catch (error) {
    logger.error('Get books error:', error);
    res.status(500).json({ error: 'Failed to fetch books.' });
  }
};

// ✅ GET single book
exports.getBook = async (req, res) => {
  try {
    const book = await Book.findById(req.params.id).populate('addedBy', 'name email');
    if (!book) return res.status(404).json({ error: 'Book not found.' });
    res.json({ success: true, book });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch book.' });
  }
};

// ✅ CREATE book (librarian/admin only)
exports.createBook = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    const book = await Book.create({ ...req.body, addedBy: req.user.id });
    logger.info('Book created', { bookId: book._id, title: book.title, by: req.user.id });
    res.status(201).json({ success: true, book });
  } catch (error) {
    if (error.code === 11000) return res.status(400).json({ error: 'ISBN already exists.' });
    logger.error('Create book error:', error);
    res.status(500).json({ error: 'Failed to create book.' });
  }
};

// ✅ UPDATE book
exports.updateBook = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    // Only allow specific fields to be updated (whitelist)
    const allowedUpdates = ['title', 'author', 'category', 'description', 'totalCopies', 'publishedYear'];
    const updates = {};
    allowedUpdates.forEach(field => {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    });

    const book = await Book.findByIdAndUpdate(req.params.id, updates, {
      new: true,
      runValidators: true, // ✅ Runs schema validators on update too
    });

    if (!book) return res.status(404).json({ error: 'Book not found.' });
    logger.info('Book updated', { bookId: book._id, by: req.user.id });
    res.json({ success: true, book });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update book.' });
  }
};

// ✅ DELETE book
exports.deleteBook = async (req, res) => {
  try {
    const book = await Book.findByIdAndDelete(req.params.id);
    if (!book) return res.status(404).json({ error: 'Book not found.' });
    logger.warn('Book deleted', { bookId: req.params.id, title: book.title, by: req.user.id });
    res.json({ success: true, message: 'Book deleted.' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete book.' });
  }
};
