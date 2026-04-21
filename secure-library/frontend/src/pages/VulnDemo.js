// src/pages/VulnDemo.js — Educational Vulnerability Demonstration
import React, { useState } from 'react';
import api from '../utils/api';

const VulnDemo = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('nosql');

  const tryInsecureLogin = async () => {
    setLoading(true); setResult(null);
    try {
      const { data } = await api.post('/auth/insecure-login', { email, password });
      setResult({ type: 'success', data });
    } catch (err) {
      setResult({ type: 'error', data: err.response?.data });
    } finally { setLoading(false); }
  };

  const injectionPayloads = [
    { label: 'Normal Login', email: 'admin@library.com', pass: 'Admin@1234' },
    { label: '⚠️ NoSQL Injection (bypass password)', email: 'admin@library.com', pass: { '$gt': '' } },
    { label: '⚠️ NoSQL Injection (any user)', email: { '$gt': '' }, pass: { '$gt': '' } },
    { label: '⚠️ NoSQL Regex (email enumeration)', email: { '$regex': '.*admin.*' }, pass: { '$gt': '' } },
  ];

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <h1>⚠️ Security Vulnerability Demo</h1>
        <p style={styles.warning}>
          <strong>EDUCATIONAL PURPOSE ONLY.</strong> These attacks are demonstrated on purpose-built
          vulnerable endpoints. Never use against real systems.
        </p>
      </div>

      <div style={styles.tabs}>
        {['nosql', 'xss', 'headers'].map(tab => (
          <button key={tab} style={activeTab === tab ? styles.tabActive : styles.tab}
            onClick={() => setActiveTab(tab)}>
            {tab === 'nosql' ? '💉 NoSQL Injection' : tab === 'xss' ? '🔐 XSS Prevention' : '🛡️ Secure Headers'}
          </button>
        ))}
      </div>

      {activeTab === 'nosql' && (
        <div style={styles.content}>
          <h2>NoSQL Injection Attack & Defense</h2>

          <div style={styles.twoCol}>
            <div style={styles.col}>
              <h3 style={{color:'#c53030'}}>❌ Vulnerable Endpoint</h3>
              <code style={styles.code}>{`POST /api/auth/insecure-login

// Backend code:
const user = await User.findOne({
  email: email,    // Raw input!
  password: password
});`}</code>

              <h4>Try these payloads:</h4>
              {injectionPayloads.map((p, i) => (
                <button key={i} style={styles.payloadBtn} onClick={() => {
                  setEmail(typeof p.email === 'string' ? p.email : JSON.stringify(p.email));
                  setPassword(typeof p.pass === 'string' ? p.pass : JSON.stringify(p.pass));
                }}>
                  {p.label}
                </button>
              ))}

              <div style={styles.inputGroup}>
                <input style={styles.input} placeholder="Email or JSON payload"
                  value={email} onChange={e => setEmail(e.target.value)} />
                <input style={styles.input} placeholder='Password or {"$gt":""}' 
                  value={password} onChange={e => setPassword(e.target.value)} />
                <button style={styles.btnDanger} onClick={tryInsecureLogin} disabled={loading}>
                  {loading ? 'Sending...' : '🚀 Send to Vulnerable Endpoint'}
                </button>
              </div>

              {result && (
                <div style={result.type === 'success' ? styles.resultSuccess : styles.resultError}>
                  <strong>Response:</strong>
                  <pre>{JSON.stringify(result.data, null, 2)}</pre>
                </div>
              )}
            </div>

            <div style={styles.col}>
              <h3 style={{color:'#276749'}}>✅ Fixed Endpoint</h3>
              <code style={styles.code}>{`POST /api/auth/login

// Fixes applied:
// 1. express-mongo-sanitize strips $
app.use(mongoSanitize());

// 2. Fetch user, then bcrypt compare
const user = await User.findOne({ 
  email: email.toLowerCase()  // string only
}).select('+password');

const valid = await bcrypt.compare(
  password, user.password
);

// 3. Input validated with express-validator
body('email').isEmail().normalizeEmail()
body('password').isLength({ max: 128 })`}</code>

              <div style={styles.fixBox}>
                <h4>🔒 Defenses Applied:</h4>
                <ul>
                  <li><strong>express-mongo-sanitize</strong>: Strips <code>$</code> operators from req.body</li>
                  <li><strong>express-validator</strong>: Enforces email format, max length</li>
                  <li><strong>bcrypt.compare()</strong>: Timing-safe password check (not DB query)</li>
                  <li><strong>Account lockout</strong>: 5 fails → 30-min lock</li>
                  <li><strong>Generic errors</strong>: No info disclosure</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'xss' && (
        <div style={styles.content}>
          <h2>XSS (Cross-Site Scripting) Prevention</h2>
          <div style={styles.twoCol}>
            <div style={styles.col}>
              <h3 style={{color:'#c53030'}}>❌ Vulnerable Pattern</h3>
              <code style={styles.code}>{`// Directly setting innerHTML (NEVER do this!)
div.innerHTML = userInput;

// Or in React (NEVER do this!)
<div dangerouslySetInnerHTML={{__html: userInput}} />`}</code>
              <p>Attack payload: <code>{'<script>alert(document.cookie)</script>'}</code></p>
            </div>
            <div style={styles.col}>
              <h3 style={{color:'#276749'}}>✅ Fixed Pattern</h3>
              <code style={styles.code}>{`// Backend: xss-clean middleware
app.use(xss()); // Sanitizes input

// Backend: express-validator .escape()
body('name').trim().escape();

// Frontend: React escapes by default
<div>{userInput}</div> // Safe!

// Helmet CSP header prevents inline scripts
contentSecurityPolicy: {
  scriptSrc: ["'self'"]
}`}</code>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'headers' && (
        <div style={styles.content}>
          <h2>Secure HTTP Headers (Helmet.js)</h2>
          <table style={styles.table}>
            <thead>
              <tr><th>Header</th><th>Value</th><th>Protection</th></tr>
            </thead>
            <tbody>
              {[
                ['X-Content-Type-Options', 'nosniff', 'Prevents MIME sniffing attacks'],
                ['X-Frame-Options', 'SAMEORIGIN', 'Prevents Clickjacking'],
                ['Strict-Transport-Security', 'max-age=31536000; includeSubDomains', 'Enforces HTTPS'],
                ['Content-Security-Policy', "default-src 'self'", 'Prevents XSS, injection'],
                ['X-XSS-Protection', '1; mode=block', 'Browser XSS filter'],
                ['Referrer-Policy', 'strict-origin-when-cross-origin', 'Limits referrer info leakage'],
              ].map(([h, v, p]) => (
                <tr key={h}><td><code>{h}</code></td><td style={{fontSize:'12px'}}>{v}</td><td>{p}</td></tr>
              ))}
            </tbody>
          </table>
          <p style={{marginTop:'1rem'}}>
            Test with: <code>curl -I http://localhost:5000/health</code>
          </p>
        </div>
      )}
    </div>
  );
};

