// models/Issue.js - Book Issue/Return Schema
const mongoose = require('mongoose');

const issueSchema = new mongoose.Schema({
  book: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Book',
    required: true,
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  issuedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User', // Librarian who issued
  },
  issueDate: {
    type: Date,
    default: Date.now,
  },
  dueDate: {
    type: Date,
    required: true,
    default: () => new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days
  },
  returnDate: {
    type: Date,
  },
  status: {
    type: String,
    enum: ['issued', 'returned', 'overdue', 'lost'],
    default: 'issued',
  },
  fine: {
    type: Number,
    default: 0,
    min: 0,
  },
  notes: {
    type: String,
    maxlength: 500,
    trim: true,
  },
}, { timestamps: true });

// Auto-calculate fine on return
issueSchema.methods.calculateFine = function () {
  const FINE_PER_DAY = 2; // ₹2 per day
  if (this.returnDate && this.returnDate > this.dueDate) {
    const daysLate = Math.ceil((this.returnDate - this.dueDate) / (1000 * 60 * 60 * 24));
    this.fine = daysLate * FINE_PER_DAY;
  }
  return this.fine;
};

// Index for quick lookups
issueSchema.index({ user: 1, status: 1 });
issueSchema.index({ book: 1, status: 1 });

module.exports = mongoose.model('Issue', issueSchema);
