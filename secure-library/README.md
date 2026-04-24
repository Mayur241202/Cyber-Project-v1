# 🔐 Secure Online Library Management System
### MERN Stack + ML Anomaly Detection + Docker + Security Testing

---

## Project Overview

A production-ready, security-hardened **Library Management System** built with the **MERN stack** (MongoDB, Express, React, Node.js). This project demonstrates modern security best practices including:

- **Role-Based Access Control (RBAC)** — user, librarian, admin roles
- **Authentication & Authorization** — JWT with refresh tokens in secure httpOnly cookies
- **ML Anomaly Detection** — Isolation Forest model detects suspicious login patterns
- **Input Validation & Sanitization** — express-validator + MongoDB sanitization
- **Secure HTTP Headers** — Helmet.js with CSP, HSTS, X-Frame-Options
- **Rate Limiting** — Granular per-route rate limits to prevent brute force
- **Account Lockout** — 5 failed logins trigger 30-minute account lock
- **Comprehensive Logging** — Winston logger for combined, error, and security logs
- **Containerized Deployment** — Docker Compose with health checks and non-root users
- **Educational Vulnerability Demo** — Intentionally vulnerable `/api/auth/insecure-login` endpoint for learning

---

## 📁 Full Folder Structure

```
secure-library/
│
├── backend/                        # Node.js + Express API
│   ├── config/                     # (future: DB config, etc.)
│   ├── controllers/
│   │   ├── authController.js       # ⚠️ insecureLogin + ✅ secureLogin
│   │   ├── bookController.js       # CRUD with whitelist validation
│   │   └── issueController.js      # Issue/return + fine calculation
│   ├── middleware/
│   │   ├── auth.js                 # JWT protect + RBAC authorize
│   │   ├── validators.js           # express-validator rules
│   │   └── rateLimiter.js          # Granular rate limits per route
│   ├── models/
│   │   ├── User.js                 # bcrypt, lockout, login history
│   │   ├── Book.js                 # ISBN validation, text index
│   │   └── Issue.js                # Fine calculation method
│   ├── routes/
│   │   ├── auth.js                 # /api/auth/*
│   │   ├── books.js                # /api/books/*
│   │   ├── issues.js               # /api/issues/*
│   │   └── admin.js                # /api/admin/* (admin only)
│   ├── utils/
│   │   └── logger.js               # Winston: combined/error/security logs
│   ├── scripts/
│   │   ├── seed.js                 # Initialize DB with admin & librarian users
│   │   └── migrate-issued-to-pending.js  # Fix existing issue status records
│   ├── logs/                       # Auto-created, gitignored
│   ├── server.js                   # Entry: Helmet, CORS, sanitize, HPP
│   ├── Dockerfile
│   ├── package.json
│   └── .env.example
│
├── frontend/                       # React 18 SPA
│   ├── public/
│   │   └── index.html
│   ├── src/
│   │   ├── context/
│   │   │   └── AuthContext.js      # JWT state + refresh logic
│   │   ├── utils/
│   │   │   └── api.js              # Axios + auto-refresh interceptor
│   │   ├── pages/
│   │   │   ├── Login.js            # Secure login form
│   │   │   ├── Register.js         # Password strength validation
│   │   │   ├── Dashboard.js        # Stats overview
│   │   │   ├── Books.js            # Search, filter, borrow
│   │   │   ├── MyIssues.js         # Return books, view fines
│   │   │   ├── AdminPanel.js       # ML anomaly dashboard + user mgmt
│   │   │   └── VulnDemo.js         # ⚠️ Educational attack demo UI
│   │   ├── components/
│   │   │   └── Navbar.js
│   │   ├── App.js                  # Routes + ProtectedRoute wrapper
│   │   └── index.js
│   ├── nginx.conf                  # Reverse proxy + security headers
│   ├── Dockerfile
│   └── package.json
│
├── ml-service/                     # Python Flask + scikit-learn
│   ├── app.py                      # Isolation Forest anomaly detection
│   ├── requirements.txt
│   └── Dockerfile
│
├── docker/
│   └── mongo-init.js               # DB init + seed admin user
│
├── docs/
│   └── security-testing.sh         # Wireshark/Burp/Nmap/Trivy/SonarQube
│
├── docker-compose.yml              # Full stack orchestration
├── .env.example                    # Root env template
├── .gitignore
└── README.md
```

---

## �️ Database Scripts & Utilities

### seed.js — Initialize Database with Default Users

**Purpose**: Populate MongoDB with default admin and librarian accounts for first-time setup.

