import { Moon, Sun } from 'lucide-react';

import './layout.css';

export default function Header({ theme, onToggleTheme }) {
  return (
    <header className="ooulume-header">
      <div>
        <h1 className="ooulume-logo">OOLUME</h1>
        <p className="ooulume-subtitle">Your personal digital space</p>
      </div>
      <button className="ooulume-header__toggle" type="button" onClick={onToggleTheme} aria-label="Toggle theme">
        {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        <span>{theme === 'dark' ? 'Light mode' : 'Dark mode'}</span>
      </button>
    </header>
  );
}
