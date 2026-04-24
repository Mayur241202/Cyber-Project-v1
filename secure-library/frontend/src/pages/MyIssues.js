// src/pages/MyIssues.js
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';

const statusConfig = {
  pending:  { label: 'PENDING APPROVAL', bg: '#fefcbf', color: '#744210', border: '#f6e05e' },
  approved: { label: 'APPROVED / ISSUED', bg: '#bee3f8', color: '#2c5282', border: '#90cdf4' },
  rejected: { label: 'REJECTED', bg: '#fed7d7', color: '#c53030', border: '#fc8181' },
  returned: { label: 'RETURNED', bg: '#c6f6d5', color: '#276749', border: '#9ae6b4' },
  overdue:  { label: 'OVERDUE', bg: '#fed7d7', color: '#c53030', border: '#fc8181' },
  issued: { label: 'APPROVED / ISSUED', bg: '#bee3f8', color: '#2c5282', border: '#90cdf4' },
  lost:     { label: 'LOST', bg: '#e2e8f0', color: '#4a5568', border: '#a0aec0' },
};

const MyIssues = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [issues, setIssues] = useState([]);
  const [message, setMessage] = useState('');
  const [filter, setFilter] = useState('all');

  // Librarians and admins manage requests from /librarian — redirect them
  useEffect(() => {
    if (user && ['librarian', 'admin'].includes(user.role)) {
      navigate('/librarian', { replace: true });
    }
  }, [user, navigate]);

  const fetchIssues = () => {
    api.get('/issues/my').then(r => setIssues(r.data.issues || [])).catch(() => {});
  };

  useEffect(() => { fetchIssues(); }, []);

  const handleReturn = async (issueId) => {
    try {
      const { data } = await api.put(`/issues/${issueId}/return`);
      setMessage('✅ ' + (data.message || 'Book returned!'));
      fetchIssues();
    } catch (err) {
      setMessage('❌ ' + (err.response?.data?.error || 'Return failed'));
    }
  };

  const isOverdue = (dueDate) => dueDate && new Date(dueDate) < new Date();

  const filtered = filter === 'all' ? issues : issues.filter(i => i.status === filter);

  const counts = issues.reduce((acc, i) => {
    acc[i.status] = (acc[i.status] || 0) + 1;
    return acc;
  }, {});

  return (
    <div style={styles.page}>
      <h1>📋 My Borrow Requests</h1>

      {/* Summary pills */}
      <div style={styles.summaryRow}>
        {Object.entries(counts).map(([status, count]) => {
          const cfg = statusConfig[status] || {};
          return (
            <span key={status} style={{...styles.pill, background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}`}}>
              {count} {status}
            </span>
          );
        })}
      </div>

      {/* Filter tabs */}
      <div style={styles.tabs}>
        {['all', 'pending', 'approved', 'returned', 'rejected'].map(f => (
          <button key={f} style={filter === f ? styles.tabActive : styles.tab} onClick={() => setFilter(f)}>
            {f.charAt(0).toUpperCase() + f.slice(1)}
            {f !== 'all' && counts[f] ? ` (${counts[f]})` : ''}
          </button>
        ))}
      </div>

      {message && (
        <div style={{
          ...styles.msg,
          background: message.startsWith('✅') ? '#f0fff4' : '#fff5f5',
          color: message.startsWith('✅') ? '#276749' : '#c53030',
        }}>
          {message}
        </div>
      )}

      {filtered.length === 0 ? (
        <div style={styles.empty}>
          <p style={{fontSize:'2rem', marginBottom:'0.5rem'}}>📚</p>
          <p>No {filter === 'all' ? '' : filter} requests yet.</p>
          {filter === 'all' && <p style={{color:'#718096', fontSize:'14px', marginTop:'0.5rem'}}>Browse the catalog to request books!</p>}
        </div>
      ) : (
        <div style={styles.list}>
          {filtered.map(issue => {
            const cfg = statusConfig[issue.status] || statusConfig.pending;
            const overdue = issue.status === 'approved' && isOverdue(issue.dueDate);
            const displayCfg = overdue ? statusConfig.overdue : cfg;

            return (
              <div key={issue._id} style={{...styles.card, borderLeft: `4px solid ${displayCfg.border}`}}>
                <div style={styles.row}>
                  <div style={styles.info}>
                    <h3 style={styles.bookTitle}>{issue.book?.title}</h3>
                    <p style={styles.sub}>by {issue.book?.author} | ISBN: {issue.book?.isbn}</p>

                    <p style={styles.dateLine}>
                      Requested: {new Date(issue.createdAt).toLocaleDateString()}
                      {issue.issueDate && ` | Issued: ${new Date(issue.issueDate).toLocaleDateString()}`}
                      {issue.dueDate && issue.status === 'approved' && (
                        <> | Due: <strong style={{color: overdue ? '#c53030' : '#276749'}}>
                          {new Date(issue.dueDate).toLocaleDateString()}
                        </strong></>
                      )}
                      {issue.returnDate && ` | Returned: ${new Date(issue.returnDate).toLocaleDateString()}`}
                    </p>

                    {issue.status === 'approved' && issue.issuedBy && (
                      <p style={styles.meta}>✅ Approved by: {issue.issuedBy?.name || 'Librarian'}</p>
                    )}
                    {issue.status === 'rejected' && (
                      <p style={{...styles.meta, color:'#c53030'}}>
                        ❌ Rejected{issue.rejectionReason ? `: "${issue.rejectionReason}"` : ''}
                      </p>
                    )}
                    {issue.fine > 0 && (
                      <p style={styles.fine}>Fine: ₹{issue.fine}</p>
                    )}
                  </div>

                  <div style={styles.statusCol}>
                    <span style={{...styles.badge, background: displayCfg.bg, color: displayCfg.color}}>
                      {overdue ? 'OVERDUE' : displayCfg.label}
                    </span>
                    {['approved', 'issued', 'overdue'].includes(issue.status) && (
                      <button style={styles.btnReturn} onClick={() => handleReturn(issue._id)}>
                        Return Book
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

const styles = {
  page: { maxWidth:'900px', margin:'2rem auto', padding:'0 1rem' },
  summaryRow: { display:'flex', gap:'0.5rem', flexWrap:'wrap', margin:'1rem 0' },
  pill: { padding:'4px 12px', borderRadius:'20px', fontSize:'12px', fontWeight:'bold' },
  tabs: { display:'flex', gap:'0.5rem', marginBottom:'1rem', flexWrap:'wrap' },
  tab: { padding:'0.4rem 1rem', border:'1px solid #e2e8f0', borderRadius:'20px', cursor:'pointer', background:'white', fontSize:'13px' },
  tabActive: { padding:'0.4rem 1rem', border:'1px solid #3182ce', borderRadius:'20px', cursor:'pointer', background:'#ebf8ff', fontSize:'13px', fontWeight:'bold', color:'#2b6cb0' },
  msg: { padding:'0.75rem', borderRadius:'8px', marginBottom:'1rem', fontSize:'14px' },
  empty: { background:'white', padding:'3rem', borderRadius:'12px', textAlign:'center', color:'#4a5568' },
  list: { display:'flex', flexDirection:'column', gap:'0.75rem' },
  card: { background:'white', borderRadius:'10px', padding:'1.25rem', boxShadow:'0 2px 8px rgba(0,0,0,0.06)' },
  row: { display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:'1rem' },
  info: { flex:1 },
  bookTitle: { margin:'0 0 0.25rem', color:'#1a202c' },
  sub: { color:'#718096', fontSize:'14px', margin:'0 0 0.25rem' },
  dateLine: { color:'#4a5568', fontSize:'13px', margin:'0 0 0.25rem' },
  meta: { color:'#4a5568', fontSize:'13px', margin:'0.25rem 0 0' },
  fine: { color:'#c53030', fontWeight:'bold', marginTop:'0.25rem', fontSize:'13px' },
  statusCol: { display:'flex', flexDirection:'column', alignItems:'flex-end', gap:'0.5rem', minWidth:'130px' },
  badge: { padding:'4px 10px', borderRadius:'12px', fontSize:'11px', fontWeight:'bold', textAlign:'center' },
  btnReturn: { padding:'0.4rem 1rem', background:'#3182ce', color:'white', border:'none', borderRadius:'6px', cursor:'pointer', fontSize:'13px' },
};

export default MyIssues;