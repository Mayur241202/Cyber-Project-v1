// controllers/issueController.js
// Flow: user requests (pending) → librarian approves (approved) or rejects → user returns
// NOTE: old records in DB may have status='issued' — treated same as 'approved' throughout
const Issue = require('../models/Issue');
const Book = require('../models/Book');
const { logger, logSuspiciousActivity } = require('../utils/logger');

// Helper: statuses that mean "book is actively with user"
const ACTIVE_STATUSES = ['approved', 'issued'];

// ─── USER: Request to borrow ──────────────────────────────────────────────────
exports.requestBook = async (req, res) => {
  try {
    const { bookId } = req.body;
    const userId = req.user.id;

    const book = await Book.findById(bookId);
    if (!book) return res.status(404).json({ error: 'Book not found.' });
    if (book.availableCopies < 1) return res.status(400).json({ error: 'No copies available.' });

    // No duplicate active/pending request for same book
    const existing = await Issue.findOne({
      book: bookId,
      user: userId,
      status: { $in: ['pending', ...ACTIVE_STATUSES] },
    });
    if (existing) {
      return res.status(400).json({
        error: existing.status === 'pending'
          ? 'You already have a pending request for this book.'
          : 'You already have this book issued.',
      });
    }

    // Borrow limit: max 3 active books
    const activeCount = await Issue.countDocuments({
      user: userId,
      status: { $in: ACTIVE_STATUSES },
    });
    if (activeCount >= 3) {
      return res.status(400).json({ error: 'You have reached the maximum borrow limit (3 books).' });
    }

    const issue = await Issue.create({ book: bookId, user: userId });
    await issue.populate([
      { path: 'book', select: 'title author isbn' },
      { path: 'user', select: 'name email' },
    ]);

    logger.info('Borrow request created', { issueId: issue._id, bookId, userId });
    res.status(201).json({ success: true, issue, message: 'Borrow request submitted! Waiting for librarian approval.' });
  } catch (error) {
    logger.error('Request book error:', error);
    res.status(500).json({ error: 'Failed to submit borrow request.' });
  }
};

// ─── LIBRARIAN/ADMIN: Approve ─────────────────────────────────────────────────
exports.approveRequest = async (req, res) => {
  try {
    const { issueId } = req.params;

    const issue = await Issue.findById(issueId);
    if (!issue) return res.status(404).json({ error: 'Request not found.' });
    if (issue.status !== 'pending') {
      return res.status(400).json({ error: `Cannot approve a request with status: ${issue.status}` });
    }

    const book = await Book.findById(issue.book);
    if (!book || book.availableCopies < 1) {
      return res.status(400).json({ error: 'No copies available to approve this request.' });
    }

    await Book.findByIdAndUpdate(book._id, { $inc: { availableCopies: -1 } });

    const now = new Date();
    issue.status = 'approved';
    issue.issuedBy = req.user.id;
    issue.issueDate = now;
    issue.dueDate = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
    await issue.save();

    await issue.populate([
      { path: 'book', select: 'title author isbn' },
      { path: 'user', select: 'name email' },
      { path: 'issuedBy', select: 'name' },
    ]);

    logger.info('Borrow request approved', { issueId, by: req.user.id });
    res.json({ success: true, issue, message: 'Request approved. Book issued successfully.' });
  } catch (error) {
    logger.error('Approve request error:', error);
    res.status(500).json({ error: 'Failed to approve request.' });
  }
};

// ─── LIBRARIAN/ADMIN: Reject ──────────────────────────────────────────────────
exports.rejectRequest = async (req, res) => {
  try {
    const { issueId } = req.params;
    const { reason } = req.body;

    const issue = await Issue.findById(issueId);
    if (!issue) return res.status(404).json({ error: 'Request not found.' });
    if (issue.status !== 'pending') {
      return res.status(400).json({ error: `Cannot reject a request with status: ${issue.status}` });
    }

    issue.status = 'rejected';
    issue.issuedBy = req.user.id;
    issue.rejectionReason = reason || 'Request rejected by librarian.';
    await issue.save();

    logger.info('Borrow request rejected', { issueId, by: req.user.id, reason });
    res.json({ success: true, issue, message: 'Request rejected.' });
  } catch (error) {
    logger.error('Reject request error:', error);
    res.status(500).json({ error: 'Failed to reject request.' });
  }
};

// ─── USER: Return a book ──────────────────────────────────────────────────────
exports.returnBook = async (req, res) => {
  try {
    const { issueId } = req.params;

    const issue = await Issue.findById(issueId);
    if (!issue) return res.status(404).json({ error: 'Issue record not found.' });
    if (![...ACTIVE_STATUSES, 'overdue'].includes(issue.status)) {
      return res.status(400).json({ error: 'Only issued/approved books can be returned.' });
    }

    if (req.user.role === 'user' && issue.user.toString() !== req.user.id) {
      return res.status(403).json({ error: 'Unauthorized.' });
    }

    issue.returnDate = new Date();
    issue.status = 'returned';
    issue.calculateFine();
    await issue.save();

    await Book.findByIdAndUpdate(issue.book, { $inc: { availableCopies: 1 } });

    logger.info('Book returned', { issueId, fine: issue.fine, by: req.user.id });
    res.json({
      success: true, issue,
      message: issue.fine > 0 ? `Book returned. Fine: ₹${issue.fine}` : 'Book returned on time!',
    });
  } catch (error) {
    logger.error('Return book error:', error);
    res.status(500).json({ error: 'Failed to return book.' });
  }
};

// ─── USER: My requests/issues ─────────────────────────────────────────────────
exports.getMyIssues = async (req, res) => {
  try {
    const issues = await Issue.find({ user: req.user.id })
      .populate('book', 'title author isbn')
      .populate('issuedBy', 'name')
      .sort('-createdAt');
    res.json({ success: true, issues });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch issues.' });
  }
};

// ─── LIBRARIAN/ADMIN: All requests ───────────────────────────────────────────
exports.getAllIssues = async (req, res) => {
  try {
    const { status, page = 1, limit = 50 } = req.query;

    let query = {};
    if (status) {
      // 'approved' filter should also return old 'issued' records
      if (status === 'approved') {
        query.status = { $in: ACTIVE_STATUSES };
      } else {
        query.status = status;
      }
    }

    const issues = await Issue.find(query)
      .populate('book', 'title author isbn')
      .populate('user', 'name email')
      .populate('issuedBy', 'name')
      .sort('-createdAt')
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await Issue.countDocuments(query);
    res.json({ success: true, issues, total });
  } catch (error) {
    logger.error('Get all issues error:', error);
    res.status(500).json({ error: 'Failed to fetch issues.' });
  }
};

// ─── LIBRARIAN/ADMIN: Pending count ─────────────────────────────────────────
exports.getPendingCount = async (req, res) => {
  try {
    const count = await Issue.countDocuments({ status: 'pending' });
    res.json({ success: true, count });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch pending count.' });
  }
};