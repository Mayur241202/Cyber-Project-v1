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

// Seed admin user (password: Admin@1234)
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

// Seed librarian user (password: Librarian@1234)
db.users.insertOne({
  name: 'Head Librarian',
  email: 'librarian@library.com',
  // bcrypt hash of 'Librarian@1234' with 12 rounds
  password: '$2b$12$K8GpnPAqLBhGlCBFKmJyp.hfxLMBqPvh9zRkHnqp1MnOJlZXmW8eK',
  role: 'librarian',
  isActive: true,
  isLocked: false,
  failedLoginAttempts: 0,
  createdAt: new Date(),
  updatedAt: new Date(),
});

// Seed a sample book so the catalog is not empty
db.books.insertOne({
  title: 'Clean Code',
  author: 'Robert C. Martin',
  isbn: '9780132350884',
  category: 'Technology',
  description: 'Software craftsmanship book on writing clean, maintainable code.',
  totalCopies: 2,
  availableCopies: 2,
  createdAt: new Date(),
  updatedAt: new Date(),
});

print('✅ MongoDB initialized: admin, librarian, and sample book seeded.');