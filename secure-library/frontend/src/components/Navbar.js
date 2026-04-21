// src/components/Navbar.js
import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => { await logout(); navigate('/login'); };
  const isActive = (path) => location.pathname === path;

  if (!user && ['/login', '/register', '/vuln-demo'].some(p => location.pathname.startsWith(p))) return null;

  return (
    <nav style={styles.nav}>
      <Link to="/dashboard" style={styles.brand}>📚 SecureLib</Link>
      <div style={styles.links}>
        {user && <>
          <Link to="/dashboard" style={isActive('/dashboard') ? styles.activeLink : styles.link}>Dashboard</Link>
          <Link to="/books" style={isActive('/books') ? styles.activeLink : styles.link}>Books</Link>
          <Link to="/my-issues" style={isActive('/my-issues') ? styles.activeLink : styles.link}>My Issues</Link>
          {user.role === 'admin' && (
            <Link to="/admin" style={isActive('/admin') ? styles.activeLink : styles.link}>Admin</Link>
          )}
          <Link to="/vuln-demo" style={{...styles.link, color:'#f6ad55'}}>⚠️ Demo</Link>
          <div style={styles.user}>
            <span style={styles.userName}>{user.name}</span>
            <span style={styles.roleBadge}>{user.role}</span>
            <button style={styles.logoutBtn} onClick={handleLogout}>Logout</button>
          </div>
        </>}
        {!user && <>
          <Link to="/login" style={styles.link}>Login</Link>
          <Link to="/register" style={styles.link}>Register</Link>
        </>}
      </div>
    </nav>
  );
};

const styles = {
  nav: { display:'flex', justifyContent:'space-between', alignItems:'center', padding:'1rem 2rem', background:'#1a202c', color:'white', boxShadow:'0 2px 10px rgba(0,0,0,0.3)' },
  brand: { color:'white', textDecoration:'none', fontWeight:'bold', fontSize:'1.2rem' },
  links: { display:'flex', alignItems:'center', gap:'1.25rem' },
  link: { color:'#a0aec0', textDecoration:'none', fontSize:'14px' },
  activeLink: { color:'white', textDecoration:'none', fontSize:'14px', fontWeight:'bold' },
  user: { display:'flex', alignItems:'center', gap:'0.75rem', marginLeft:'1rem', paddingLeft:'1rem', borderLeft:'1px solid #4a5568' },
  userName: { fontSize:'14px', color:'#e2e8f0' },
  roleBadge: { background:'#2d3748', padding:'2px 8px', borderRadius:'12px', fontSize:'11px', color:'#90cdf4' },
  logoutBtn: { padding:'0.3rem 0.75rem', background:'#e53e3e', color:'white', border:'none', borderRadius:'6px', cursor:'pointer', fontSize:'12px' },
};

export default Navbar;
