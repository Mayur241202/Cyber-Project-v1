// src/pages/Dashboard.js
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';

const Dashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [myIssues, setMyIssues] = useState([]);
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    api.get('/issues/my').then(r => setMyIssues(r.data.issues || [])).catch(() => {});
    if (user?.role === 'admin') {
      api.get('/admin/stats').then(r => setStats(r.data.stats)).catch(() => {});
    }
    if (['librarian', 'admin'].includes(user?.role)) {
      api.get('/issues/pending-count').then(r => setPendingCount(r.data.count || 0)).catch(() => {});
    }
  }, [user]);

  const activeIssues   = myIssues.filter(i => i.status === 'approved');
  const pendingMyReqs  = myIssues.filter(i => i.status === 'pending');
  const overdueCount   = activeIssues.filter(i => new Date(i.dueDate) < new Date()).length;

  return (
    <div style={styles.page}>
      <h1 style={styles.title}>Welcome, {user?.name} 👋</h1>
      <p style={styles.sub}>Role: <strong>{user?.role}</strong> | {user?.email}</p>

      {/* Stats cards */}
      <div style={styles.cardGrid}>
        {/* For regular users */}
        {user?.role === 'user' && <>
          <div style={{...styles.card, borderTop:'4px solid #f6ad55'}}>
            <div style={styles.cardNum}>{pendingMyReqs.length}</div>
            <div style={styles.cardLabel}>Pending Requests</div>
          </div>
          <div style={{...styles.card, borderTop:'4px solid #3182ce'}}>
            <div style={styles.cardNum}>{activeIssues.length}</div>
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
        </>}

        {/* For librarian */}
        {user?.role === 'librarian' && <>
          <div style={{...styles.card, borderTop:`4px solid ${pendingCount > 0 ? '#e53e3e' : '#68d391'}`}}>
            <div style={{...styles.cardNum, color: pendingCount > 0 ? '#e53e3e' : '#276749'}}>{pendingCount}</div>
            <div style={styles.cardLabel}>Pending Requests</div>
          </div>
        </>}

        {/* For admin */}
        {stats && <>
          <div style={{...styles.card, borderTop:`4px solid ${pendingCount > 0 ? '#e53e3e' : '#68d391'}`}}>
            <div style={{...styles.cardNum, color: pendingCount > 0 ? '#e53e3e' : '#276749'}}>{pendingCount}</div>
            <div style={styles.cardLabel}>Pending Requests</div>
          </div>
          <div style={{...styles.card, borderTop:'4px solid #ed8936'}}>
            <div style={styles.cardNum}>{stats.totalUsers}</div>
            <div style={styles.cardLabel}>Total Users</div>
          </div>
          <div style={{...styles.card, borderTop:'4px solid #3182ce'}}>
            <div style={styles.cardNum}>{stats.activeIssues}</div>
            <div style={styles.cardLabel}>Active Issues</div>
          </div>
        </>}
      </div>

      {/* Quick links */}
      <div style={styles.quickLinks}>
        <Link to="/books" style={styles.quickLink}>📚 Browse Books</Link>
        {user?.role === 'user' && (
          <Link to="/my-issues" style={styles.quickLink}>📋 My Requests</Link>
        )}
        {['librarian', 'admin'].includes(user?.role) && (
          <Link to="/librarian" style={{
            ...styles.quickLink,
            background: pendingCount > 0 ? '#276749' : '#ebf8ff',
            color: pendingCount > 0 ? 'white' : '#2b6cb0',
          }}>
            📋 Borrow Requests {pendingCount > 0 && `(${pendingCount} pending)`}
          </Link>
        )}
        {user?.role === 'admin' && (
          <Link to="/admin" style={{...styles.quickLink, background:'#553c9a', color:'white'}}>🔒 Admin Panel</Link>
        )}
        <Link to="/vuln-demo" style={{...styles.quickLink, background:'#744210', color:'white'}}>⚠️ Security Demo</Link>
      </div>

      {/* Alerts */}
      {overdueCount > 0 && user?.role === 'user' && (
        <div style={styles.alertDanger}>
          ⚠️ You have {overdueCount} overdue book(s). Please return them to avoid fines.
        </div>
      )}
      {pendingCount > 0 && ['librarian', 'admin'].includes(user?.role) && (
        <div style={styles.alertWarning}>
          📋 There are <strong>{pendingCount}</strong> borrow request(s) waiting for your review.{' '}
          <Link to="/librarian" style={{color:'#744210', fontWeight:'bold'}}>Review now →</Link>
        </div>
      )}
      {pendingMyReqs.length > 0 && user?.role === 'user' && (
        <div style={styles.alertInfo}>
          ⏳ You have <strong>{pendingMyReqs.length}</strong> pending borrow request(s) waiting for librarian approval.
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
  cardLabel: { color:'#718096', marginTop:'0.25rem', fontSize:'14px' },
  quickLinks: { display:'flex', gap:'1rem', flexWrap:'wrap', marginBottom:'2rem' },
  quickLink: { padding:'0.75rem 1.5rem', background:'#ebf8ff', color:'#2b6cb0', borderRadius:'8px', textDecoration:'none', fontWeight:'500', fontSize:'14px' },
  alertDanger: { background:'#fff5f5', border:'1px solid #fc8181', borderRadius:'8px', padding:'1rem', color:'#c53030', marginBottom:'1rem' },
  alertWarning: { background:'#fffbeb', border:'1px solid #f6ad55', borderRadius:'8px', padding:'1rem', color:'#744210', marginBottom:'1rem' },
  alertInfo: { background:'#ebf8ff', border:'1px solid #90cdf4', borderRadius:'8px', padding:'1rem', color:'#2c5282', marginBottom:'1rem' },
};

export default Dashboard;