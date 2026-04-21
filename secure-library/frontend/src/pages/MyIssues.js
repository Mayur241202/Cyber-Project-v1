// src/pages/MyIssues.js
import React, { useEffect, useState } from 'react';
import api from '../utils/api';

const MyIssues = () => {
  const [issues, setIssues] = useState([]);
  const [message, setMessage] = useState('');

  const fetchIssues = () => {
    api.get('/issues/my').then(r => setIssues(r.data.issues || [])).catch(() => {});
  };

  useEffect(() => { fetchIssues(); }, []);

  const handleReturn = async (issueId) => {
    try {
      const { data } = await api.put(`/issues/${issueId}/return`);
      setMessage(data.message || '✅ Returned!');
      fetchIssues();
    } catch (err) {
      setMessage('❌ ' + (err.response?.data?.error || 'Return failed'));
    }
  };

  const isOverdue = (dueDate) => new Date(dueDate) < new Date();

  return (
    <div style={styles.page}>
      <h1>📋 My Issued Books</h1>
      {message && <div style={styles.msg}>{message}</div>}
      {issues.length === 0 ? (
        <p style={{color:'#718096'}}>No books issued yet. Browse the catalog to borrow books!</p>
      ) : (
        <div style={styles.list}>
          {issues.map(issue => (
            <div key={issue._id} style={{
              ...styles.card,
              borderLeft: `4px solid ${issue.status==='returned'?'#68d391':isOverdue(issue.dueDate)?'#fc8181':'#63b3ed'}`
            }}>
              <div style={styles.row}>
                <div>
                  <h3 style={styles.bookTitle}>{issue.book?.title}</h3>
                  <p style={styles.sub}>by {issue.book?.author} | ISBN: {issue.book?.isbn}</p>
                  <p style={styles.dates}>
                    Issued: {new Date(issue.issueDate).toLocaleDateString()} |
                    Due: <strong style={{color: isOverdue(issue.dueDate) && issue.status==='issued' ? '#c53030' : '#276749'}}>
                      {new Date(issue.dueDate).toLocaleDateString()}
                    </strong>
                    {issue.returnDate && ` | Returned: ${new Date(issue.returnDate).toLocaleDateString()}`}
                  </p>
                  {issue.fine > 0 && <p style={styles.fine}>Fine: ₹{issue.fine}</p>}
                </div>
                <div style={styles.statusCol}>
                  <span style={{
                    ...styles.badge,
                    background: issue.status==='returned'?'#c6f6d5':isOverdue(issue.dueDate)?'#fed7d7':'#bee3f8',
                    color: issue.status==='returned'?'#276749':isOverdue(issue.dueDate)?'#c53030':'#2c5282',
                  }}>
                    {issue.status==='issued' && isOverdue(issue.dueDate) ? 'OVERDUE' : issue.status.toUpperCase()}
                  </span>
                  {issue.status === 'issued' && (
                    <button style={styles.btnReturn} onClick={() => handleReturn(issue._id)}>
                      Return Book
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const styles = {
  page: { maxWidth:'900px', margin:'2rem auto', padding:'0 1rem' },
  msg: { background:'#ebf8ff', padding:'0.75rem', borderRadius:'8px', marginBottom:'1rem' },
  list: { display:'flex', flexDirection:'column', gap:'0.75rem' },
  card: { background:'white', borderRadius:'10px', padding:'1.25rem', boxShadow:'0 2px 8px rgba(0,0,0,0.06)' },
  row: { display:'flex', justifyContent:'space-between', alignItems:'flex-start' },
  bookTitle: { margin:'0 0 0.25rem', color:'#1a202c' },
  sub: { color:'#718096', fontSize:'14px', margin:'0 0 0.25rem' },
  dates: { color:'#4a5568', fontSize:'13px', margin:0 },
  fine: { color:'#c53030', fontWeight:'bold', marginTop:'0.25rem' },
  statusCol: { display:'flex', flexDirection:'column', alignItems:'flex-end', gap:'0.5rem' },
  badge: { padding:'4px 12px', borderRadius:'12px', fontSize:'12px', fontWeight:'bold' },
  btnReturn: { padding:'0.4rem 1rem', background:'#3182ce', color:'white', border:'none', borderRadius:'6px', cursor:'pointer', fontSize:'13px' },
};

export default MyIssues;
