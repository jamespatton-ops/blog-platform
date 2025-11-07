import { useEffect, useState } from 'react';

import api from '../api.js';
import ThemeBuilder from '../components/themes/ThemeBuilder.jsx';
import ThemePreview from '../components/themes/ThemePreview.jsx';
import ThemeSelector from '../components/themes/ThemeSelector.jsx';
import './pages.css';

export default function Themes() {
  const [publicThemes, setPublicThemes] = useState([]);
  const [personalThemes, setPersonalThemes] = useState([]);
  const [selected, setSelected] = useState(null);
  const [error, setError] = useState('');
  const [token, setToken] = useState(() => getToken());

  useEffect(() => {
    let cancelled = false;
    async function loadThemes() {
      try {
        const response = await api.get('/api/themes', token ? { token } : undefined);
        if (!cancelled) {
          setPublicThemes(response.public || []);
          setPersonalThemes(response.personal || []);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message);
        }
      }
    }
    loadThemes();
    return () => {
      cancelled = true;
    };
  }, [token]);

  useEffect(() => {
    setToken(getToken());
  }, []);

  const handleCreated = (theme) => {
    setPersonalThemes((current) => [theme, ...current]);
    setSelected(theme);
  };

  const handleSelect = (theme) => {
    setSelected(theme);
    if (theme && theme.colors) {
      let colors = theme.colors;
      if (typeof colors === 'string') {
        try {
          colors = JSON.parse(colors);
        } catch (err) {
          colors = null;
        }
      }
      if (colors?.background) {
        document.documentElement.style.setProperty('--surface-background', colors.background);
      }
      if (colors?.text) {
        document.documentElement.style.setProperty('--text-primary', colors.text);
      }
      if (colors?.primary) {
        document.documentElement.style.setProperty('--accent-primary', colors.primary);
      }
    }
  };

  return (
    <div className="page">
      <header className="page-header">
        <h2>Theme studio</h2>
        <p>Design a visual identity for your OOLUME space.</p>
      </header>

      {error && <p role="alert">{error}</p>}

      <ThemeBuilder onCreated={handleCreated} />

      <ThemeSelector personal={personalThemes} publicThemes={publicThemes} onSelect={handleSelect} />

      {selected && (
        <section className="dashboard-section">
          <h3 className="ooulume-section-title">Selected theme</h3>
          <ThemePreview theme={selected} />
        </section>
      )}
    </div>
  );
}

function getToken() {
  if (typeof window === 'undefined') {
    return undefined;
  }
  return window.localStorage.getItem('ooulume-token') || undefined;
}
