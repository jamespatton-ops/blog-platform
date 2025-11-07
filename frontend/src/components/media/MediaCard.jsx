import CoverImage from './CoverImage.jsx';
import './media.css';

function TagList({ tags }) {
  if (!tags || (Array.isArray(tags) && tags.length === 0)) {
    return null;
  }
  const normalized = Array.isArray(tags)
    ? tags
    : typeof tags === 'string'
    ? tags.split(',').map((tag) => tag.trim()).filter(Boolean)
    : [];

  if (normalized.length === 0) {
    return null;
  }

  return (
    <div className="media-tags">
      {normalized.map((tag) => (
        <span className="media-tag" key={tag}>
          {tag}
        </span>
      ))}
    </div>
  );
}

export default function MediaCard({ item, type }) {
  const rating = item.rating ? Number(item.rating) : undefined;

  return (
    <article className="media-card">
      <CoverImage src={item.cover_url} alt={item.title} type={type} />
      <div className="media-meta">
        <h3>{item.title}</h3>
        {item.artist && <span className="media-secondary">{item.artist}</span>}
        {item.director && <span className="media-secondary">Directed by {item.director}</span>}
        {item.author && <span className="media-secondary">{item.author}</span>}
        {Number.isInteger(rating) && rating > 0 && (
          <span className="media-secondary">
            Rating: {'★'.repeat(rating)}
            {rating < 5 ? '☆'.repeat(5 - rating) : ''}
          </span>
        )}
        {item.review && <p className="media-secondary">{item.review}</p>}
      </div>
      <TagList tags={item.tags} />
    </article>
  );
}
