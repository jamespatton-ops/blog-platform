import './media.css';

const FALLBACKS = {
  music: '🎧',
  movies: '🎬',
  books: '📚',
};

export default function CoverImage({ src, alt, type = 'music' }) {
  if (src) {
    return <img className="media-cover" src={src} alt={alt ?? ''} loading="lazy" />;
  }
  return (
    <div className="media-cover media-cover--fallback" aria-hidden>
      <span>{FALLBACKS[type] || '⭐'}</span>
    </div>
  );
}
