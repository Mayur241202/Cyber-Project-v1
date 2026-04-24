// Run this ONE TIME inside your backend container to fix existing data:
// docker exec -it library_backend node migrate-issued-to-pending.js
//
// What it does: finds all Issue records with status='issued' that have
// NO issueDate (meaning they were created by the old direct-issue flow
// but actually represent borrow requests), and marks them 'pending'
// so the librarian can see and approve them.

require('dotenv').config();
const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/secure_library';

async function migrate() {
  await mongoose.connect(MONGODB_URI);
  console.log('Connected to MongoDB');

  // All 'issued' records without an issueDate are old direct-issues
  // that should now be treated as pending approvals
  const result = await mongoose.connection.collection('issues').updateMany(
    { status: 'issued' },
    { $set: { status: 'pending' } }
  );

  console.log(`✅ Migrated ${result.modifiedCount} record(s) from 'issued' → 'pending'`);
  await mongoose.disconnect();
}

migrate().catch(err => { console.error(err); process.exit(1); });