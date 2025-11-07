import { Navigate, Route, Routes } from 'react-router-dom';

import Layout from './components/layout/Layout.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Journal from './pages/Journal.jsx';
import Music from './pages/Music.jsx';
import Movies from './pages/Movies.jsx';
import Books from './pages/Books.jsx';
import Themes from './pages/Themes.jsx';

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/journal" element={<Journal />} />
        <Route path="/music" element={<Music />} />
        <Route path="/movies" element={<Movies />} />
        <Route path="/books" element={<Books />} />
        <Route path="/themes" element={<Themes />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
}
