// src/pages/AdminPanel.js — ML Anomaly Detection Dashboard
import React, { useEffect, useState } from 'react';
import api from '../utils/api';

const AdminPanel = () => {
  const [anomalies, setAnomalies] = useState([]);
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState({});
  const [activeTab, setActiveTab] = useState('anomalies');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.get('/admin/stats').then(r => setStats(r.data.stats || {})).catch(() => {});
    fetchAnomalies();
    fetchUsers();
  }, []);

  const fetchAnomalies = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/admin/anomalies');
      setAnomalies(data.anomalies || []);
    } catch { setAnomalies([]); }
    finally { setLoading(false); }
  };

  const fetchUsers = async () => {
    try {
      const { data } = await api.get('/admin/users');
      setUsers(data.users || []);
    } catch { setUsers([]); }
  };

  const toggleUser = async (userId) => {
    try {
      await api.patch(`/admin/users/${userId}/toggle-lock`);
      fetchUsers();
    } catch (e) { alert(e.response?.data?.error || 'Failed'); }
  };

  return (
    <div style={styles.page}>
      <h1>🔒 Admin Panel</h1>

      <div style={styles.statsRow}>
        {[
          { label: 'Total Users', val: stats.totalUsers, color: '#3182ce' },
          { label: 'Active Issues', val: stats.activeIssues, color: '#276749' },
          { label: 'Anomalies Detected', val: anomalies.length, color: '#c53030' },
        ].map(s => (
          <div key={s.label} style={{...styles.statCard, borderLeft: `4px solid ${s.color}`}}>
            <div style={{fontSize:'2rem', fontWeight:'bold', color: s.color}}>{s.val ?? '...'}</div>
            <div style={{color:'#718096'}}>{s.label}</div>
          </div>
        ))}
      </div>

      <div style={styles.tabs}>
        {['anomalies', 'users'].map(t => (
          <button key={t} style={activeTab === t ? styles.tabActive : styles.tab}
            onClick={() => setActiveTab(t)}>
            {t === 'anomalies' ? '🤖 ML Anomalies' : '👥 Users'}
          </button>
        ))}
      </div>

      {activeTab === 'anomalies' && (
        <div>
          <div style={styles.sectionHeader}>
            <h2>ML Anomaly Detection Log</h2>
            <button style={styles.btnRefresh} onClick={fetchAnomalies}>🔄 Refresh</button>
          </div>
          {loading ? <p>Loading...</p> : anomalies.length === 0 ? (
            <div style={styles.empty}>
              <p>✅ No anomalies detected yet.</p>
              <p style={{color:'#718096'}}>Anomalies are detected using Isolation Forest ML model.<br/>
              They appear when unusual login patterns are detected (new IPs, off-hours, high frequency, etc.)</p>
            </div>
          ) : (
            <div style={styles.anomalyList}>
              {[...anomalies].reverse().map((a, i) => (
                <div key={i} style={styles.anomalyCard}>
                  <div style={styles.anomalyHeader}>
                    <span style={styles.badgeDanger}>⚠️ ANOMALY</span>
                    <span style={styles.anomalyScore}>Score: {a.anomaly_score?.toFixed(3)}</span>
                    <span style={styles.anomalyTime}>{new Date(a.detected_at).toLocaleString()}</span>
                  </div>
                  <div style={styles.anomalyDetails}>
                    <span>👤 User: <code>{a.userId}</code></span>
                    <span>🌐 IP: <code>{a.ip}</code></span>
                  </div>
                  {a.features && (
                    <div style={styles.featureGrid}>
                      {Object.entries(a.features).map(([k, v]) => (
                        <div key={k} style={{
                          ...styles.feature,
                          background: v === true || (typeof v === 'number' && v > 3) ? '#fff5f5' : '#f0fff4',
                          color: v === true || (typeof v === 'number' && v > 3) ? '#c53030' : '#276749',
                        }}>
                          <strong>{k.replace(/_/g,' ')}</strong>: {String(v)}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'users' && (
        <div>
          <h2>User Management</h2>
          <table style={styles.table}>
            <thead>
              <tr style={styles.thead}>
                {['Name','Email','Role','Status','Joined','Action'].map(h=>(
                  <th key={h} style={styles.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u._id} style={styles.tr}>
                  <td style={styles.td}>{u.name}</td>
                  <td style={styles.td}>{u.email}</td>
                  <td style={styles.td}><span style={{...styles.roleBadge, background: u.role==='admin'?'#553c9a':u.role==='librarian'?'#2c7a7b':'#2b6cb0', color:'white'}}>{u.role}</span></td>
                  <td style={styles.td}><span style={{color: u.isActive?'#276749':'#c53030', fontWeight:'bold'}}>{u.isActive?'✅ Active':'🔒 Locked'}</span></td>
                  <td style={styles.td}>{new Date(u.createdAt).toLocaleDateString()}</td>
                  <td style={styles.td}>
                    <button style={{...styles.btnToggle, background: u.isActive?'#c53030':'#276749'}} onClick={() => toggleUser(u._id)}>
                      {u.isActive ? 'Deactivate' : 'Activate'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

const styles = {
  page: { maxWidth:'1100px', margin:'2rem auto', padding:'0 1rem' },
  statsRow: { display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'1rem', margin:'1.5rem 0' },
  statCard: { background:'white', padding:'1.25rem 1.5rem', borderRadius:'10px', boxShadow:'0 2px 8px rgba(0,0,0,0.06)' },
  tabs: { display:'flex', gap:'0.5rem', marginBottom:'1.5rem' },
  tab: { padding:'0.5rem 1.25rem', border:'2px solid #e2e8f0', borderRadius:'8px', cursor:'pointer', background:'white' },
  tabActive: { padding:'0.5rem 1.25rem', border:'2px solid #553c9a', borderRadius:'8px', cursor:'pointer', background:'#faf5ff', fontWeight:'bold' },
  sectionHeader: { display:'flex', justifyContent:'space-between', alignItems:'center' },
  btnRefresh: { padding:'0.4rem 1rem', background:'#ebf8ff', border:'1px solid #3182ce', borderRadius:'6px', cursor:'pointer' },
  empty: { background:'white', padding:'2rem', borderRadius:'12px', textAlign:'center', boxShadow:'0 2px 8px rgba(0,0,0,0.06)' },
  anomalyList: { display:'flex', flexDirection:'column', gap:'0.75rem' },
  anomalyCard: { background:'white', border:'1px solid #fed7d7', borderRadius:'10px', padding:'1rem', boxShadow:'0 1px 4px rgba(0,0,0,0.06)' },
  anomalyHeader: { display:'flex', gap:'1rem', alignItems:'center', marginBottom:'0.5rem' },
  badgeDanger: { background:'#fed7d7', color:'#c53030', padding:'2px 8px', borderRadius:'12px', fontSize:'12px', fontWeight:'bold' },
  anomalyScore: { color:'#718096', fontSize:'13px' },
  anomalyTime: { color:'#a0aec0', fontSize:'12px', marginLeft:'auto' },
  anomalyDetails: { display:'flex', gap:'1.5rem', marginBottom:'0.5rem', fontSize:'13px' },
  featureGrid: { display:'flex', flexWrap:'wrap', gap:'0.4rem', marginTop:'0.5rem' },
  feature: { padding:'2px 8px', borderRadius:'6px', fontSize:'12px' },
  table: { width:'100%', borderCollapse:'collapse', background:'white', borderRadius:'10px', overflow:'hidden', boxShadow:'0 2px 8px rgba(0,0,0,0.06)' },
  thead: { background:'#f7fafc' },
  th: { padding:'0.75rem 1rem', textAlign:'left', fontSize:'13px', color:'#4a5568', fontWeight:'600', borderBottom:'1px solid #e2e8f0' },
  tr: { borderBottom:'1px solid #f7fafc' },
  td: { padding:'0.75rem 1rem', fontSize:'14px', color:'#1a202c' },
  roleBadge: { padding:'2px 8px', borderRadius:'12px', fontSize:'12px' },
  btnToggle: { padding:'0.3rem 0.75rem', color:'white', border:'none', borderRadius:'6px', cursor:'pointer', fontSize:'12px' },
};

export default AdminPanel;
