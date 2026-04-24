// src/App.js
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Books from './pages/Books';
import MyIssues from './pages/MyIssues';
import AdminPanel from './pages/AdminPanel';
import LibrarianPanel from './pages/LibrarianPanel';
import VulnDemo from './pages/VulnDemo';
import Navbar from './components/Navbar';

const ProtectedRoute = ({ children, roles }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading">Loading...</div>;
  if (!user) return <Navigate to="/login" />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/dashboard" />;
  return children;
};

const AppRoutes = () => (
  <>
    <Navbar />
    <Routes>
      <Route path="/" element={<Navigate to="/dashboard" />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/books" element={<ProtectedRoute><Books /></ProtectedRoute>} />
      <Route path="/my-issues" element={<ProtectedRoute><MyIssues /></ProtectedRoute>} />
      <Route path="/librarian" element={<ProtectedRoute roles={['librarian', 'admin']}><LibrarianPanel /></ProtectedRoute>} />
      <Route path="/admin" element={<ProtectedRoute roles={['admin']}><AdminPanel /></ProtectedRoute>} />
      <Route path="/vuln-demo" element={<VulnDemo />} />
    </Routes>
  </>
);

function App() {
  return (
    <AuthProvider>
      <Router>
        <AppRoutes />
      </Router>
    </AuthProvider>
  );
}

export default App;