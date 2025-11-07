import './themes.css';

function normalizeColors(colors) {
  if (!colors) return {};
  if (typeof colors === 'string') {
    try {
      return JSON.parse(colors);
    } catch (error) {
      return {};
    }
  }
  return colors;
}

export default function ThemePreview({ theme }) {
  const colors = normalizeColors(theme.colors);
  const fonts = typeof theme.fonts === 'string' ? (() => {
    try {
      return JSON.parse(theme.fonts);
    } catch (error) {
      return {};
    }
  })() : theme.fonts || {};

  const animations = typeof theme.animations === 'string' ? (() => {
    try {
      return JSON.parse(theme.animations);
    } catch (error) {
      return {};
    }
  })() : theme.animations || {};

  const style = {
    '--preview-primary': colors.primary || 'var(--accent-primary)',
    '--preview-background': colors.background || 'var(--surface-panel)',
    '--preview-text': colors.text || 'var(--text-primary)',
    '--preview-accent': colors.accent || colors.primary || 'var(--accent-primary)',
    '--preview-font': fonts.heading || 'inherit',
    '--preview-spacing': theme.spacing_scale || '1.2',
    '--preview-radius': theme.borderRadius || '12px',
  };

  return (
    <div className="theme-preview" style={style}>
      <div className="theme-preview__header">
        <span>{theme.name}</span>
        <span className="theme-preview__pill">{theme.is_public ? 'Public' : 'Private'}</span>
      </div>
      <div className="theme-preview__body" style={{ animationDuration: animations.duration || '1s' }}>
        <h4>Typography</h4>
        <p>The quick brown fox jumps over the lazy dog.</p>
        <div className="theme-preview__buttons">
          <button type="button">Primary</button>
          <button type="button" className="outline">
            Secondary
          </button>
        </div>
      </div>
    </div>
  );
}
