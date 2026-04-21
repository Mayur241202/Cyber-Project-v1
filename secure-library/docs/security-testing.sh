# Security Testing Guide
# Secure Online Library Management System

## ─────────────────────────────────────────────────────────────────
## 1. SETUP: Start the Application
## ─────────────────────────────────────────────────────────────────

# Copy env file and set secrets
cp backend/.env.example backend/.env
# Edit .env and set strong JWT_SECRET and JWT_REFRESH_SECRET:
# node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# Start all services
docker-compose up --build -d

# Verify all containers are healthy
docker-compose ps
docker-compose logs backend --tail=20
docker-compose logs ml-service --tail=20

# Application URLs:
#   Frontend:    http://localhost
#   Backend API: http://localhost:5000
#   ML Service:  http://localhost:8000
#   Mongo Admin: docker-compose --profile dev up  → http://localhost:8081


## ─────────────────────────────────────────────────────────────────
## 2. WIRESHARK: HTTP vs HTTPS Traffic Analysis
## ─────────────────────────────────────────────────────────────────

# STEP 1: Capture HTTP traffic (insecure - plaintext visible)
# Open Wireshark → Select your network interface (eth0 / lo)
# Filter: http && tcp.port == 5000
# Then run:
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@library.com","password":"Admin@1234"}'

# In Wireshark you will see the PASSWORD IN PLAINTEXT in the packet payload.
# Right-click packet → Follow → TCP Stream to see full request/response.

# STEP 2: Capture HTTPS traffic (secure - encrypted)
# For HTTPS demo, generate self-signed cert:
openssl req -x509 -newkey rsa:4096 -keyout key.pem -out cert.pem -days 365 -nodes \
  -subj "/CN=localhost"

# Set in backend .env: NODE_ENV=production  (Helmet adds HSTS header)
# In Wireshark, all data appears as encrypted TLS Application Data.

# COMPARISON TABLE:
# ┌─────────────────────────────┬────────────────────────────────┐
# │         HTTP                │          HTTPS                 │
# ├─────────────────────────────┼────────────────────────────────┤
# │ Password visible in Wireshk │ All data encrypted (TLS)       │
# │ JWT token stolen easily     │ Cannot read tokens/passwords   │
# │ MITM attack possible        │ Certificate validates server   │
# └─────────────────────────────┴────────────────────────────────┘


## ─────────────────────────────────────────────────────────────────
## 3. BURP SUITE: SQL/NoSQL Injection Testing
## ─────────────────────────────────────────────────────────────────

# SETUP:
# 1. Open Burp Suite Community Edition
# 2. Proxy → Options → Proxy Listener: 127.0.0.1:8080
# 3. Browser → Settings → Manual Proxy → 127.0.0.1:8080

# ATTACK 1: Test INSECURE endpoint (should work)
# Burp Repeater → POST http://localhost:5000/api/auth/insecure-login
# Body:
{"email": {"$gt": ""}, "password": {"$gt": ""}}

# Expected: 200 OK — attacker bypasses authentication!
# This succeeds because MongoDB interprets $gt:"" as "match anything"

# ATTACK 2: Test SECURE endpoint (should fail)
# POST http://localhost:5000/api/auth/login
# Body:
{"email": {"$gt": ""}, "password": {"$gt": ""}}

# Expected: 400 Bad Request — express-mongo-sanitize strips $operators
# The $gt never reaches MongoDB

# ATTACK 3: Rate limiting test with Burp Intruder
# Target: POST /api/auth/login
# Payload type: Simple list of passwords
# Set 15+ rapid requests → You should get 429 after 10 attempts

# ATTACK 4: Header injection
# Add header: X-Forwarded-For: 127.0.0.1
# Add header: X-Original-URL: /api/admin/users
# Expected: Still blocked by JWT auth middleware

# ATTACK 5: JWT manipulation
# Decode JWT at jwt.io
# Try changing "role":"user" to "role":"admin"
# Re-sign with wrong secret → Should get 401 Unauthorized
# Try alg:none attack: {"alg":"none"} → Blocked (algorithms:['HS256'] specified)

# BURP SCANNER (Pro) or manual payloads to test:
NOSQL_PAYLOADS=(
  '{"$gt":""}'
  '{"$ne":null}'
  '{"$where":"sleep(5000)"}'
  '{"$regex":".*"}'
)


## ─────────────────────────────────────────────────────────────────
## 4. NMAP: Port Scanning
## ─────────────────────────────────────────────────────────────────

# Basic scan - discover open ports
nmap -sV localhost

# Expected output:
# PORT     STATE SERVICE
# 80/tcp   open  nginx (frontend)
# 5000/tcp open  node  (backend API)
# 8000/tcp open  python/gunicorn (ML service)
# 27017/tcp open  mongodb (should be CLOSED in production!)

# Aggressive scan with OS detection
nmap -A -T4 localhost

# Check for vulnerabilities
nmap --script vuln localhost

# UDP scan
nmap -sU localhost

