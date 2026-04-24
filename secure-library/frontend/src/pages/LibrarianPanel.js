// src/pages/LibrarianPanel.js
// Librarian dashboard: view all borrow requests, approve or reject them
import React, { useEffect, useState } from 'react';
import api from '../utils/api';

const statusConfig = {
  pending:  { bg: '#fefcbf', color: '#744210', border: '#f6e05e' },
  issued: { bg: '#bee3f8', color: '#2c5282', border: '#90cdf4' },
  approved: { bg: '#bee3f8', color: '#2c5282', border: '#90cdf4' },
  rejected: { bg: '#fed7d7', color: '#c53030', border: '#fc8181' },
  returned: { bg: '#c6f6d5', color: '#276749', border: '#9ae6b4' },
  overdue:  { bg: '#fed7d7', color: '#c53030', border: '#fc8181' },
};

const LibrarianPanel = () => {
  const [issues, setIssues] = useState([]);
  const [filter, setFilter] = useState('pending');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('success');
  const [pendingCount, setPendingCount] = useState(0);
  // Rejection reason modal state
  const [rejectModal, setRejectModal] = useState(null); // { issueId, bookTitle }
  const [rejectReason, setRejectReason] = useState('');

  const showMsg = (text, type = 'success') => {
    setMessage(text); setMessageType(type);
    setTimeout(() => setMessage(''), 4000);
  };

  const fetchIssues = async (status = filter) => {
    setLoading(true);
    try {
      const params = status === 'all' ? '' : `?status=${status}`;
      const { data } = await api.get(`/issues/all${params}`);
      setIssues(data.issues || []);
    } catch { setIssues([]); }
    finally { setLoading(false); }
  };

  const fetchPendingCount = async () => {
    try {
      const { data } = await api.get('/issues/pending-count');
      setPendingCount(data.count || 0);
    } catch {}
  };

  useEffect(() => {
    fetchIssues(filter);
    fetchPendingCount();
  }, [filter]);

  const handleApprove = async (issueId) => {
    try {
      const { data } = await api.patch(`/issues/${issueId}/approve`);
      showMsg('✅ ' + data.message, 'success');
      fetchIssues(filter);
      fetchPendingCount();
    } catch (err) {
      showMsg('❌ ' + (err.response?.data?.error || 'Approval failed'), 'error');
    }
  };

  const handleRejectSubmit = async () => {
    try {
      const { data } = await api.patch(`/issues/${rejectModal.issueId}/reject`, { reason: rejectReason });
      showMsg('Request rejected.', 'success');
      setRejectModal(null);
      setRejectReason('');
      fetchIssues(filter);
      fetchPendingCount();
    } catch (err) {
      showMsg('❌ ' + (err.response?.data?.error || 'Rejection failed'), 'error');
    }
  };

  const isOverdue = (dueDate) => dueDate && new Date(dueDate) < new Date();

  const tabs = [
    { key: 'pending', label: `Pending${pendingCount > 0 ? ` (${pendingCount})` : ''}` },
    { key: 'approved', label: 'Approved' },
    { key: 'returned', label: 'Returned' },
    { key: 'rejected', label: 'Rejected' },
    { key: 'all', label: 'All' },
  ];

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <div>
          <h1>📚 Librarian Panel</h1>
          <p style={styles.sub}>Review and manage borrow requests from users</p>
        </div>
        {pendingCount > 0 && (
          <div style={styles.pendingAlert}>
            ⚠️ {pendingCount} pending request{pendingCount > 1 ? 's' : ''} awaiting review
          </div>
        )}
      </div>

      {/* Tabs */}
      <div style={styles.tabs}>
        {tabs.map(t => (
          <button key={t.key}
            style={filter === t.key ? styles.tabActive : styles.tab}
            onClick={() => setFilter(t.key)}>
            {t.label}
          </button>
        ))}
        <button style={styles.refreshBtn} onClick={() => fetchIssues(filter)}>🔄 Refresh</button>
      </div>

      {message && (
        <div style={{
          ...styles.msg,
          background: messageType === 'success' ? '#f0fff4' : '#fff5f5',
          color: messageType === 'success' ? '#276749' : '#c53030',
          border: `1px solid ${messageType === 'success' ? '#9ae6b4' : '#feb2b2'}`,
        }}>
          {message}
        </div>
      )}

      {loading ? (
        <p style={{textAlign:'center', padding:'2rem', color:'#718096'}}>Loading...</p>
      ) : issues.length === 0 ? (
        <div style={styles.empty}>
          <p style={{fontSize:'2rem'}}>📭</p>
          <p>No {filter === 'all' ? '' : filter} requests.</p>
        </div>
      ) : (
        <div style={styles.list}>
          {issues.map(issue => {
            const overdue = ['approved','issued'].includes(issue.status) && isOverdue(issue.dueDate);
            const cfg = overdue ? statusConfig.overdue : (statusConfig[issue.status] || statusConfig.pending);

            return (
              <div key={issue._id} style={{...styles.card, borderLeft: `4px solid ${cfg.border}`}}>
                <div style={styles.cardRow}>
                  {/* Book + user info */}
                  <div style={styles.info}>
                    <div style={styles.bookRow}>
                      <h3 style={styles.bookTitle}>{issue.book?.title}</h3>
                      <span style={{...styles.statusBadge, background: cfg.bg, color: cfg.color}}>
                        {overdue ? 'OVERDUE' : issue.status.toUpperCase()}
                      </span>
                    </div>
                    <p style={styles.bookMeta}>by {issue.book?.author} | ISBN: {issue.book?.isbn}</p>

                    <div style={styles.userBox}>
                      <span style={styles.userIcon}>👤</span>
                      <div>
                        <p style={styles.userName}>{issue.user?.name}</p>
                        <p style={styles.userEmail}>{issue.user?.email}</p>
                      </div>
                    </div>

                    <p style={styles.dates}>
                      Requested: {new Date(issue.createdAt).toLocaleDateString()}
                      {issue.issueDate && ` | Issued: ${new Date(issue.issueDate).toLocaleDateString()}`}
                      {issue.dueDate && issue.status !== 'pending' && (
                        <> | Due: <strong style={{color: overdue ? '#c53030' : '#276749'}}>
                          {new Date(issue.dueDate).toLocaleDateString()}
                        </strong></>
                      )}
                      {issue.returnDate && ` | Returned: ${new Date(issue.returnDate).toLocaleDateString()}`}
                    </p>

                    {issue.rejectionReason && (
                      <p style={styles.rejectNote}>Reason: "{issue.rejectionReason}"</p>
                    )}
                    {issue.fine > 0 && (
                      <p style={styles.fine}>Fine collected: ₹{issue.fine}</p>
                    )}
                  </div>

                  {/* Action buttons — only for pending */}
                  {issue.status === 'pending' && (
                    <div style={styles.actions}>
                      <button style={styles.btnApprove} onClick={() => handleApprove(issue._id)}>
                        ✅ Approve
                      </button>
                      <button style={styles.btnReject} onClick={() => {
                        setRejectModal({ issueId: issue._id, bookTitle: issue.book?.title });
                        setRejectReason('');
                      }}>
                        ❌ Reject
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Rejection reason modal */}
      {rejectModal && (
        <div style={styles.overlay} onClick={() => setRejectModal(null)}>
          <div style={styles.modal} onClick={e => e.stopPropagation()}>
            <h3 style={{marginBottom:'0.5rem'}}>Reject Request</h3>
            <p style={styles.modalBook}>Book: <strong>{rejectModal.bookTitle}</strong></p>
            <p style={styles.modalLabel}>Reason (optional — will be shown to user):</p>
            <textarea
              style={styles.modalTextarea}
              placeholder="e.g. Book reserved for another user, insufficient active account..."
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
              rows={3}
            />
            <div style={styles.modalBtns}>
              <button style={styles.btnApprove} onClick={handleRejectSubmit}>Confirm Reject</button>
              <button style={styles.btnCancel} onClick={() => setRejectModal(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const styles = {
  page: { maxWidth:'1000px', margin:'2rem auto', padding:'0 1rem' },
  header: { display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'1.5rem', flexWrap:'wrap', gap:'1rem' },
  sub: { color:'#718096', margin:'0.25rem 0 0', fontSize:'14px' },
  pendingAlert: { background:'#fffbeb', border:'1px solid #f6ad55', borderRadius:'8px', padding:'0.6rem 1rem', color:'#744210', fontSize:'14px', fontWeight:'bold' },
  tabs: { display:'flex', gap:'0.5rem', marginBottom:'1.5rem', flexWrap:'wrap', alignItems:'center' },
  tab: { padding:'0.4rem 1rem', border:'1px solid #e2e8f0', borderRadius:'20px', cursor:'pointer', background:'white', fontSize:'13px' },
  tabActive: { padding:'0.4rem 1rem', border:'1px solid #553c9a', borderRadius:'20px', cursor:'pointer', background:'#faf5ff', fontSize:'13px', fontWeight:'bold', color:'#553c9a' },
  refreshBtn: { marginLeft:'auto', padding:'0.4rem 1rem', border:'1px solid #3182ce', borderRadius:'6px', cursor:'pointer', background:'#ebf8ff', fontSize:'13px', color:'#2b6cb0' },
  msg: { padding:'0.75rem', borderRadius:'8px', marginBottom:'1rem', fontSize:'14px' },
  empty: { background:'white', padding:'3rem', borderRadius:'12px', textAlign:'center', color:'#718096' },
  list: { display:'flex', flexDirection:'column', gap:'0.75rem' },
  card: { background:'white', borderRadius:'10px', padding:'1.25rem', boxShadow:'0 2px 8px rgba(0,0,0,0.06)' },
  cardRow: { display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:'1rem' },
  info: { flex:1 },
  bookRow: { display:'flex', alignItems:'center', gap:'0.75rem', marginBottom:'0.25rem', flexWrap:'wrap' },
  bookTitle: { margin:0, fontSize:'1rem', color:'#1a202c' },
  statusBadge: { padding:'2px 10px', borderRadius:'12px', fontSize:'11px', fontWeight:'bold' },
  bookMeta: { color:'#718096', fontSize:'13px', margin:'0 0 0.5rem' },
  userBox: { display:'flex', alignItems:'center', gap:'0.5rem', background:'#f7fafc', borderRadius:'8px', padding:'0.5rem 0.75rem', marginBottom:'0.5rem', width:'fit-content' },
  userIcon: { fontSize:'16px' },
  userName: { margin:0, fontSize:'14px', fontWeight:'500', color:'#1a202c' },
  userEmail: { margin:0, fontSize:'12px', color:'#718096' },
  dates: { color:'#4a5568', fontSize:'13px' },
  rejectNote: { color:'#c53030', fontSize:'13px', fontStyle:'italic', marginTop:'0.25rem' },
  fine: { color:'#c53030', fontWeight:'bold', fontSize:'13px', marginTop:'0.25rem' },
  actions: { display:'flex', flexDirection:'column', gap:'0.5rem', minWidth:'110px' },
  btnApprove: { padding:'0.5rem 1rem', background:'#276749', color:'white', border:'none', borderRadius:'6px', cursor:'pointer', fontSize:'13px', fontWeight:'500' },
  btnReject: { padding:'0.5rem 1rem', background:'#c53030', color:'white', border:'none', borderRadius:'6px', cursor:'pointer', fontSize:'13px', fontWeight:'500' },
  // Modal
  overlay: { position:'fixed', top:0, left:0, right:0, bottom:0, background:'rgba(0,0,0,0.5)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000 },
  modal: { background:'white', borderRadius:'12px', padding:'1.5rem', width:'420px', maxWidth:'90vw', boxShadow:'0 20px 60px rgba(0,0,0,0.3)' },
  modalBook: { color:'#4a5568', fontSize:'14px', margin:'0 0 1rem' },
  modalLabel: { color:'#4a5568', fontSize:'13px', marginBottom:'0.5rem' },
  modalTextarea: { width:'100%', padding:'0.6rem', border:'1px solid #e2e8f0', borderRadius:'6px', fontSize:'13px', resize:'vertical', boxSizing:'border-box', fontFamily:'inherit' },
  modalBtns: { display:'flex', gap:'0.5rem', marginTop:'1rem' },
  btnCancel: { padding:'0.5rem 1rem', background:'#e2e8f0', color:'#4a5568', border:'none', borderRadius:'6px', cursor:'pointer', fontSize:'13px' },
};

export default LibrarianPanel;