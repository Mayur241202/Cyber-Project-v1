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
    ref: 'User',
  },
  issueDate: { type: Date },
  dueDate:   { type: Date },
  returnDate:{ type: Date },
  status: {
    type: String,
    // 'issued' kept for backward compatibility with old records in DB
    enum: ['pending', 'approved', 'issued', 'rejected', 'returned', 'overdue', 'lost'],
    default: 'pending',
  },
  rejectionReason: { type: String, maxlength: 300, trim: true },
  fine:  { type: Number, default: 0, min: 0 },
  notes: { type: String, maxlength: 500, trim: true },
}, { timestamps: true });

issueSchema.methods.calculateFine = function () {
  const FINE_PER_DAY = 2;
  if (this.returnDate && this.dueDate && this.returnDate > this.dueDate) {
    const daysLate = Math.ceil((this.returnDate - this.dueDate) / (1000 * 60 * 60 * 24));
    this.fine = daysLate * FINE_PER_DAY;
  }
  return this.fine;
};

issueSchema.index({ user: 1, status: 1 });
issueSchema.index({ book: 1, status: 1 });

module.exports = mongoose.model('Issue', issueSchema);