import { useEffect, useState } from 'react';

import api from '../api.js';
import MediaGrid from '../components/media/MediaGrid.jsx';
import './pages.css';

export default function Dashboard() {
  const [entries, setEntries] = useState([]);
  const [music, setMusic] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const token = window.localStorage.getItem('ooulume-token') || undefined;
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError('');
      try {
        if (token) {
          const [entriesResponse, musicResponse] = await Promise.all([
            api.get('/api/entries?limit=5', { token }),
            api.get('/api/music', { token }),
          ]);
          if (!cancelled) {
            setEntries(entriesResponse.entries || []);
            setMusic((musicResponse.music || []).slice(0, 4));
          }
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="page">
      <header className="page-header">
        <h2>Welcome back</h2>
        <p>Track what you are listening to, watching, and reading.</p>
      </header>

      {error && <p role="alert">{error}</p>}
      {loading && <p>Loading your latest updates…</p>}

      {!loading && tokenAvailable() && (
        <section className="dashboard-section">
          <h3 className="ooulume-section-title">Recent journal entries</h3>
          {entries.length === 0 ? (
            <p>You have not written any entries yet. Start a new journal entry from the Journal page.</p>
          ) : (
            <ul className="dashboard-list">
              {entries.map((entry) => (
                <li key={entry.id}>
                  <h4>{entry.title}</h4>
                  <p>{new Date(entry.timestamp).toLocaleString()}</p>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      <section className="dashboard-section">
        <h3 className="ooulume-section-title">Listening lately</h3>
        {music.length > 0 ? <MediaGrid items={music} type="music" /> : <p>Add music you love to see it here.</p>}
      </section>
    </div>
  );
}

function tokenAvailable() {
  return Boolean(window.localStorage.getItem('ooulume-token'));
}
