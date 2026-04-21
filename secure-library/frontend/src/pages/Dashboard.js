// src/pages/Dashboard.js
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';

const Dashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [myIssues, setMyIssues] = useState([]);

  useEffect(() => {
    api.get('/issues/my').then(r => setMyIssues(r.data.issues || [])).catch(() => {});
    if (user?.role === 'admin') {
      api.get('/admin/stats').then(r => setStats(r.data.stats)).catch(() => {});
    }
  }, [user]);

  const overdueCount = myIssues.filter(i => i.status === 'issued' && new Date(i.dueDate) < new Date()).length;

  return (
    <div style={styles.page}>
      <h1 style={styles.title}>Welcome, {user?.name} 👋</h1>
      <p style={styles.sub}>Role: <strong>{user?.role}</strong> | {user?.email}</p>

      <div style={styles.cardGrid}>
        <div style={{...styles.card, borderTop:'4px solid #3182ce'}}>
          <div style={styles.cardNum}>{myIssues.filter(i=>i.status==='issued').length}</div>
          <div style={styles.cardLabel}>Active Borrows</div>
        </div>
        <div style={{...styles.card, borderTop:`4px solid ${overdueCount > 0 ? '#e53e3e' : '#68d391'}`}}>
          <div style={{...styles.cardNum, color: overdueCount > 0 ? '#e53e3e' : '#276749'}}>{overdueCount}</div>
          <div style={styles.cardLabel}>Overdue Books</div>
        </div>
        <div style={{...styles.card, borderTop:'4px solid #805ad5'}}>
          <div style={styles.cardNum}>{myIssues.filter(i=>i.status==='returned').length}</div>
          <div style={styles.cardLabel}>Returned</div>
        </div>
        {stats && <>
          <div style={{...styles.card, borderTop:'4px solid #ed8936'}}>
            <div style={styles.cardNum}>{stats.totalUsers}</div>
            <div style={styles.cardLabel}>Total Users</div>
          </div>
        </>}
      </div>

      <div style={styles.quickLinks}>
        <Link to="/books" style={styles.quickLink}>📚 Browse Books</Link>
        <Link to="/my-issues" style={styles.quickLink}>📋 My Issues</Link>
        {user?.role === 'admin' && <Link to="/admin" style={{...styles.quickLink, background:'#553c9a', color:'white'}}>🔒 Admin Panel</Link>}
        <Link to="/vuln-demo" style={{...styles.quickLink, background:'#744210', color:'white'}}>⚠️ Security Demo</Link>
      </div>

      {overdueCount > 0 && (
        <div style={styles.alert}>
          ⚠️ You have {overdueCount} overdue book(s). Please return them to avoid fines.
        </div>
      )}
    </div>
  );
};

const styles = {
  page: { maxWidth:'1000px', margin:'2rem auto', padding:'0 1rem' },
  title: { fontSize:'2rem', color:'#1a202c', marginBottom:'0.25rem' },
  sub: { color:'#718096', marginBottom:'2rem' },
  cardGrid: { display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(180px,1fr))', gap:'1rem', marginBottom:'2rem' },
  card: { background:'white', borderRadius:'12px', padding:'1.5rem', boxShadow:'0 2px 8px rgba(0,0,0,0.08)', textAlign:'center' },
  cardNum: { fontSize:'2.5rem', fontWeight:'bold', color:'#1a202c' },
  cardLabel: { color:'#718096', marginTop:'0.25rem' },
  quickLinks: { display:'flex', gap:'1rem', flexWrap:'wrap', marginBottom:'2rem' },
  quickLink: { padding:'0.75rem 1.5rem', background:'#ebf8ff', color:'#2b6cb0', borderRadius:'8px', textDecoration:'none', fontWeight:'500' },
  alert: { background:'#fffbeb', border:'1px solid #f6ad55', borderRadius:'8px', padding:'1rem', color:'#744210' },
};

export default Dashboard;
