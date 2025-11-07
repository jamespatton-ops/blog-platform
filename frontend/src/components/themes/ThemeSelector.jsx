import ThemePreview from './ThemePreview.jsx';
import './themes.css';

export default function ThemeSelector({ personal = [], publicThemes = [], onSelect }) {
  const handleSelect = (theme) => {
    if (onSelect) {
      onSelect(theme);
    }
  };

  return (
    <div className="theme-section">
      <section>
        <h3>Your themes</h3>
        <div className="theme-grid">
          {personal.length === 0 && <p>You have not created any custom themes yet.</p>}
          {personal.map((theme) => (
            <button
              type="button"
              key={theme.id}
              className="theme-preview-button"
              onClick={() => handleSelect(theme)}
            >
              <ThemePreview theme={theme} />
            </button>
          ))}
        </div>
      </section>

      <section>
        <h3>Community themes</h3>
        <div className="theme-grid">
          {publicThemes.length === 0 && <p>No public themes yet. Share yours!</p>}
          {publicThemes.map((theme) => (
            <button
              type="button"
              key={theme.id}
              className="theme-preview-button"
              onClick={() => handleSelect(theme)}
            >
              <ThemePreview theme={theme} />
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