**What it does**:
1. Connects to MongoDB using `MONGODB_URI` from `.env`
2. Removes existing seeded accounts (admin@library.com, librarian@library.com)
3. Creates new accounts with bcrypt-hashed passwords
4. Initializes login history and security fields

**Default Accounts Created**:
```
Admin      → admin@library.com      | Admin@1234
Librarian  → librarian@library.com  | Librarian@1234
```

**Usage**:

#### Option 1: Docker Container
```bash
# Run inside backend container (development)
docker-compose exec backend node scripts/seed.js

# Or for a running container
docker exec -it library_backend node scripts/seed.js
```

#### Option 2: Local Development
```bash
cd backend
npm install  # If not already done
node scripts/seed.js
```

**Output Example**:
```
✅ Connected to MongoDB
✅ Users seeded successfully!
─────────────────────────────────────────
Admin     → admin@library.com     | Admin@1234
Librarian → librarian@library.com | Librarian@1234
─────────────────────────────────────────
```

**When to use**:
- First-time setup after fresh database
- Reset to default credentials (dev environment only)
- Testing authentication flows

---

### migrate-issued-to-pending.js — Fix Issue Status Records

**Purpose**: One-time migration script to correct issue status from 'issued' to 'pending' for records created before the new issue workflow was implemented.

**Context**: 
- Old flow: Direct issue creation → status='issued'
- New flow: User borrows → status='pending' → Librarian approves → status='issued'
- This script fixes legacy data to match new workflow

**What it does**:
1. Finds all Issue records with status='issued'
2. Changes status to 'pending' so librarian can review/approve
3. Reports number of records migrated

**Usage**:

#### Option 1: Docker Container
```bash
# Inside running backend container
docker exec -it library_backend node scripts/migrate-issued-to-pending.js
```

#### Option 2: Local Development
```bash
cd backend
node scripts/migrate-issued-to-pending.js
```

**Output Example**:
```
Connected to MongoDB
✅ Migrated 12 record(s) from 'issued' → 'pending'
```

