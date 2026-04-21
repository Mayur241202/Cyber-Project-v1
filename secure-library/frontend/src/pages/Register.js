// src/pages/Register.js
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Register = () => {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name:'', email:'', password:'' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      await register(form.name, form.email, form.password);
      navigate('/dashboard');
    } catch (err) {
      const errs = err.response?.data?.errors;
      setError(errs ? errs.map(e=>e.msg).join(', ') : err.response?.data?.error || 'Registration failed.');
    } finally { setLoading(false); }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h2 style={styles.title}>📚 Create Account</h2>
        {error && <div style={styles.error}>{error}</div>}
        <form onSubmit={handleSubmit}>
          <input style={styles.input} placeholder="Full Name" value={form.name}
            onChange={e => setForm({...form, name: e.target.value})} required />
          <input style={styles.input} type="email" placeholder="Email" value={form.email}
            onChange={e => setForm({...form, email: e.target.value})} required />
          <input style={styles.input} type="password" placeholder="Password (min 8, mixed case, special char)"
            value={form.password} onChange={e => setForm({...form, password: e.target.value})} required />
          <div style={styles.hint}>
            ✅ Must contain: uppercase, lowercase, number, special character (@$!%*?&)
          </div>
          <button style={styles.btn} type="submit" disabled={loading}>
            {loading ? 'Creating account...' : 'Register'}
          </button>
        </form>
        <p style={{textAlign:'center', marginTop:'1rem', fontSize:'14px'}}>
          Have an account? <Link to="/login">Login</Link>
        </p>
      </div>
    </div>
  );
};

const styles = {
  container: { display:'flex', justifyContent:'center', alignItems:'center', minHeight:'100vh', background:'#f0f4f8' },
  card: { background:'white', padding:'2rem', borderRadius:'12px', boxShadow:'0 4px 20px rgba(0,0,0,0.1)', width:'400px' },
  title: { textAlign:'center', marginBottom:'1.5rem' },
  input: { width:'100%', padding:'0.75rem', margin:'0.4rem 0', border:'1px solid #e2e8f0', borderRadius:'8px', fontSize:'14px', boxSizing:'border-box' },
  btn: { width:'100%', padding:'0.75rem', background:'#276749', color:'white', border:'none', borderRadius:'8px', cursor:'pointer', fontSize:'16px', marginTop:'0.5rem' },
  error: { background:'#fff5f5', color:'#c53030', padding:'0.75rem', borderRadius:'8px', marginBottom:'1rem', fontSize:'14px' },
  hint: { fontSize:'12px', color:'#718096', margin:'0.25rem 0 0.5rem' },
};

export default Register;
