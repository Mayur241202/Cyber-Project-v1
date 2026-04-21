// models/User.js - User Schema with Security Features
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const loginAttemptSchema = new mongoose.Schema({
  timestamp: { type: Date, default: Date.now },
  ip: String,
  userAgent: String,
  success: Boolean,
  location: String,
});

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    maxlength: [50, 'Name cannot exceed 50 characters'],
    match: [/^[a-zA-Z\s]+$/, 'Name can only contain letters and spaces'],
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Invalid email format'],
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [8, 'Password must be at least 8 characters'],
    select: false, // Never return password in queries
  },
  role: {
    type: String,
    enum: ['user', 'librarian', 'admin'],
    default: 'user',
  },
  isActive: { type: Boolean, default: true },
  isLocked: { type: Boolean, default: false },

  // Security tracking fields
  failedLoginAttempts: { type: Number, default: 0 },
  lockUntil: { type: Date },
  lastLogin: { type: Date },
  lastLoginIP: { type: String },
  loginHistory: [loginAttemptSchema],

  // Password reset
  passwordResetToken: String,
  passwordResetExpires: Date,
  passwordChangedAt: Date,

  refreshToken: { type: String, select: false },
}, {
  timestamps: true,
});

// ─── VIRTUAL ─────────────────────────────────────────────────────────────────
userSchema.virtual('isLockedOut').get(function () {
  return !!(this.isLocked && this.lockUntil && this.lockUntil > Date.now());
});

// ─── PRE-SAVE: Hash password ─────────────────────────────────────────────────
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12); // 12 rounds = strong
  if (!this.isNew) this.passwordChangedAt = Date.now() - 1000;
  next();
});

// ─── METHODS ─────────────────────────────────────────────────────────────────
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Increment failed attempts and lock after threshold
userSchema.methods.incLoginAttempts = async function () {
  const MAX_ATTEMPTS = 5;
  const LOCK_DURATION = 30 * 60 * 1000; // 30 minutes

  // Reset if lock has expired
  if (this.lockUntil && this.lockUntil < Date.now()) {
    return this.updateOne({
      $set: { failedLoginAttempts: 1, isLocked: false },
      $unset: { lockUntil: 1 },
    });
  }

  const updates = { $inc: { failedLoginAttempts: 1 } };

  if (this.failedLoginAttempts + 1 >= MAX_ATTEMPTS && !this.isLockedOut) {
    updates.$set = { isLocked: true, lockUntil: Date.now() + LOCK_DURATION };
  }

  return this.updateOne(updates);
};

// Reset on successful login
userSchema.methods.resetLoginAttempts = function () {
  return this.updateOne({
    $set: { failedLoginAttempts: 0, isLocked: false, lastLogin: new Date() },
    $unset: { lockUntil: 1 },
  });
};

// Check if JWT was issued before password change
userSchema.methods.changedPasswordAfter = function (JWTTimestamp) {
  if (this.passwordChangedAt) {
    const changedTimestamp = parseInt(this.passwordChangedAt.getTime() / 1000, 10);
    return JWTTimestamp < changedTimestamp;
  }
  return false;
};

module.exports = mongoose.model('User', userSchema);
