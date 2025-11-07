import { useEffect, useState } from 'react';

import api from '../api.js';
import MediaGrid from '../components/media/MediaGrid.jsx';
import './pages.css';

const emptyBook = {
  title: '',
  author: '',
  status: 'reading',
  rating: 4,
  tags: '',
};

export default function Books() {
  const [books, setBooks] = useState([]);
  const [form, setForm] = useState(emptyBook);
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');
  const [token, setToken] = useState(() => getToken());

  useEffect(() => {
    let cancelled = false;
    async function loadBooks() {
      if (!token) return;
      try {
        const response = await api.get('/api/books', { token });
        if (!cancelled) {
          setBooks(response.books || []);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message);
        }
      }
    }
    loadBooks();
    return () => {
      cancelled = true;
    };
  }, [token]);

  useEffect(() => {
    setToken(getToken());
  }, []);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const authToken = getToken();
    if (!authToken) {
      setError('Sign in to add books.');
      return;
    }
    setStatus('submitting');
    setError('');
    try {
      const payload = {
        ...form,
        rating: Number(form.rating),
        tags: form.tags ? form.tags.split(',').map((tag) => tag.trim()).filter(Boolean) : undefined,
      };
      const response = await api.post('/api/books', { token: authToken, body: payload });
      setBooks((current) => [response.book, ...current]);
      setForm(emptyBook);
    } catch (err) {
      setError(err.message);
    } finally {
      setStatus('idle');
    }
  };

  return (
    <div className="page">
      <header className="page-header">
        <h2>Bookshelf</h2>
        <p>Catalog the stories shaping your perspective.</p>
      </header>

      {error && <p role="alert">{error}</p>}

      <form className="media-form" onSubmit={handleSubmit}>
        <div className="media-form__row">
          <input name="title" placeholder="Book title" value={form.title} onChange={handleChange} required />
          <input name="author" placeholder="Author" value={form.author} onChange={handleChange} required />
          <select name="status" value={form.status} onChange={handleChange}>
            <option value="reading">Reading</option>
            <option value="completed">Completed</option>
            <option value="want_to_read">Want to read</option>
          </select>
          <input name="rating" type="number" min="1" max="5" value={form.rating} onChange={handleChange} />
        </div>
        <input name="tags" placeholder="Comma separated tags" value={form.tags} onChange={handleChange} />
        <button type="submit" disabled={status === 'submitting'}>
          {status === 'submitting' ? 'Saving…' : 'Add book'}
        </button>
      </form>

      <MediaGrid items={books} type="books" />
    </div>
  );
}

function getToken() {
  if (typeof window === 'undefined') {
    return undefined;
  }
  return window.localStorage.getItem('ooulume-token') || undefined;
}