**When to use**:
- One-time fix after code update
- After upgrading from old issue workflow to new approval system
- Only run once! (subsequent runs won't find more 'issued' records)

**Safety Note**:
- Non-destructive operation (only changes status field)
- Can be rolled back manually if needed
- Safe to run multiple times (idempotent)

---

## �🚀 Quick Start

### Prerequisites
- **Docker & Docker Compose** (v20.10+)
- **Node.js** 20+ (for local development)
- **Python** 3.11+ (for local ML service development)
- **Git** for version control

### 1. Clone and Configure Environment
```bash
# Clone the repository
git clone <repo>
cd secure-library

# Copy environment template
cp .env.example .env

# Generate secure JWT secrets (run twice for both tokens)
node -e "console.log('JWT_SECRET=' + require('crypto').randomBytes(64).toString('hex'))"
node -e "console.log('JWT_REFRESH_SECRET=' + require('crypto').randomBytes(64).toString('hex'))"

# Edit .env and paste the generated secrets
nano .env
```

### 2. Start the Full Stack with Docker

#### Production Mode
```bash
# Build and start all services
docker-compose up --build -d

# View service logs
docker-compose logs -f backend
docker-compose logs -f ml-service
docker-compose logs -f mongo
```

#### Development Mode (includes Mongo Express UI)
```bash
# Start with dev profile for admin database UI
docker-compose --profile dev up --build

# View logs in real-time
docker-compose logs -f
```

#### Individual Service Management
```bash
# Stop all services
docker-compose down

# Remove volumes (careful: deletes database!)
docker-compose down -v

# Restart a specific service
docker-compose restart backend
```

### 3. Access the Application

| Service | URL | Credentials |
|---------|-----|-------------|
| **Frontend** | http://localhost | See login below |
| **Backend API** | http://localhost:5000 | JWT auth required |
| **ML Service** | http://localhost:8000 | Internal use |
| **Mongo Express** | http://localhost:8081 | admin / adminpass (dev only) |
| **MongoDB** | localhost:27017 | admin / changeme |

### 4. Default Credentials

#### Admin Account
```
Email:    admin@library.com
Password: Admin@1234
```

#### Test User
```
Email:    user@library.com
Password: User@1234
```

#### Librarian Account
```
Email:    librarian@library.com
Password: Librarian@1234
```

> ⚠️ **IMPORTANT:** Change all default passwords immediately in production!

---

## 🔒 Security Features Deep Dive

### Authentication & Authorization
| Feature | Implementation | Details |
|---------|----------------|---------|
| **Password Hashing** | bcryptjs (12 rounds) | Slow, salted hashing prevents brute force |
| **Access Token** | JWT (HS256) | 15 minutes expiry for short-lived access |
| **Refresh Token** | JWT in httpOnly cookie | 7 days, auto-renewed, prevents XSS token theft |
| **Token Pinning** | Algorithm fixed to HS256 | Prevents downgrade attacks (JWT "none" bypass) |
| **Role-Based Access** | user / librarian / admin | Enforced on every protected route |
| **Account Lockout** | 5 failures → 30 min lock | Prevents password brute force |
| **Login History** | IP, user-agent, timestamp | Tracks all login attempts for auditing |
| **Password Reset** | Time-limited tokens | Prevents account takeover via email harvesting |

### Input Validation & Sanitization
| Protection | Implementation | Coverage |
|------------|-----------------|----------|
| **NoSQL Injection** | express-mongo-sanitize | Strips `$` and `.` from user input |
| **XSS (Stored)** | xss-clean + React escaping | Sanitizes req.body, req.query, URL params |
| **XSS (Reflected)** | Helmet CSP | Content-Security-Policy denies inline scripts |
| **Schema Validation** | express-validator | Name (letters only), email (RFC 5322), password (min 8 chars) |
| **Type Coercion** | Mongoose schema types | Enforces string/number/date types at DB level |

### Network & Transport Security
| Feature | Implementation | Details |
|---------|-----------------|---------|
| **Secure Headers** | Helmet.js | HSTS, X-Frame-Options, X-Content-Type, CSP |
| **CORS** | Restricted origin | Only allows localhost:3000 (configurable via `FRONTEND_URL`) |
| **HTTPS** | Enforced via Nginx | Reverse proxy terminates TLS in production |
| **Rate Limiting** | express-rate-limit | 100 req/15min global + per-route limits for login |
| **HTTP Parameter Pollution** | hpp middleware | Prevents parameter injection attacks |
| **Payload Limit** | 10KB JSON body limit | Prevents large payload denial-of-service |
| **HSTS Preload** | Included in Helmet | 1 year max-age + subdomains + preload |

### Logging & Monitoring
| Feature | Implementation | Logs Captured |
|---------|-----------------|-------------|
| **Winston Logger** | Three file streams | combined.log, error.log, security.log |
| **Request Logging** | Morgan + Winston stream | All HTTP requests with method, path, status, IP |
| **Security Events** | Custom logging | Failed logins, rate limit breaches, invalid tokens |
| **Anomaly Alerts** | ML service callback | Suspicious login patterns in real-time |
| **Error Tracking** | Structured logs | Stack traces, user context, timestamps |

### Container & Infrastructure
| Feature | Implementation | Details |
|---------|-----------------|---------|
| **Non-Root User** | Dockerfile USER directive | All containers run as unprivileged users |
| **Health Checks** | Compose healthcheck | Auto-restart failed containers |
| **Volume Mounts** | Read-only where possible | docker/mongo-init.js mounted as `:ro` |
| **Network Isolation** | Docker bridge network | Services only communicate via library_net |
| **Secrets Management** | .env file (git-ignored) | Never commit secrets; use environment variables |

---

## ⚠️ Vulnerability Demo (Educational)

### Purpose
The `/vuln-demo` page and `/api/auth/insecure-login` endpoint intentionally contain security flaws to demonstrate common mistakes and their fixes.

### Available Exploits

Navigate to http://localhost:3000/vuln-demo in the frontend to see interactive demos:

#### 1. **NoSQL Injection**
- **Endpoint**: `POST /api/auth/insecure-login`
- **Exploit Payload**:
  ```json
  {
    "email": {"$gt": ""},
    "password": {"$gt": ""}
  }
  ```
- **What Happens**: Bypasses authentication, logs in as first user in database
- **Root Cause**: Query constructed as `db.users.findOne(req.body)` without sanitization
- **Fix**: Use express-mongo-sanitize or parameterized queries

#### 2. **Cross-Site Scripting (XSS)**
- **Attack**: `<img src=x onerror="alert('XSS')" />`
- **Vulnerable Component**: Raw innerHTML in VulnDemo.js
- **Safe Implementation**: React auto-escapes JSX, prevents reflected XSS
- **Defense Layers**: CSP restricts inline scripts even if XSS succeeds

#### 3. **Insecure HTTP Headers**
- **Without Helmet**: No X-Frame-Options, CSP, HSTS
- **With Helmet**: Full suite of security headers protects against clickjacking, MIME sniffing, etc.

### Code Organization
```
backend/
├── controllers/authController.js
│   ├── insecureLogin()     # ⚠️ NoSQL injection vulnerable
│   └── secureLogin()       # ✅ Defended version
```

> **Note**: Vulnerable endpoints are clearly labeled, isolated, and disabled in production via role checks.

---

## 🤖 ML Anomaly Detection Service

### Overview
The `ml-service` is a Flask-based Python microservice that runs **Isolation Forest** (unsupervised machine learning) to detect anomalous login patterns in real-time.

### How It Works

**Model Type**: Isolation Forest
- Unsupervised learning (no labeled training data needed)
- Detects statistical outliers in login behavior
- Retrains automatically every 20 login events
- Configured with 10% contamination (expects ~10% anomalies)

### Features Analyzed Per Login

The model examines 7 dimensions of login behavior:

1. **Temporal Features**
   - Hour of day (0-23) — detects off-hours login attempts
   - Day of week (0-6) — weekend vs. weekday patterns
   - Time since last login — unusual gaps or rapid succession

2. **Geographic Features**
   - Is IP address new/unknown? (boolean flag)
   - Total unique IPs per user — excessive IP changes indicate compromise

3. **Behavioral Features**
   - Login frequency in past 24 hours — unusual spike
   - User-agent signature — detects bot/script logins vs. browser

4. **Risk Scoring**
   - Off-hours access flag (11pm–5am)
   - Anomaly score from Isolation Forest (-1 to +1)

### Example: Simulate Anomaly Detection

```bash
# Step 1: Generate 15 normal login events (train the model)
for i in {1..15}; do
  curl -s -X POST http://localhost:5000/api/auth/login \
    -H "Content-Type: application/json" \
    -H "User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64)" \
    -d '{"email":"user@library.com","password":"User@1234"}' \
    > /dev/null
  sleep 2  # Realistic spacing between logins
done

# Step 2: Generate anomalous login (rapid, bot user-agent, off-hours)
for i in {1..5}; do
  curl -s -X POST http://localhost:5000/api/auth/login \
    -H "Content-Type: application/json" \
    -H "User-Agent: python-requests/2.28.0" \
    -d '{"email":"user@library.com","password":"User@1234"}' \
    > /dev/null
  sleep 0.2  # Very rapid
done

# Step 3: View anomaly report
curl http://localhost:8000/api/anomalies | python3 -m json.tool

# Step 4: View in Admin Dashboard
# Navigate to: http://localhost:3000/admin-panel
# The anomalous logins appear in "Anomaly Report" section
```

### API Endpoints (ML Service)

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/login-event` | Backend submits login details for analysis |
| GET | `/api/anomalies` | Retrieve all detected anomalies |
| GET | `/api/user-profile/:email` | Get user's login profile & statistics |
| POST | `/api/retrain` | Force model retraining (admin only) |
| GET | `/health` | Service health check |

### ML Service Stack

- **Framework**: Flask (Python web framework)
- **Model**: scikit-learn Isolation Forest
- **Data Processing**: pandas, NumPy
- **Feature Scaling**: StandardScaler (normalize features for ML)
- **Storage**: In-memory (use Redis in production)
- **CORS**: Enabled for backend communication

---

## 🛡️ Security Testing & Validation

### Test Environment Setup

```bash
# Run the dev-enabled docker-compose
docker-compose --profile dev up --build

# All services start with health checks enabled
docker-compose ps  # Verify all services are "healthy"
```

### Security Testing Tools & Procedures

See `docs/security-testing.sh` for complete command reference.

#### 1. Wireshark (Network Traffic Analysis)
**Purpose**: Verify encryption and detect plaintext credential leakage

```bash
# Capture HTTP traffic
sudo wireshark -i lo -f "tcp.port == 5000 or tcp.port == 80"

# Test HTTP vs HTTPS exposure
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@library.com","password":"Admin@1234"}'

# Observation: Credentials visible in plaintext (HTTP only, not HTTPS)
```

#### 2. Burp Suite (Web Application Testing)
**Purpose**: Detect injection vulnerabilities, authentication flaws, rate limiting bypass

```bash
# Intercept requests via Burp proxy
# 1. Set browser proxy to localhost:8080
# 2. Navigate to http://localhost:3000
# 3. Attempt NoSQL injection in login form:
#    Email: {"$gt":""}
#    Password: {"$gt":""}
# Expected: Secure endpoint blocks; insecure endpoint (demo) succeeds
```

#### 3. Nmap (Port Scanning)
**Purpose**: Verify only necessary ports exposed

```bash
nmap -p- localhost
# Expected open ports:
#   80   - Frontend (Nginx)
#   5000 - Backend API
#   8000 - ML Service
#   27017 - MongoDB (should be closed in production!)
```

#### 4. Trivy (Container Vulnerability Scanning)
**Purpose**: Identify CVEs in base images and dependencies

```bash
# Scan backend image
docker build -t secure-library-backend ./backend
trivy image secure-library-backend

# Scan frontend image
docker build -t secure-library-frontend ./frontend
trivy image secure-library-frontend
```

#### 5. SonarQube (Static Code Analysis)
**Purpose**: Detect hardcoded secrets, code smells, security hotspots

```bash
# Run SonarQube container
docker run -d --name sonarqube -p 9000:9000 sonarqube:latest

# Analyze backend project
cd backend
npm install -g sonarqube-scanner
sonar-scanner \
  -Dsonar.projectKey=secure-library-backend \
  -Dsonar.sources=. \
  -Dsonar.host.url=http://localhost:9000 \
  -Dsonar.login=admin
```

### Key Findings & Mitigation Matrix

| Vulnerability | Tool | Secure Endpoint Behavior | Insecure Endpoint Behavior |
|---------------|------|--------------------------|---------------------------|
| NoSQL Injection | Burp Suite | Blocks `$` and `.` characters | Accepts and executes query operators |
| XSS | Burp Suite | React escapes output; CSP blocks inline scripts | Raw HTML rendered; alert executes |
| Weak Auth | Manual | JWT required; token validated | Bypassed with `{"$gt":""}` |
| Missing Headers | Wireshark | Helmet sets CSP, HSTS, X-Frame-Options | No security headers |
| Weak Crypto | Nmap | TLS 1.2+ (Nginx reverse proxy) | None (HTTP only in containers) |

---

## 📊 API Reference

### Authentication Routes (`/api/auth`)

| Method | Path | Rate Limit | Auth Required | Description |
|--------|------|-----------|---------------|-------------|
| POST | `/register` | 5/min | — | Register new user with email & password |
| POST | `/login` | 5/min | — | Secure login (bcrypt + JWT + refresh token) |
| POST | `/insecure-login` | — | — | ⚠️ Demo: NoSQL injection vulnerable |
| POST | `/refresh` | 10/min | httpOnly cookie | Refresh expired access token |
| POST | `/logout` | — | JWT | Clear refresh token & end session |
| GET | `/me` | — | JWT | Get current authenticated user profile |

**Request/Response Examples**:

```bash
# Register
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john@library.com",
    "password": "SecurePass@123"
  }'

