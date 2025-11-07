import { BookOpen, Brush, Home, Library, Music4, Tv } from 'lucide-react';
import { NavLink } from 'react-router-dom';

import './layout.css';

const links = [
  { to: '/', label: 'Dashboard', icon: Home },
  { to: '/journal', label: 'Journal', icon: BookOpen },
  { to: '/music', label: 'Music', icon: Music4 },
  { to: '/movies', label: 'Movies', icon: Tv },
  { to: '/books', label: 'Books', icon: Library },
  { to: '/themes', label: 'Themes', icon: Brush },
];

export default function Sidebar() {
  return (
    <aside className="ooulume-sidebar">
      <div>
        <h2>Spaces</h2>
      </div>
      <nav>
        {links.map(({ to, label, icon: Icon }) => (
          <NavLink key={to} to={to} className={({ isActive }) => (isActive ? 'active' : undefined)} end={to === '/'}>
            <Icon size={18} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