# PRODUCTION HARDENING (close unnecessary ports):
# In docker-compose.yml, remove these port mappings for production:
#   - Remove "27017:27017" from mongo service (only accessible internally)
#   - Remove "8000:8000" from ml-service (only backend needs it)
#   - Remove "8081:8081" from mongo-express

# After hardening, only port 80 (or 443) should be exposed:
nmap -sV --open localhost
# Should only show: 80/tcp open  http


## ─────────────────────────────────────────────────────────────────
## 5. TRIVY: Container Vulnerability Scanning
## ─────────────────────────────────────────────────────────────────

# Install Trivy
curl -sfL https://raw.githubusercontent.com/aquasecurity/trivy/main/contrib/install.sh | sh -s -- -b /usr/local/bin v0.47.0

# Scan Docker images for CVEs
trivy image secure-library-backend
trivy image secure-library-frontend
trivy image secure-library-ml-service

# Scan with severity filter (only HIGH and CRITICAL)
trivy image --severity HIGH,CRITICAL secure-library-backend

# Scan for misconfigurations in Dockerfile
trivy config ./backend/Dockerfile
trivy config ./frontend/Dockerfile
trivy config ./docker-compose.yml

# Generate JSON report
trivy image --format json --output trivy-report.json secure-library-backend

# Scan filesystem (dependencies)
trivy fs ./backend --severity HIGH,CRITICAL
trivy fs ./frontend --severity HIGH,CRITICAL

# What Trivy checks:
# ✅ OS package vulnerabilities (Alpine, Debian CVEs)
# ✅ Language library vulnerabilities (npm, pip CVEs)
# ✅ Dockerfile misconfigurations
# ✅ Docker Compose misconfigurations
# ✅ Secrets accidentally committed


## ─────────────────────────────────────────────────────────────────
## 6. SONARQUBE: Static Code Analysis
## ─────────────────────────────────────────────────────────────────

# Start SonarQube with Docker
docker run -d --name sonarqube \
  -p 9000:9000 \
  -e SONAR_ES_BOOTSTRAP_CHECKS_DISABLE=true \
  sonarqube:community

# Wait ~60 seconds, then open: http://localhost:9000
# Default login: admin / admin → change password on first login

# Create project:
# 1. Click "Create Project" → "Manually"
# 2. Name: "secure-library"
# 3. Generate a token (save it!)

# Install SonarScanner
npm install -g sonar-scanner

# Create sonar-project.properties in project root:
cat > sonar-project.properties << 'EOF'
sonar.projectKey=secure-library
sonar.projectName=Secure Online Library
sonar.projectVersion=1.0
sonar.sources=backend,frontend/src,ml-service
sonar.exclusions=**/node_modules/**,**/build/**,**/*.test.js
sonar.javascript.lcov.reportPaths=coverage/lcov.info
sonar.python.coverage.reportPaths=coverage.xml
EOF

# Run analysis
sonar-scanner \
  -Dsonar.host.url=http://localhost:9000 \
  -Dsonar.login=<YOUR_TOKEN>

# What SonarQube detects:
# 🔴 BUGS:      Logic errors, null dereferences
# 🔴 SECURITY:  SQL injection, XSS, hardcoded secrets, insecure crypto
# 🟡 CODE SMELLS: Duplications, complexity, unused vars
# ✅ Coverage:  Shows test coverage gaps

# Security Hotspots to look for in our code:
# - Hardcoded credentials (should catch .env.example weak secrets)
# - JWT secret strength
# - Missing input validation
# - Exposed stack traces


## ─────────────────────────────────────────────────────────────────
## 7. MANUAL SECURITY TESTS (curl)
## ─────────────────────────────────────────────────────────────────

BASE="http://localhost:5000/api"

# Test: Secure headers
echo "=== Security Headers ==="
curl -I $BASE/../health | grep -E "X-Content|X-Frame|Strict|Content-Security"

# Test: Rate limiting (run 11 times)
echo "=== Rate Limit Test ==="
for i in {1..12}; do
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST $BASE/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"test@x.com","password":"wrong"}')
  echo "Attempt $i: HTTP $STATUS"
done

# Test: Large payload (should reject)
echo "=== Large Payload Test ==="
LARGE_PAYLOAD=$(python3 -c "print('A'*20000)")
curl -s -o /dev/null -w "%{http_code}" -X POST $BASE/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$LARGE_PAYLOAD\",\"password\":\"test\"}"

# Test: JWT algorithm confusion
echo "=== JWT alg:none Test ==="
# Forge token with alg:none (base64url encode header and payload, empty signature)
FAKE_TOKEN="eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJpZCI6IjEyMyIsInJvbGUiOiJhZG1pbiJ9."
curl -s -w "\nHTTP: %{http_code}\n" $BASE/auth/me \
  -H "Authorization: Bearer $FAKE_TOKEN"
# Expected: 401 Unauthorized

# Test: Path traversal
echo "=== Path Traversal Test ==="
curl -s -w "HTTP: %{http_code}\n" "$BASE/../../../etc/passwd"

# Test: HTTP Verb tampering
echo "=== Verb Tampering Test ==="
curl -s -w "HTTP: %{http_code}\n" -X TRACE $BASE/auth/login
