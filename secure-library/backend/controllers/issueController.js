// controllers/issueController.js - Book Issue/Return System
const Issue = require('../models/Issue');
const Book = require('../models/Book');
const { logger, logSuspiciousActivity } = require('../utils/logger');

// Issue a book
exports.issueBook = async (req, res) => {
  try {
    const { bookId, userId } = req.body;
    const requestingUserId = req.user.id;
    const requestingUserRole = req.user.role;

    // Authorization: users can only issue for themselves; librarians can issue for anyone
    if (requestingUserRole === 'user' && userId !== requestingUserId) {
      logSuspiciousActivity('UNAUTHORIZED_ACCESS', {
        attemptedBy: requestingUserId,
        attemptedFor: userId,
        action: 'issue_book',
        ip: req.ip,
      });
      return res.status(403).json({ error: 'You can only issue books for yourself.' });
    }

    const book = await Book.findById(bookId);
    if (!book) return res.status(404).json({ error: 'Book not found.' });
    if (book.availableCopies < 1) return res.status(400).json({ error: 'No copies available.' });

    // Check if user already has this book issued
    const existingIssue = await Issue.findOne({ book: bookId, user: userId, status: 'issued' });
    if (existingIssue) return res.status(400).json({ error: 'User already has this book issued.' });

    // Check user hasn't exceeded book limit (3 books max)
    const activeIssues = await Issue.countDocuments({ user: userId, status: 'issued' });
    if (activeIssues >= 3) return res.status(400).json({ error: 'User has reached maximum book limit (3).' });

    // Atomic update: decrement available copies
    const updatedBook = await Book.findByIdAndUpdate(
      bookId,
      { $inc: { availableCopies: -1 } },
      { new: true }
    );
    if (!updatedBook) return res.status(500).json({ error: 'Failed to update book availability.' });

    const issue = await Issue.create({
      book: bookId,
      user: userId,
      issuedBy: requestingUserId,
    });

    await issue.populate([
      { path: 'book', select: 'title author isbn' },
      { path: 'user', select: 'name email' },
    ]);

    logger.info('Book issued', { issueId: issue._id, bookId, userId, by: requestingUserId });
    res.status(201).json({ success: true, issue });
  } catch (error) {
    logger.error('Issue book error:', error);
    res.status(500).json({ error: 'Failed to issue book.' });
  }
};

// Return a book
exports.returnBook = async (req, res) => {
  try {
    const { issueId } = req.params;

    const issue = await Issue.findById(issueId);
    if (!issue) return res.status(404).json({ error: 'Issue record not found.' });
    if (issue.status === 'returned') return res.status(400).json({ error: 'Book already returned.' });

    // Authorization check
    if (req.user.role === 'user' && issue.user.toString() !== req.user.id) {
      return res.status(403).json({ error: 'Unauthorized.' });
    }

    issue.returnDate = new Date();
    issue.status = 'returned';
    issue.calculateFine();
    await issue.save();

    // Increment available copies
    await Book.findByIdAndUpdate(issue.book, { $inc: { availableCopies: 1 } });

    logger.info('Book returned', { issueId, fine: issue.fine, by: req.user.id });
    res.json({ success: true, issue, message: issue.fine > 0 ? `Fine: ₹${issue.fine}` : 'Returned on time!' });
  } catch (error) {
    logger.error('Return book error:', error);
    res.status(500).json({ error: 'Failed to return book.' });
  }
};

// Get user's issued books
exports.getMyIssues = async (req, res) => {
  try {
    const issues = await Issue.find({ user: req.user.id })
      .populate('book', 'title author isbn')
      .sort('-issueDate');
    res.json({ success: true, issues });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch issues.' });
  }
};

// Admin: Get all issues
exports.getAllIssues = async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const query = status ? { status } : {};
    const issues = await Issue.find(query)
      .populate('book', 'title author')
      .populate('user', 'name email')
      .sort('-issueDate')
      .skip((page - 1) * limit)
      .limit(parseInt(limit));
    res.json({ success: true, issues });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch issues.' });
  }
};
