// models/Book.js - Book Schema
const mongoose = require('mongoose');

const bookSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Title is required'],
    trim: true,
    maxlength: [200, 'Title too long'],
  },
  author: {
    type: String,
    required: [true, 'Author is required'],
    trim: true,
    maxlength: [100, 'Author name too long'],
  },
  isbn: {
    type: String,
    required: [true, 'ISBN is required'],
    unique: true,
    match: [/^(?:ISBN(?:-1[03])?:? )?(?=[0-9X]{10}$|(?=(?:[0-9]+[- ]){3})[- 0-9X]{13}$|97[89][0-9]{10}$|(?=(?:[0-9]+[- ]){4})[- 0-9]{17}$)(?:97[89][- ]?)?[0-9]{1,5}[- ]?[0-9]+[- ]?[0-9]+[- ]?[0-9X]$/, 'Invalid ISBN format'],
  },
  category: {
    type: String,
    required: true,
    enum: ['Fiction', 'Non-Fiction', 'Science', 'Technology', 'History', 'Biography', 'Reference', 'Other'],
  },
  description: {
    type: String,
    maxlength: [1000, 'Description too long'],
    trim: true,
  },
  totalCopies: {
    type: Number,
    required: true,
    min: [1, 'Must have at least 1 copy'],
    max: [1000, 'Too many copies'],
  },
  availableCopies: {
    type: Number,
    min: 0,
  },
  publishedYear: {
    type: Number,
    min: 1000,
    max: new Date().getFullYear(),
  },
  addedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
}, { timestamps: true });

bookSchema.pre('save', function (next) {
  if (this.isNew) this.availableCopies = this.totalCopies;
  next();
});

// Text index for search
bookSchema.index({ title: 'text', author: 'text', isbn: 'text' });

module.exports = mongoose.model('Book', bookSchema);
