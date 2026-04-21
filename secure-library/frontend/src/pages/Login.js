// src/pages/Login.js
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';

const Login = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  // ✅ SECURE LOGIN
  const handleSecureLogin = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      await login(form.email, form.password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed.');
    } finally { setLoading(false); }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h2 style={styles.title}>🔐 Secure Library Login</h2>

        {error && <div style={styles.error}>{error}</div>}

        <form onSubmit={handleSecureLogin}>
          <input style={styles.input} type="email" name="email" placeholder="Email"
            value={form.email} onChange={handleChange} required />
          <input style={styles.input} type="password" name="password" placeholder="Password"
            value={form.password} onChange={handleChange} required />
          <button style={styles.btnPrimary} type="submit" disabled={loading}>
            {loading ? 'Logging in...' : '✅ Secure Login'}
          </button>
        </form>

        <p style={styles.link}>
          No account? <Link to="/register">Register</Link>
        </p>
        <p style={styles.link}>
          <Link to="/vuln-demo">⚠️ View Vulnerability Demo</Link>
        </p>
      </div>
    </div>
  );
};

const styles = {
  container: { display:'flex', justifyContent:'center', alignItems:'center', minHeight:'100vh', background:'#f0f4f8' },
  card: { background:'white', padding:'2rem', borderRadius:'12px', boxShadow:'0 4px 20px rgba(0,0,0,0.1)', width:'380px' },
  title: { textAlign:'center', marginBottom:'1.5rem', color:'#1a202c' },
  input: { width:'100%', padding:'0.75rem', margin:'0.5rem 0', border:'1px solid #e2e8f0', borderRadius:'8px', fontSize:'14px', boxSizing:'border-box' },
  btnPrimary: { width:'100%', padding:'0.75rem', background:'#3182ce', color:'white', border:'none', borderRadius:'8px', cursor:'pointer', fontSize:'16px', marginTop:'0.5rem' },
  error: { background:'#fff5f5', color:'#c53030', padding:'0.75rem', borderRadius:'8px', marginBottom:'1rem', fontSize:'14px' },
  link: { textAlign:'center', marginTop:'1rem', fontSize:'14px' },
};

export default Login;