# Response: { userId, message, token (access token in Authorization header) }

# Login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@library.com",
    "password": "SecurePass@123"
  }'

# Response: { accessToken, refreshToken (in httpOnly cookie), user { id, name, role } }

# Access protected route
curl -H "Authorization: Bearer <accessToken>" \
  http://localhost:5000/api/auth/me

# Response: { id, name, email, role, isActive, loginHistory }
```

### Books Routes (`/api/books`)

| Method | Path | Auth Required | Role Required | Description |
|--------|------|---------------|---------------|-------------|
| GET | `/` | — | — | List all books (search, filter, paginate) |
| GET | `/:id` | — | — | Get single book details |
| POST | `/` | JWT | librarian, admin | Add new book to inventory |
| PUT | `/:id` | JWT | librarian, admin | Update book details (title, author, count) |
| DELETE | `/:id` | JWT | admin | Remove book from catalog |
| POST | `/:id/borrow` | JWT | user | Borrow book (creates issue record) |

**Query Parameters** (for GET /):
```
?search=harry    # Search by title or author
?page=1&limit=10 # Pagination (default: 10 per page)
?available=true  # Filter by availability
?sort=-createdAt # Sort by field (- for desc)
```

**Request/Response Examples**:

```bash
# Add book
curl -X POST http://localhost:5000/api/books \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Clean Code",
    "author": "Robert Martin",
    "isbn": "978-0132350884",
    "totalCopies": 5,
    "description": "A handbook of agile software craftsmanship"
  }'

