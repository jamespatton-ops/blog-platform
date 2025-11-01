'use client';

import { useState } from 'react';

type ThemeValues = {
  font_stack: string;
  max_width_ch: number;
  base_font_size_px: number;
  leading: number;
  text_color: string;
  bg_color: string;
  accent_color: string;
};

export function ThemeControls({ initial }: { initial: ThemeValues }) {
  const [values, setValues] = useState(initial);
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved'>('idle');

  function updateField<K extends keyof ThemeValues>(key: K, value: ThemeValues[K]) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus('saving');
    const response = await fetch('/api/theme', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(values)
    });
    if (response.ok) {
      applyTheme(values);
      setStatus('saved');
    } else {
      setStatus('idle');
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '1.5rem' }}>
      <label style={{ display: 'grid', gap: '0.5rem' }}>
        <span>Font stack</span>
        <input
          value={values.font_stack}
          onChange={(event) => updateField('font_stack', event.target.value)}
          placeholder="-apple-system,BlinkMacSystemFont,..."
        />
      </label>
      <label style={{ display: 'grid', gap: '0.5rem' }}>
        <span>Max width (ch)</span>
        <input
          type="number"
          value={values.max_width_ch}
          onChange={(event) => updateField('max_width_ch', Number(event.target.value))}
          min={50}
          max={100}
        />
      </label>
      <label style={{ display: 'grid', gap: '0.5rem' }}>
        <span>Base font size (px)</span>
        <input
          type="number"
          value={values.base_font_size_px}
          onChange={(event) => updateField('base_font_size_px', Number(event.target.value))}
          min={14}
          max={24}
        />
      </label>
      <label style={{ display: 'grid', gap: '0.5rem' }}>
        <span>Leading</span>
        <input
          type="number"
          step={0.05}
          value={values.leading}
          onChange={(event) => updateField('leading', Number(event.target.value))}
          min={1.2}
          max={2.5}
        />
      </label>
      <label style={{ display: 'grid', gap: '0.5rem' }}>
        <span>Text color</span>
        <input
          type="color"
          value={values.text_color}
          onChange={(event) => updateField('text_color', event.target.value)}
        />
      </label>
      <label style={{ display: 'grid', gap: '0.5rem' }}>
        <span>Background color</span>
        <input
          type="color"
          value={values.bg_color}
          onChange={(event) => updateField('bg_color', event.target.value)}
        />
      </label>
      <label style={{ display: 'grid', gap: '0.5rem' }}>
        <span>Accent color</span>
        <input
          type="color"
          value={values.accent_color}
          onChange={(event) => updateField('accent_color', event.target.value)}
        />
      </label>
      <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
        <button type="submit">Save theme</button>
        <span style={{ fontSize: '0.875rem', opacity: 0.7 }}>
          {status === 'saving' ? 'Saving…' : status === 'saved' ? 'Saved' : ''}
        </span>
      </div>
    </form>
  );
}

function applyTheme(values: ThemeValues) {
  const root = document.documentElement;
  root.style.setProperty('--font', values.font_stack);
  root.style.setProperty('--max-ch', String(values.max_width_ch));
  root.style.setProperty('--base', `${values.base_font_size_px}px`);
  root.style.setProperty('--leading', String(values.leading));
  root.style.setProperty('--text', values.text_color);
  root.style.setProperty('--bg', values.bg_color);
  root.style.setProperty('--accent', values.accent_color);
}
