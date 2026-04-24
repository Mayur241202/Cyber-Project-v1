// backend/scripts/seed.js
require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://library_app:apppassword@library_mongo:27017/secure_library';

async function seed() {
  await mongoose.connect(MONGO_URI);
  console.log('✅ Connected to MongoDB');

  const users = mongoose.connection.db.collection('users');

  // Remove old seeded users if they exist
  await users.deleteMany({
    email: { $in: ['admin@library.com', 'librarian@library.com'] },
  });

  const adminHash = await bcrypt.hash('Admin@1234', 12);
  const librarianHash = await bcrypt.hash('Librarian@1234', 12);

  await users.insertMany([
    {
      name: 'System Admin',
      email: 'admin@library.com',
      password: adminHash,
      role: 'admin',
      isActive: true,
      isLocked: false,
      failedLoginAttempts: 0,
      loginHistory: [],
      refreshToken: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      name: 'Head Librarian',
      email: 'librarian@library.com',
      password: librarianHash,
      role: 'librarian',
      isActive: true,
      isLocked: false,
      failedLoginAttempts: 0,
      loginHistory: [],
      refreshToken: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ]);

  console.log('');
  console.log('✅ Users seeded successfully!');
  console.log('─────────────────────────────────────────');
  console.log('Admin     → admin@library.com     | Admin@1234');
  console.log('Librarian → librarian@library.com | Librarian@1234');
  console.log('─────────────────────────────────────────');

  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error('❌ Seed failed:', err.message);
  process.exit(1);
});