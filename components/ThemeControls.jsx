'use client';

import { useEffect, useMemo, useState } from 'react';
import { tryNormalizeTokens, DEFAULT_TOKENS } from '@/lib/tokens';
import { tokensToCssVars } from '@/lib/theme';

export function ThemeControls({ theme }) {
  const [text, setText] = useState(() => JSON.stringify(theme.tokens ?? DEFAULT_TOKENS, null, 2));
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState(null);

  const { tokens, valid } = useMemo(() => {
    try {
      const parsed = JSON.parse(text);
      return tryNormalizeTokens(parsed);
    } catch (err) {
      return { tokens: DEFAULT_TOKENS, valid: false };
    }
  }, [text]);

  useEffect(() => {
    const root = document.documentElement;
    const vars = tokensToCssVars(tokens);
    Object.entries(vars).forEach(([key, value]) => {
      root.style.setProperty(key, String(value));
    });
  }, [tokens]);

  async function handleSubmit(event) {
    event.preventDefault();
    if (!valid) {
      setError('Theme tokens must be valid JSON with supported keys.');
      return;
    }

    setStatus('saving');
    setError(null);

    const response = await fetch('/api/themes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: theme.id,
        name: theme.name,
        tokens,
        isDefault: true
      })
    });

    if (!response.ok) {
      setStatus('error');
      setError('Unable to save theme.');
      return;
    }

    setStatus('saved');
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '1rem', maxWidth: '36rem' }}>
      <label style={{ display: 'grid', gap: '0.5rem' }}>
        <span style={{ fontSize: '0.875rem', opacity: 0.7 }}>Theme tokens (JSON)</span>
        <textarea
          value={text}
          onChange={(event) => {
            setText(event.target.value);
            setStatus('idle');
          }}
          spellCheck={false}
          style={{
            width: '100%',
            minHeight: '20rem',
            border: '1px solid rgba(0,0,0,0.12)',
            padding: '1rem',
            fontFamily: 'ui-monospace, SFMono-Regular, SFMono, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
            fontSize: '0.875rem'
          }}
        />
      </label>
      {!valid && (
        <p style={{ color: 'crimson', fontSize: '0.875rem' }}>
          Invalid token values. Ensure numbers and colors are correctly formatted.
        </p>
      )}
      {error && (
        <p style={{ color: 'crimson', fontSize: '0.875rem' }}>{error}</p>
      )}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <button type="submit" disabled={!valid || status === 'saving'}>
          Save theme
        </button>
        <span style={{ fontSize: '0.875rem', opacity: 0.7 }}>
          {status === 'saving' ? 'Saving…' : status === 'saved' ? 'Saved' : ''}
        </span>
      </div>
      <details>
        <summary style={{ cursor: 'pointer', fontSize: '0.875rem', opacity: 0.7 }}>Token reference</summary>
        <TokenTable tokens={tokens} />
      </details>
    </form>
  );
}

function TokenTable({ tokens }) {
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem', marginTop: '0.5rem' }}>
      <tbody>
        {Object.entries(tokens).map(([key, value]) => (
          <tr key={key}>
            <th
              style={{
                textAlign: 'left',
                fontWeight: 500,
                padding: '0.25rem 0.5rem 0.25rem 0',
                width: '12rem'
              }}
            >
              {key}
            </th>
            <td style={{ padding: '0.25rem 0.5rem' }}>{String(value)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
