// routes/issues.js
const express = require('express');
const router = express.Router();
const { issueBook, returnBook, getMyIssues, getAllIssues } = require('../controllers/issueController');
const { protect, authorize } = require('../middleware/auth');
const { issueBookValidator } = require('../middleware/validators');

router.use(protect);

router.get('/my', getMyIssues);
router.post('/', authorize('librarian', 'admin'), issueBookValidator, issueBook);
router.put('/:issueId/return', returnBook);
router.get('/', authorize('librarian', 'admin'), getAllIssues);

module.exports = router;