# Search books
curl "http://localhost:5000/api/books?search=clean&limit=20"

# Response: [{ id, title, author, isbn, totalCopies, availableCopies, createdAt }]
```

### Issues Routes (`/api/issues`)

| Method | Path | Auth Required | Role Required | Description |
|--------|------|---------------|---------------|-------------|
| GET | `/` | JWT | librarian, admin | View all book issues |
| GET | `/my` | JWT | user | Get books borrowed by current user |
| POST | `/` | JWT | librarian, admin | Issue (lend) book to user |
| PUT | `/:id/return` | JWT | user, librarian, admin | Return borrowed book |
| GET | `/:id/fines` | JWT | — | Calculate and retrieve fines |

**Issue Status Lifecycle**: `pending` → `issued` → `returned` (or `overdue`)

**Request/Response Examples**:

```bash
# Borrow book
curl -X POST http://localhost:5000/api/issues \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user-id-123",
    "bookId": "book-id-456",
    "issueDate": "2026-04-24"
  }'

# Response: { id, userId, bookId, issueDate, dueDate, status, fine }

# Return book
curl -X PUT http://localhost:5000/api/issues/issue-id-789/return \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{ "returnDate": "2026-05-10" }'

# Response: { message: "Book returned", fine: 50, issueId }

# Get my issues
curl -H "Authorization: Bearer <token>" \
  http://localhost:5000/api/issues/my