const styles = {
  page: { maxWidth:'1100px', margin:'2rem auto', padding:'0 1rem', fontFamily:'monospace' },
  header: { background:'#fffbeb', border:'2px solid #f6ad55', borderRadius:'8px', padding:'1rem 1.5rem', marginBottom:'1.5rem' },
  warning: { color:'#744210', margin:0 },
  tabs: { display:'flex', gap:'0.5rem', marginBottom:'1.5rem' },
  tab: { padding:'0.5rem 1.25rem', border:'2px solid #e2e8f0', borderRadius:'8px', cursor:'pointer', background:'white', fontSize:'14px' },
  tabActive: { padding:'0.5rem 1.25rem', border:'2px solid #3182ce', borderRadius:'8px', cursor:'pointer', background:'#ebf8ff', fontSize:'14px', fontWeight:'bold' },
  content: { background:'white', borderRadius:'12px', padding:'1.5rem', boxShadow:'0 2px 10px rgba(0,0,0,0.08)' },
  twoCol: { display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1.5rem' },
  col: { background:'#f7fafc', borderRadius:'8px', padding:'1rem' },
  code: { display:'block', background:'#1a202c', color:'#68d391', padding:'1rem', borderRadius:'8px', fontSize:'12px', whiteSpace:'pre', overflowX:'auto', marginBottom:'1rem' },
  payloadBtn: { display:'block', width:'100%', textAlign:'left', padding:'0.5rem', margin:'0.25rem 0', background:'#fed7d7', border:'1px solid #fc8181', borderRadius:'6px', cursor:'pointer', fontSize:'13px' },
  inputGroup: { marginTop:'1rem' },
  input: { width:'100%', padding:'0.6rem', margin:'0.3rem 0', border:'1px solid #e2e8f0', borderRadius:'6px', fontSize:'13px', boxSizing:'border-box', fontFamily:'monospace' },
  btnDanger: { width:'100%', padding:'0.6rem', background:'#c53030', color:'white', border:'none', borderRadius:'6px', cursor:'pointer', marginTop:'0.5rem' },
  resultSuccess: { background:'#f0fff4', border:'1px solid #68d391', borderRadius:'6px', padding:'0.75rem', marginTop:'1rem', fontSize:'12px' },
  resultError: { background:'#fff5f5', border:'1px solid #fc8181', borderRadius:'6px', padding:'0.75rem', marginTop:'1rem', fontSize:'12px' },
  fixBox: { background:'#f0fff4', border:'1px solid #68d391', borderRadius:'8px', padding:'1rem', marginTop:'1rem' },
  table: { width:'100%', borderCollapse:'collapse', fontSize:'13px' },
};

export default VulnDemo;
