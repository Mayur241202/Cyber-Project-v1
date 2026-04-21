// routes/admin.js
const express = require('express');
const router = express.Router();
const axios = require('axios');
const User = require('../models/User');
const Issue = require('../models/Issue');
const { protect, authorize } = require('../middleware/auth');
const { logger } = require('../utils/logger');

router.use(protect, authorize('admin'));

// Dashboard stats
router.get('/stats', async (req, res) => {
  try {
    const [totalUsers, totalIssues, activeIssues] = await Promise.all([
      User.countDocuments({ role: 'user' }),
      Issue.countDocuments(),
      Issue.countDocuments({ status: 'issued' }),
    ]);
    res.json({ success: true, stats: { totalUsers, totalIssues, activeIssues } });
  } catch (err) {
    res.status(500).json({ error: 'Stats fetch failed.' });
  }
});

// Get ML anomaly report
router.get('/anomalies', async (req, res) => {
  try {
    const response = await axios.get(`${process.env.ML_SERVICE_URL}/api/anomalies`, {
      timeout: 5000,
    });
    res.json({ success: true, anomalies: response.data });
  } catch (err) {
    logger.error('ML service error:', err.message);
    res.status(503).json({ error: 'ML anomaly service unavailable.' });
  }
});

// List all users (admin only)
router.get('/users', async (req, res) => {
  const users = await User.find().select('-password -refreshToken').sort('-createdAt');
  res.json({ success: true, users });
});

// Toggle user lock
router.patch('/users/:id/toggle-lock', async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found.' });
  user.isActive = !user.isActive;
  await user.save({ validateBeforeSave: false });
  logger.warn('Admin toggled user account', { targetUser: user.email, adminId: req.user.id, newStatus: user.isActive });
  res.json({ success: true, message: `User ${user.isActive ? 'activated' : 'deactivated'}.` });
});

module.exports = router;