# Response: [{ id, bookTitle, dueDate, status, fine, returnDate }]
```

### Admin Routes (`/api/admin`)

| Method | Path | Auth Required | Role Required | Description |
|--------|------|---------------|---------------|-------------|
| GET | `/stats` | JWT | admin | Dashboard statistics (users, books, issues) |
| GET | `/anomalies` | JWT | admin | ML-detected suspicious login patterns |
| GET | `/users` | JWT | admin | List all users with roles & status |
| PATCH | `/users/:id/lock` | JWT | admin | Lock/unlock user account |
| DELETE | `/users/:id` | JWT | admin | Soft-delete user |
| GET | `/logs` | JWT | admin | Security & error logs |

**Request/Response Examples**:

```bash
# Get dashboard stats
curl -H "Authorization: Bearer <adminToken>" \
  http://localhost:5000/api/admin/stats

# Response:
# {
#   totalUsers: 42,
#   totalBooks: 150,
#   activeIssues: 28,
#   overdueBooks: 3,
#   totalFinesCollected: 5500,
#   anomalousLogins: 7
# }

# Get anomalies
curl -H "Authorization: Bearer <adminToken>" \
  http://localhost:5000/api/admin/anomalies

# Response: [{ userId, email, loginTime, anomalyScore, reason }]

# Lock user
curl -X PATCH http://localhost:5000/api/admin/users/user-id-789/lock \
  -H "Authorization: Bearer <adminToken>" \
  -H "Content-Type: application/json" \
  -d '{ "isLocked": true }'
```

### Error Response Format

All errors follow a consistent format:

```json
{
  "error": "Error message",
  "statusCode": 400,
  "details": {
    "field": "email",
    "message": "Invalid email format"
  },
  "timestamp": "2026-04-24T10:30:00Z"
}
```

**Common Status Codes**:
- `200` — Success
- `201` — Resource created
- `400` — Bad request (validation error)
- `401` — Unauthorized (missing/invalid token)
- `403` — Forbidden (insufficient permissions)
- `404` — Not found
- `429` — Too many requests (rate limited)
- `500` — Server error

---

## 💻 Local Development Setup (Without Docker)

For faster development iteration, run services locally instead of in containers.

### Prerequisites
- Node.js 20+
- Python 3.11+
- MongoDB Community Edition (or MongoDB Atlas)

### 1. Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Create .env file
cat > .env << EOF
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb://admin:changeme@localhost:27017/secure_library?authSource=admin
JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(64).toString('hex'))")
JWT_REFRESH_SECRET=$(node -e "console.log(require('crypto').randomBytes(64).toString('hex'))")
JWT_EXPIRE=15m
FRONTEND_URL=http://localhost:3000
ML_SERVICE_URL=http://localhost:8000
EOF

# Start backend (with auto-reload)
npm run dev
# Runs on http://localhost:5000
```

### 2. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Start dev server
npm start
# Runs on http://localhost:3000
```

### 3. ML Service Setup

```bash
cd ml-service

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Run Flask app
python app.py
# Runs on http://localhost:8000
```

### 4. MongoDB Setup

```bash
# Option A: Local MongoDB
mongod --dbpath ./data

# Option B: MongoDB Atlas
# Update MONGODB_URI in backend/.env with your connection string

# Option C: MongoDB in Docker
docker run -d --name mongodb \
  -e MONGO_INITDB_ROOT_USERNAME=admin \
  -e MONGO_INITDB_ROOT_PASSWORD=changeme \
  -p 27017:27017 \
  mongo:7.0
