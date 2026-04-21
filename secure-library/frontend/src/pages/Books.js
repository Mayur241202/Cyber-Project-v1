// src/pages/Books.js
import React, { useEffect, useState } from 'react';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';

const Books = () => {
  const { user } = useAuth();
  const [books, setBooks] = useState([]);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title:'', author:'', isbn:'', category:'Technology', totalCopies:1, description:'' });
  const [message, setMessage] = useState('');

  const fetchBooks = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (category) params.append('category', category);
      const { data } = await api.get(`/books?${params}`);
      setBooks(data.books || []);
    } catch { setBooks([]); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchBooks(); }, []);

  const handleAddBook = async (e) => {
    e.preventDefault();
    try {
      await api.post('/books', form);
      setMessage('✅ Book added!');
      setShowForm(false);
      fetchBooks();
    } catch (err) {
      setMessage('❌ ' + (err.response?.data?.error || 'Failed'));
    }
  };

  const handleIssue = async (bookId) => {
    try {
      await api.post('/issues', { bookId, userId: user.id });
      setMessage('✅ Book issued to you!');
      fetchBooks();
    } catch (err) {
      setMessage('❌ ' + (err.response?.data?.error || 'Failed'));
    }
  };

  const categories = ['', 'Fiction', 'Non-Fiction', 'Science', 'Technology', 'History', 'Biography', 'Reference', 'Other'];

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <h1>📚 Book Catalog</h1>
        {['librarian','admin'].includes(user?.role) && (
          <button style={styles.btnAdd} onClick={() => setShowForm(!showForm)}>+ Add Book</button>
        )}
      </div>

      {message && <div style={styles.msg}>{message}</div>}

      <div style={styles.filters}>
        <input style={styles.searchInput} placeholder="Search title, author, ISBN..."
          value={search} onChange={e => setSearch(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && fetchBooks()} />
        <select style={styles.select} value={category} onChange={e => setCategory(e.target.value)}>
          {categories.map(c => <option key={c} value={c}>{c || 'All Categories'}</option>)}
        </select>
        <button style={styles.btnSearch} onClick={fetchBooks}>Search</button>
      </div>

      {showForm && (
        <div style={styles.formCard}>
          <h3>Add New Book</h3>
          <form onSubmit={handleAddBook} style={styles.form}>
            {['title','author','isbn'].map(f => (
              <input key={f} style={styles.input} placeholder={f.charAt(0).toUpperCase()+f.slice(1)}
                value={form[f]} onChange={e => setForm({...form, [f]: e.target.value})} required />
            ))}
            <select style={styles.input} value={form.category} onChange={e => setForm({...form, category: e.target.value})}>
              {categories.slice(1).map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <input style={styles.input} type="number" placeholder="Copies" min="1"
              value={form.totalCopies} onChange={e => setForm({...form, totalCopies: parseInt(e.target.value)})} />
            <textarea style={styles.input} placeholder="Description (optional)"
              value={form.description} onChange={e => setForm({...form, description: e.target.value})} />
            <button style={styles.btnAdd} type="submit">Save Book</button>
          </form>
        </div>
      )}

      {loading ? <p>Loading books...</p> : (
        <div style={styles.grid}>
          {books.map(book => (
            <div key={book._id} style={styles.card}>
              <div style={styles.cardHeader}>
                <span style={styles.category}>{book.category}</span>
                <span style={{...styles.badge, background: book.availableCopies > 0 ? '#c6f6d5' : '#fed7d7',
                  color: book.availableCopies > 0 ? '#276749' : '#c53030'}}>
                  {book.availableCopies > 0 ? `${book.availableCopies} available` : 'Not available'}
                </span>
              </div>
              <h3 style={styles.bookTitle}>{book.title}</h3>
              <p style={styles.author}>by {book.author}</p>
              <p style={styles.isbn}>ISBN: {book.isbn}</p>
              {book.description && <p style={styles.desc}>{book.description.substring(0, 80)}...</p>}
              {book.availableCopies > 0 && user?.role === 'user' && (
                <button style={styles.btnIssue} onClick={() => handleIssue(book._id)}>
                  📖 Borrow
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const styles = {
  page: { maxWidth:'1100px', margin:'2rem auto', padding:'0 1rem' },
  header: { display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1.5rem' },
  filters: { display:'flex', gap:'0.75rem', marginBottom:'1.5rem', flexWrap:'wrap' },
  searchInput: { flex:1, minWidth:'200px', padding:'0.6rem 1rem', border:'1px solid #e2e8f0', borderRadius:'8px', fontSize:'14px' },
  select: { padding:'0.6rem', border:'1px solid #e2e8f0', borderRadius:'8px', fontSize:'14px' },
  btnSearch: { padding:'0.6rem 1.5rem', background:'#3182ce', color:'white', border:'none', borderRadius:'8px', cursor:'pointer' },
  btnAdd: { padding:'0.6rem 1.5rem', background:'#276749', color:'white', border:'none', borderRadius:'8px', cursor:'pointer' },
  msg: { padding:'0.75rem', background:'#ebf8ff', borderRadius:'8px', marginBottom:'1rem' },
  formCard: { background:'white', padding:'1.5rem', borderRadius:'12px', boxShadow:'0 2px 10px rgba(0,0,0,0.08)', marginBottom:'1.5rem' },
  form: { display:'flex', flexDirection:'column', gap:'0.5rem' },
  input: { padding:'0.6rem', border:'1px solid #e2e8f0', borderRadius:'6px', fontSize:'14px' },
  grid: { display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(280px,1fr))', gap:'1rem' },
  card: { background:'white', borderRadius:'12px', padding:'1.25rem', boxShadow:'0 2px 8px rgba(0,0,0,0.08)' },
  cardHeader: { display:'flex', justifyContent:'space-between', marginBottom:'0.5rem' },
  category: { background:'#ebf8ff', color:'#2b6cb0', padding:'2px 8px', borderRadius:'12px', fontSize:'12px' },
  badge: { padding:'2px 8px', borderRadius:'12px', fontSize:'12px', fontWeight:'bold' },
  bookTitle: { margin:'0 0 0.25rem', fontSize:'1rem', color:'#1a202c' },
  author: { color:'#718096', fontSize:'14px', margin:'0 0 0.25rem' },
  isbn: { color:'#a0aec0', fontSize:'12px', margin:'0 0 0.5rem' },
  desc: { color:'#4a5568', fontSize:'13px' },
  btnIssue: { width:'100%', padding:'0.5rem', background:'#3182ce', color:'white', border:'none', borderRadius:'6px', cursor:'pointer', marginTop:'0.75rem' },
};

export default Books;
