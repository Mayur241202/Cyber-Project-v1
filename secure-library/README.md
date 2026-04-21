# 🔐 Secure Online Library Management System
### MERN Stack + ML Anomaly Detection + Docker + Security Testing

---

## Project Overview

A full-stack, security-hardened Library Management System built with the MERN stack.  
Intentionally includes a **vulnerable endpoint** for education, then demonstrates best-practice fixes.

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

## 🚀 Quick Start

### Prerequisites
- Docker + Docker Compose
- Node.js 20+ (for local dev)
- Python 3.11+ (for local ML dev)

### 1. Clone and configure
```bash
git clone <repo>
cd secure-library

# Set up secrets
cp .env.example .env
# Edit .env — generate real JWT secrets:
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### 2. Start with Docker
```bash
# Production mode
docker-compose up --build -d

# Development mode (includes Mongo Express UI)
docker-compose --profile dev up --build

# View logs
docker-compose logs -f backend
docker-compose logs -f ml-service
```

### 3. Access the app
| Service        | URL                          |
|----------------|------------------------------|
| Frontend       | http://localhost             |
| Backend API    | http://localhost:5000        |
| ML Service     | http://localhost:8000        |
| Mongo Express  | http://localhost:8081 (dev)  |

### Default admin login
```
Email:    admin@library.com
Password: Admin@1234
```
> Change this immediately in production!

---

## 🔒 Security Features Summary

| Feature | Implementation |
|--------|----------------|
| Password Hashing | bcrypt (12 rounds) |
| Authentication | JWT (15min access + 7d refresh in httpOnly cookie) |
| Authorization | Role-based (user / librarian / admin) |
| Input Validation | express-validator on all inputs |
| NoSQL Injection Prevention | express-mongo-sanitize |
| XSS Prevention | xss-clean + Helmet CSP |
| Secure Headers | Helmet.js (HSTS, X-Frame, CSP, noSniff) |
| Rate Limiting | express-rate-limit (per-route, per-IP) |
| Account Lockout | 5 failed logins → 30 min lock |
| JWT Security | Algorithm pinned (HS256), expiry enforced |
| Audit Logging | Winston (combined, error, security logs) |
| HTTP Param Pollution | hpp middleware |
| Payload Size Limit | express JSON limit: 10kb |
| Anomaly Detection | Isolation Forest (scikit-learn) |
| Container Security | Non-root users in all Dockerfiles |
| DB Security | MongoDB least-privilege app user |

---

## ⚠️ Vulnerability Demo

Navigate to `/vuln-demo` in the frontend (or POST to `/api/auth/insecure-login`) to see:

1. **NoSQL Injection** — `{"$gt":""}` payload bypasses authentication
2. **XSS** — unsafe innerHTML vs React escaping
3. **Insecure Headers** — before/after Helmet comparison

The vulnerable code is **clearly labeled** and **isolated** — it has no production use.

---

## 🤖 ML Anomaly Detection

The `ml-service` uses **Isolation Forest** (unsupervised ML) to detect unusual logins.

**Features analyzed per login event:**
- Hour of day & day of week
- Is it a new/unknown IP address?
- Time since last login
- Login frequency in past 24 hours
- User-agent (detects bots/scripts)
- Off-hours access (11pm–5am)
- Total unique IPs per user

**How to see it in action:**
```bash
# Simulate normal logins
for i in {1..15}; do
  curl -s -X POST http://localhost:5000/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"user@test.com","password":"User@1234"}'
  sleep 1
done

# Simulate anomalous login (bot user-agent + rapid requests)
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -H "User-Agent: python-requests/2.28" \
  -d '{"email":"user@test.com","password":"User@1234"}'

# View anomalies in Admin Panel or via API:
curl http://localhost:8000/api/anomalies | python3 -m json.tool
```

The model auto-retrains every 20 login events.

---

## 🛡️ Security Testing (Summary)

See `docs/security-testing.sh` for full commands.

| Tool | What to Test | Key Finding |
|------|-------------|-------------|
| **Wireshark** | HTTP vs HTTPS | Passwords visible in HTTP plaintext |
| **Burp Suite** | NoSQL injection, rate limiting, JWT tampering | Insecure endpoint exploitable; secure endpoint blocks all attacks |
| **Nmap** | Open ports | Only port 80 should be exposed in production |
| **Trivy** | Container CVEs + misconfigs | Scans all images for known vulnerabilities |
| **SonarQube** | Static code analysis | Detects hardcoded secrets, injection risks, code smells |

---

## 📊 API Reference

### Auth Routes (`/api/auth`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | /register | — | Register new user |
| POST | /login | — | Secure login (rate limited) |
| POST | /insecure-login | — | ⚠️ Demo vulnerable endpoint |
| POST | /refresh | cookie | Refresh access token |
| POST | /logout | JWT | Logout + clear cookie |
| GET | /me | JWT | Get current user |

### Book Routes (`/api/books`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | / | — | List books (search, filter, paginate) |
| GET | /:id | — | Get single book |
| POST | / | librarian/admin | Add book |
| PUT | /:id | librarian/admin | Update book |
| DELETE | /:id | admin | Delete book |

### Issue Routes (`/api/issues`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | /my | JWT | Get my issued books |
| POST | / | librarian/admin | Issue book to user |
| PUT | /:id/return | JWT | Return book |
| GET | / | librarian/admin | All issues |

### Admin Routes (`/api/admin`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | /stats | admin | Dashboard statistics |
| GET | /anomalies | admin | ML anomaly report |
| GET | /users | admin | All users |
| PATCH | /users/:id/toggle-lock | admin | Activate/deactivate user |
