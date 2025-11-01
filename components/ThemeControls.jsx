'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { coerceTokens, DEFAULT_TOKENS, stringifyTokens } from '@/lib/tokens';
import { tokensToCssVars } from '@/lib/theme';

function applyTokensToRoot(tokens) {
  const coerced = coerceTokens(tokens);
  const vars = tokensToCssVars(coerced);
  const root = document.documentElement;
  Object.entries(vars).forEach(([key, value]) => {
    root.style.setProperty(key, value);
  });
}

export function ThemeControls({ initialThemes = [], initialFonts = [] }) {
  const [themes, setThemes] = useState(initialThemes);
  const [fonts, setFonts] = useState(initialFonts);
  const [selectedId, setSelectedId] = useState(initialThemes[0]?.id ?? null);
  const [editorValue, setEditorValue] = useState(() => stringifyTokens(initialThemes[0]?.tokens ?? DEFAULT_TOKENS));
  const [nameDraft, setNameDraft] = useState(initialThemes[0]?.name ?? '');
  const [parseError, setParseError] = useState('');
  const [saveMessage, setSaveMessage] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [fontStatus, setFontStatus] = useState('');
  const originalStyle = useRef('');

  const selectedTheme = useMemo(() => themes.find((theme) => theme.id === selectedId) ?? null, [selectedId, themes]);

  useEffect(() => {
    const root = document.documentElement;
    originalStyle.current = root.getAttribute('style') ?? '';
    return () => {
      root.setAttribute('style', originalStyle.current);
    };
  }, []);

  useEffect(() => {
    if (!selectedTheme) {
      return;
    }
    setNameDraft(selectedTheme.name);
    const tokens = coerceTokens(selectedTheme.tokens);
    setEditorValue(stringifyTokens(tokens));
    setSaveMessage('');
    setParseError('');
    applyTokensToRoot(tokens);
  }, [selectedTheme]);

  useEffect(() => {
    try {
      const parsed = JSON.parse(editorValue);
      setParseError('');
      applyTokensToRoot(parsed);
    } catch (error) {
      setParseError('Tokens must be valid JSON');
    }
  }, [editorValue]);

  const handleSave = async () => {
    if (!selectedTheme) {
      return;
    }
    try {
      const parsed = JSON.parse(editorValue);
      const payload = {
        name: nameDraft,
        tokens: parsed
      };
      setIsSaving(true);
      setSaveMessage('Saving…');
      const response = await fetch(`/api/themes/${selectedTheme.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!response.ok) {
        if (response.status === 409) {
          setSaveMessage('Theme name must be unique.');
        } else {
          setSaveMessage('Unable to save theme');
        }
        return;
      }
      const { theme } = await response.json();
      setThemes((current) => current.map((item) => (item.id === theme.id ? theme : item)));
      setSaveMessage('Saved');
    } catch (error) {
      setSaveMessage('Unable to save theme');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSetDefault = async (themeId) => {
    const response = await fetch(`/api/themes/${themeId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isDefault: true })
    });
    if (!response.ok) {
      return;
    }
    const { theme } = await response.json();
    setThemes((current) =>
      current.map((item) => ({ ...item, isDefault: item.id === theme.id }))
    );
    setSaveMessage(`Default theme set to ${theme.name}`);
  };

  const handleCreate = async () => {
    const base = selectedTheme ? coerceTokens(selectedTheme.tokens) : DEFAULT_TOKENS;
    const name = `Theme ${themes.length + 1}`;
    const response = await fetch('/api/themes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, tokens: base })
    });
    if (!response.ok) {
      setSaveMessage('Unable to create theme');
      return;
    }
    const { theme } = await response.json();
    setThemes((current) => [...current, theme]);
    setSelectedId(theme.id);
    setSaveMessage('Theme created');
  };

  const handleDelete = async (themeId) => {
    const response = await fetch(`/api/themes/${themeId}`, { method: 'DELETE' });
    if (!response.ok) {
      return;
    }
    setThemes((current) => {
      const next = current.filter((item) => item.id !== themeId);
      if (selectedId === themeId) {
        setSelectedId(next[0]?.id ?? null);
      }
      return next;
    });
    setSaveMessage('Theme removed');
  };

  const handleFontSubmit = async (event) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setFontStatus('Uploading…');
    const response = await fetch('/api/fonts', {
      method: 'POST',
      body: formData
    });
    if (!response.ok) {
      setFontStatus('Upload failed');
      return;
    }
    const { font } = await response.json();
    setFonts((current) => [...current, font]);
    setFontStatus('Uploaded');
    event.currentTarget.reset();
  };

  return (
    <div className="theme-manager">
      <section>
        <header>
          <h1>Theme library</h1>
          <p className="status-indicator">Select a theme to edit tokens. Changes preview instantly.</p>
        </header>
        <div className="theme-list" role="list">
          {themes.map((theme) => (
            <article key={theme.id} className="theme-card" role="listitem">
              <div>
                <h3>{theme.name}</h3>
                {theme.isDefault ? <span className="badge">Default</span> : null}
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button type="button" onClick={() => setSelectedId(theme.id)}>
                  Edit
                </button>
                <button type="button" onClick={() => handleSetDefault(theme.id)} disabled={theme.isDefault}>
                  Set default
                </button>
                <button type="button" onClick={() => handleDelete(theme.id)}>
                  Delete
                </button>
              </div>
            </article>
          ))}
        </div>
        <button type="button" onClick={handleCreate} style={{ marginTop: '1rem' }}>
          New theme
        </button>
      </section>

      {selectedTheme ? (
        <section className="theme-editor">
          <h2>Edit theme</h2>
          <label>
            <span>Name</span>
            <input
              value={nameDraft}
              onChange={(event) => {
                setNameDraft(event.target.value);
                setSaveMessage('');
              }}
            />
          </label>
          <label>
            <span>Tokens</span>
            <textarea
              value={editorValue}
              onChange={(event) => {
                setEditorValue(event.target.value);
                setSaveMessage('');
              }}
            />
          </label>
          {parseError ? <p className="status-indicator" style={{ color: 'var(--accent)' }}>{parseError}</p> : null}
          {saveMessage ? <p className="status-indicator">{saveMessage}</p> : null}
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button type="button" onClick={handleSave} disabled={isSaving || Boolean(parseError)}>
              Save changes
            </button>
            <button
              type="button"
              onClick={() => selectedTheme && setEditorValue(stringifyTokens(coerceTokens(selectedTheme.tokens)))}
            >
              Revert
            </button>
          </div>
        </section>
      ) : null}

      <section>
        <h2>Font library</h2>
        <p className="status-indicator">Upload self-hosted .woff2 files to reference in themes.</p>
        <form onSubmit={handleFontSubmit} style={{ display: 'grid', gap: '0.75rem', marginBottom: '1.5rem' }}>
          <label>
            <span>Family</span>
            <input name="family" required />
          </label>
          <label>
            <span>Style</span>
            <input name="style" placeholder="normal" defaultValue="normal" required />
          </label>
          <label>
            <span>Weight min</span>
            <input name="weightMin" type="number" min="100" max="1000" step="50" defaultValue="400" required />
          </label>
          <label>
            <span>Weight max</span>
            <input name="weightMax" type="number" min="100" max="1000" step="50" defaultValue="700" required />
          </label>
          <label>
            <span>Display strategy</span>
            <input name="display" placeholder="swap" defaultValue="swap" required />
          </label>
          <label>
            <span>Font file (.woff2)</span>
            <input name="file" type="file" accept=".woff2" required />
          </label>
          <button type="submit">Upload font</button>
          {fontStatus ? <p className="status-indicator">{fontStatus}</p> : null}
        </form>
        <div>
          {fonts.length === 0 ? (
            <p>No custom fonts registered.</p>
          ) : (
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: '0.75rem' }}>
              {fonts.map((font) => (
                <li key={font.id} style={{ border: '1px solid var(--muted)', padding: '0.75rem' }}>
                  <strong>{font.family}</strong> · {font.style} · {font.weightMin}–{font.weightMax}
                  <div className="status-indicator">{font.srcUrl}</div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}
