import MediaCard from './MediaCard.jsx';
import './media.css';

export default function MediaGrid({ items = [], type }) {
  if (!items || items.length === 0) {
    return <div className="media-empty">No entries yet. Add your first one!</div>;
  }

  return (
    <div className="media-grid">
      {items.map((item) => (
        <MediaCard key={item.id} item={item} type={type} />
      ))}
    </div>
  );
}
