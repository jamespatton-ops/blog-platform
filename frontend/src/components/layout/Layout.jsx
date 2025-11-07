import { useEffect, useState } from 'react';

import Header from './Header.jsx';
import Sidebar from './Sidebar.jsx';
import './layout.css';

function getInitialTheme() {
  if (typeof window === 'undefined') {
    return 'light';
  }
  return window.localStorage.getItem('ooulume-theme') || 'light';
}

export default function Layout({ children }) {
  const [theme, setTheme] = useState(getInitialTheme);

  useEffect(() => {
    window.localStorage.setItem('ooulume-theme', theme);
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, []);

  const toggleTheme = () => {
    setTheme((current) => (current === 'dark' ? 'light' : 'dark'));
  };

  return (
    <div className="ooulume-shell">
      <Sidebar />
      <div className="ooulume-main">
        <Header theme={theme} onToggleTheme={toggleTheme} />
        <main className="ooulume-content">{children}</main>
      </div>
    </div>
  );
}
