import { useEffect, useState } from 'react';

import api from '../api.js';
import MediaGrid from '../components/media/MediaGrid.jsx';
import './pages.css';

const emptyMovie = {
  title: '',
  year: '',
  rating: 5,
  tags: '',
};

export default function Movies() {
  const [movies, setMovies] = useState([]);
  const [form, setForm] = useState(emptyMovie);
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');
  const [token, setToken] = useState(() => getToken());

  useEffect(() => {
    let cancelled = false;
    async function loadMovies() {
      if (!token) return;
      try {
        const response = await api.get('/api/movies', { token });
        if (!cancelled) {
          setMovies(response.movies || []);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message);
        }
      }
    }
    loadMovies();
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
      setError('Sign in to add movies.');
      return;
    }
    setStatus('submitting');
    setError('');
    try {
      const payload = {
        ...form,
        year: form.year ? Number(form.year) : undefined,
        rating: Number(form.rating),
        tags: form.tags ? form.tags.split(',').map((tag) => tag.trim()).filter(Boolean) : undefined,
      };
      const response = await api.post('/api/movies', { token: authToken, body: payload });
      setMovies((current) => [response.movie, ...current]);
      setForm(emptyMovie);
    } catch (err) {
      setError(err.message);
    } finally {
      setStatus('idle');
    }
  };

  return (
    <div className="page">
      <header className="page-header">
        <h2>Movies log</h2>
        <p>Review the films that resonate with you.</p>
      </header>

      {error && <p role="alert">{error}</p>}

      <form className="media-form" onSubmit={handleSubmit}>
        <div className="media-form__row">
          <input name="title" placeholder="Movie title" value={form.title} onChange={handleChange} required />
          <input name="year" placeholder="Year" value={form.year} onChange={handleChange} />
          <input name="rating" type="number" min="1" max="5" value={form.rating} onChange={handleChange} />
        </div>
        <input name="tags" placeholder="Comma separated tags" value={form.tags} onChange={handleChange} />
        <button type="submit" disabled={status === 'submitting'}>
          {status === 'submitting' ? 'Saving…' : 'Add movie'}
        </button>
      </form>

      <MediaGrid items={movies} type="movies" />
    </div>
  );
}

function getToken() {
  if (typeof window === 'undefined') {
    return undefined;
  }
  return window.localStorage.getItem('ooulume-token') || undefined;
}
