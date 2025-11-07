import { useState } from 'react';

import api from '../../api.js';
import './themes.css';

const initialState = {
  name: '',
  primary: '#6366f1',
  background: '#ffffff',
  text: '#111827',
  accent: '#ec4899',
  spacing_scale: '1.2',
  borderRadius: '12px',
  is_public: false,
};

export default function ThemeBuilder({ onCreated }) {
  const [form, setForm] = useState(initialState);
  const [fonts, setFonts] = useState({ heading: 'Inter', body: 'Inter' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;
    setForm((current) => ({
      ...current,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleFontChange = (event) => {
    const { name, value } = event.target;
    setFonts((current) => ({ ...current, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError('');
    try {
      const token = getToken();
      const payload = {
        name: form.name,
        is_public: form.is_public,
        colors: {
          primary: form.primary,
          background: form.background,
          text: form.text,
          accent: form.accent,
        },
        fonts,
        spacing_scale: form.spacing_scale,
        borderRadius: form.borderRadius,
      };
      const result = await api.post('/api/themes', {
        body: payload,
        token,
      });
      setForm(initialState);
      setFonts({ heading: 'Inter', body: 'Inter' });
      if (onCreated) {
        onCreated(result.theme);
      }
    } catch (err) {
      setError(err.message || 'Unable to create theme');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form className="theme-form" onSubmit={handleSubmit}>
      <h3>Create a theme</h3>
      {error && <p role="alert">{error}</p>}
      <div className="theme-form__row">
        <div className="theme-form__group">
          <label htmlFor="name">Theme name</label>
          <input id="name" name="name" value={form.name} onChange={handleChange} required />
        </div>
        <label className="theme-form__group">
          <span>Public theme</span>
          <input type="checkbox" name="is_public" checked={form.is_public} onChange={handleChange} />
        </label>
      </div>

      <div className="theme-form__row">
        <div className="theme-form__group">
          <label htmlFor="primary">Primary color</label>
          <input id="primary" name="primary" type="color" value={form.primary} onChange={handleChange} />
        </div>
        <div className="theme-form__group">
          <label htmlFor="accent">Accent color</label>
          <input id="accent" name="accent" type="color" value={form.accent} onChange={handleChange} />
        </div>
        <div className="theme-form__group">
          <label htmlFor="background">Background</label>
          <input id="background" name="background" type="color" value={form.background} onChange={handleChange} />
        </div>
        <div className="theme-form__group">
          <label htmlFor="text">Text color</label>
          <input id="text" name="text" type="color" value={form.text} onChange={handleChange} />
        </div>
      </div>

      <div className="theme-form__row">
        <div className="theme-form__group">
          <label htmlFor="heading">Heading font</label>
          <input id="heading" name="heading" value={fonts.heading} onChange={handleFontChange} placeholder="Inter" />
        </div>
        <div className="theme-form__group">
          <label htmlFor="body">Body font</label>
          <input id="body" name="body" value={fonts.body} onChange={handleFontChange} placeholder="Inter" />
        </div>
      </div>

      <div className="theme-form__row">
        <div className="theme-form__group">
          <label htmlFor="spacing_scale">Spacing scale</label>
          <input
            id="spacing_scale"
            name="spacing_scale"
            type="number"
            step="0.05"
            value={form.spacing_scale}
            onChange={handleChange}
          />
        </div>
        <div className="theme-form__group">
          <label htmlFor="borderRadius">Border radius</label>
          <input id="borderRadius" name="borderRadius" value={form.borderRadius} onChange={handleChange} />
        </div>
      </div>

      <button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Saving…' : 'Save theme'}
      </button>
    </form>
  );
}

function getToken() {
  if (typeof window === 'undefined') {
    return undefined;
  }
  return window.localStorage.getItem('ooulume-token') || undefined;
}