```

### 5. Seed Database & Run Migrations

#### Initialize with Default Users

```bash
# From backend directory
cd backend
node scripts/seed.js
# Adds default admin, librarian accounts with preset passwords
# Output: Shows admin@library.com and librarian@library.com credentials
```

#### Migration: Fix Legacy Issue Status (if needed)

If upgrading from an older version with the old issue workflow:

```bash
# Run migration script
cd backend
node scripts/migrate-issued-to-pending.js
# Converts old 'issued' records to 'pending' for librarian approval
```

For detailed information about these scripts, see the [Database Scripts & Utilities](#-database-scripts--utilities) section above.

---

## 🗂️ Project Architecture

### Directory Structure Explained

#### Backend (`backend/`)
```
controllers/        # Request handlers (auth, books, issues, admin)
middleware/         # Auth, validation, rate limiting middleware
models/             # Mongoose schemas (User, Book, Issue)
routes/             # Express route definitions
utils/              # Logger, helpers
scripts/            # Database seeding, migrations
logs/               # Application logs (auto-created, gitignored)
```

#### Frontend (`frontend/`)
```
public/             # Static assets (index.html)
src/
  components/       # Reusable React components
  context/          # React Context (AuthContext for auth state)
  pages/            # Full-page components (routed)
  utils/            # Axios API client with interceptors
  App.js            # Route definitions + ProtectedRoute wrapper
  index.js          # React entry point
```

#### ML Service (`ml-service/`)
```
app.py              # Flask app + Isolation Forest model
requirements.txt    # Python dependencies
```

#### Docker (`docker/`)
```
mongo-init.js       # MongoDB initialization script (seed users)
falco-rules.yaml    # Falco runtime security rules (optional)
filebeat.yml        # Beats log forwarding config (optional)
```

---

## 🔧 Environment Variables Reference

### Backend `.env`

| Variable | Example | Purpose |
|----------|---------|---------|
| `NODE_ENV` | `production` | Runtime environment |
| `PORT` | `5000` | Backend listening port |
| `MONGODB_URI` | `mongodb://user:pass@host:27017/db` | Database connection |
| `JWT_SECRET` | (64 hex chars) | Access token signing key |
| `JWT_REFRESH_SECRET` | (64 hex chars) | Refresh token signing key |
| `JWT_EXPIRE` | `15m` | Access token TTL |
| `FRONTEND_URL` | `http://localhost:3000` | CORS allowed origin |
| `ML_SERVICE_URL` | `http://localhost:8000` | Anomaly detection service |
| `MONGO_USER` | `admin` | MongoDB username |
| `MONGO_PASSWORD` | `changeme` | MongoDB password |

### Frontend `.env`

| Variable | Example | Purpose |
|----------|---------|---------|
| `REACT_APP_API_URL` | `http://localhost:5000` | Backend API base URL |
| `REACT_APP_LOG_LEVEL` | `info` | Client-side logging level |

### Docker Compose `.env`

| Variable | Example | Purpose |
|----------|---------|---------|
| `NODE_ENV` | `production` | Backend environment |
| `MONGO_USER` | `admin` | MongoDB admin user |
| `MONGO_PASSWORD` | `changeme` | MongoDB admin password |
| `JWT_SECRET` | (64 hex) | Backend JWT secret |
| `JWT_REFRESH_SECRET` | (64 hex) | Backend refresh secret |
| `FRONTEND_URL` | `http://localhost` | CORS origin |

---

## 🐛 Troubleshooting

### Backend Issues

**Problem**: `MongooseError: Cannot connect to MongoDB`
```bash
# Solution 1: Check MongoDB is running
docker-compose ps mongo
# or check local MongoDB: mongo --version

# Solution 2: Verify MONGODB_URI in .env
# Format: mongodb://user:password@host:port/database?authSource=admin

# Solution 3: Check credentials match docker-compose
env | grep MONGO_
```

**Problem**: `Address already in use :5000`
```bash
# Kill process on port 5000
# Linux/Mac
lsof -ti:5000 | xargs kill -9

# Windows
netstat -ano | findstr :5000
taskkill /PID <PID> /F
```

**Problem**: `JWT_SECRET is undefined`
```bash
# Solution: Generate and add to .env
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
# Copy output to JWT_SECRET in .env
```

### Frontend Issues

**Problem**: `Proxy error: Could not proxy request...`
```bash
# Solution: Backend is not running
# In backend directory: npm run dev

# Also check REACT_APP_API_URL in frontend .env
```

**Problem**: CORS error in browser console
```bash
# Solution: Update FRONTEND_URL in backend .env
# For local dev: FRONTEND_URL=http://localhost:3000
# For prod: FRONTEND_URL=https://yourdomain.com

# Then restart backend
```

**Problem**: Login returns 401 "Invalid token"
```bash
# Solution 1: Clear browser cookies
# DevTools → Application → Cookies → Delete refreshToken

# Solution 2: Check token expiry
# JWT tokens expire; frontend should auto-refresh
# Check AuthContext.js for refresh logic

# Solution 3: Verify JWT_SECRET hasn't changed
# Token was signed with old secret; must logout & login again
```

### Docker Issues

**Problem**: `Container exits with code 127 or 1`
```bash
# Check logs
docker-compose logs backend
docker-compose logs ml-service

# Rebuild image
docker-compose down
docker-compose up --build
```

