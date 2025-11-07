import { useEffect, useState } from 'react';

import api from '../api.js';
import MediaGrid from '../components/media/MediaGrid.jsx';
import './pages.css';

const emptyMusic = {
  title: '',
  artist: '',
  rating: 4,
  tags: '',
};

export default function Music() {
  const [music, setMusic] = useState([]);
  const [form, setForm] = useState(emptyMusic);
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');
  const [token, setToken] = useState(() => getToken());

  useEffect(() => {
    let cancelled = false;
    async function loadMusic() {
      if (!token) return;
      try {
        const response = await api.get('/api/music', { token });
        if (!cancelled) {
          setMusic(response.music || []);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message);
        }
      }
    }
    loadMusic();
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
      setError('Sign in to add music.');
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
      const response = await api.post('/api/music', { token: authToken, body: payload });
      setMusic((current) => [response.music, ...current]);
      setForm(emptyMusic);
    } catch (err) {
      setError(err.message);
    } finally {
      setStatus('idle');
    }
  };

  return (
    <div className="page">
      <header className="page-header">
        <h2>Music log</h2>
        <p>Capture the albums and singles that define your season.</p>
      </header>

      {error && <p role="alert">{error}</p>}

      <form className="media-form" onSubmit={handleSubmit}>
        <div className="media-form__row">
          <input name="title" placeholder="Album or track title" value={form.title} onChange={handleChange} required />
          <input name="artist" placeholder="Artist" value={form.artist} onChange={handleChange} required />
          <input name="rating" type="number" min="1" max="5" value={form.rating} onChange={handleChange} />
        </div>
        <input name="tags" placeholder="Comma separated tags" value={form.tags} onChange={handleChange} />
        <button type="submit" disabled={status === 'submitting'}>
          {status === 'submitting' ? 'Saving…' : 'Add music'}
        </button>
      </form>

      <MediaGrid items={music} type="music" />
    </div>
  );
}

function getToken() {
  if (typeof window === 'undefined') {
    return undefined;
  }
  return window.localStorage.getItem('ooulume-token') || undefined;
}
