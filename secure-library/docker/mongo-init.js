// docker/mongo-init.js — Runs once when MongoDB container is first created
db = db.getSiblingDB('secure_library');

// Create application user with least-privilege
db.createUser({
  user: 'library_app',
  pwd: process.env.MONGO_APP_PASSWORD || 'apppassword',
  roles: [{ role: 'readWrite', db: 'secure_library' }],
});

// Create collections with validators
db.createCollection('users', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['name', 'email', 'password'],
      properties: {
        email: { bsonType: 'string', pattern: '^\\S+@\\S+\\.\\S+$' },
        role: { enum: ['user', 'librarian', 'admin'] },
      },
    },
  },
});

db.createCollection('books');
db.createCollection('issues');

// Seed admin user (password: Admin@1234 — change this!)
db.users.insertOne({
  name: 'System Admin',
  email: 'admin@library.com',
  // bcrypt hash of 'Admin@1234' with 12 rounds
  password: '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBFRRijQ6h9JsW',
  role: 'admin',
  isActive: true,
  isLocked: false,
  failedLoginAttempts: 0,
  createdAt: new Date(),
  updatedAt: new Date(),
});

print('✅ MongoDB initialized for secure_library');