**Problem**: Port conflicts (port already allocated)
```bash
# List running containers
docker ps

# Stop conflicting container
docker stop <container_name>

# Or change port in docker-compose.yml
```

**Problem**: MongoDB container doesn't initialize users
```bash
# Solution: Volume might be persisted with old config
docker-compose down -v  # Remove volumes
docker-compose up --build  # Rebuild
# If still issues: manually run mongo-init.js script
```

### ML Service Issues

**Problem**: ML service returns `No model trained yet`
```bash
# Solution: Generate login events to train model
# See "Simulate Anomaly Detection" section above
# Need ~15-20 login events before model trains

# Check ML service logs
docker-compose logs ml-service
```

**Problem**: Backend returns `Connection refused to ml-service:8000`
```bash
# Solution 1: ML service not running
docker-compose ps ml-service  # Should show "running"

# Solution 2: Check network connectivity
docker-compose exec backend curl http://ml-service:8000/health

# Solution 3: Restart both services
docker-compose restart backend ml-service
```

---

## 📚 Learning Resources

### Security Topics Covered
- **OWASP Top 10**: Injection, Broken Auth, Sensitive Data, XXE, Broken AC, Security Misconfiguration, XSS, Insecure Deserialization, Using Vulnerable Components, Insufficient Logging

- **Authentication**: bcrypt hashing, JWT tokens, refresh token rotation, account lockout

- **Authorization**: RBAC model (user/librarian/admin), middleware-based access control

- **Input Validation**: Schema validation, type coercion, whitelist filtering

- **Web Security**: CSP headers, HSTS, CORS, rate limiting, payload size limits

- **ML Security**: Anomaly detection for suspicious behavior, model retraining, feature engineering

### Key Files to Study
- [backend/middleware/auth.js](backend/middleware/auth.js) — JWT protection & RBAC
- [backend/controllers/authController.js](backend/controllers/authController.js) — Secure vs. insecure login
- [backend/models/User.js](backend/models/User.js) — Password hashing + lockout logic
- [ml-service/app.py](ml-service/app.py) — Anomaly detection model
- [frontend/src/context/AuthContext.js](frontend/src/context/AuthContext.js) — Client-side auth state

### Recommended Reading
- [OWASP Secure Coding Practices](https://owasp.org/www-project-secure-coding-practices-quick-reference-guide/)
- [JWT Best Practices](https://tools.ietf.org/html/rfc7519)
- [MongoDB Security Checklist](https://docs.mongodb.com/manual/administration/security-checklist/)
- [Express Security Best Practices](https://expressjs.com/en/advanced/best-practice-security.html)

---

## 📝 License

This project is provided as-is for educational purposes. See [LICENSE](LICENSE) file for details.

---

## 🤝 Contributing

Contributions are welcome! To contribute:

1. **Fork** the repository
2. **Create** a feature branch: `git checkout -b feature/your-feature`
3. **Commit** changes: `git commit -m 'Add feature X'`
4. **Push** to branch: `git push origin feature/your-feature`
5. **Submit** a Pull Request

### Guidelines
- Follow the existing code style
- Add tests for new features
- Update README for breaking changes
- Ensure all tests pass: `npm test`

---

## ❓ FAQ

**Q: Can I use this in production?**  
A: This is an educational project. For production: use HTTPS, real secrets management (HashiCorp Vault), database backups, CDN for assets, load balancing, and professional security audits.

**Q: How do I deploy to AWS/Azure/GCP?**  
A: Use Docker images + Kubernetes or container services (ECS, AKS, Cloud Run). See deployment guides for your platform.

**Q: Is the vulnerable endpoint really accessible?**  
A: Only the `/api/auth/insecure-login` endpoint is intentionally vulnerable. All other endpoints are protected. The demo endpoint is clearly marked and isolated.

**Q: What if I forget the admin password?**  
A: Reset via MongoDB:
```bash
# Connect to MongoDB
mongosh mongodb://admin:changeme@localhost:27017
use secure_library
db.users.updateOne(
  { email: "admin@library.com" },
  { $set: { password: bcrypt_hash_of_new_password } }
)
```

**Q: How often does the ML model retrain?**  
A: After every 20 new login events. Can be manually triggered via `/api/retrain` endpoint.

---

## 📧 Support

For issues, questions, or suggestions:
1. Check [Troubleshooting](#-troubleshooting) section above
2. Review [docs/security-testing.sh](docs/security-testing.sh) for testing guidance
3. Open an issue on GitHub with detailed description

---

**Built with ❤️ for learning secure full-stack development.**
