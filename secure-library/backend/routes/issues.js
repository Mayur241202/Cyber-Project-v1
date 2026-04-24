// routes/issues.js
const express = require('express');
const router = express.Router();
const {
  requestBook,
  approveRequest,
  rejectRequest,
  returnBook,
  getMyIssues,
  getAllIssues,
  getPendingCount,
} = require('../controllers/issueController');
const { protect, authorize } = require('../middleware/auth');
const { issueBookValidator } = require('../middleware/validators');

router.use(protect);

// ── Static named routes MUST come before /:param routes ──────────────────────

// Any logged-in user — get their own requests only
router.get('/my', getMyIssues);

// Librarian/admin — get count of pending requests (must be before /:issueId)
router.get('/pending-count', authorize('librarian', 'admin'), getPendingCount);

// Librarian/admin — get all requests (with optional ?status= filter)
router.get('/all', authorize('librarian', 'admin'), getAllIssues);

// Any logged-in user — submit a new borrow request
router.post('/', issueBookValidator, requestBook);

// ── Param routes ──────────────────────────────────────────────────────────────

// Any logged-in user — return their own book
router.put('/:issueId/return', returnBook);

// Librarian/admin — approve or reject a pending request
router.patch('/:issueId/approve', authorize('librarian', 'admin'), approveRequest);
router.patch('/:issueId/reject',  authorize('librarian', 'admin'), rejectRequest);

module.exports = router;