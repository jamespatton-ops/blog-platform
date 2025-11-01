import Link from 'next/link';
import { DateGroup } from './DateGroup';

function groupPosts(posts) {
  const formatter = new Intl.DateTimeFormat('en', { month: 'long', year: 'numeric' });
  const map = new Map();
  posts.forEach((post) => {
    const created = new Date(post.createdAt);
    const key = `${created.getFullYear()}-${created.getMonth()}`;
    if (!map.has(key)) {
      map.set(key, { label: formatter.format(created), entries: [] });
    }
    map.get(key).entries.push(post);
  });
  return Array.from(map.values()).sort((a, b) => {
    const firstA = new Date(a.entries[0].createdAt);
    const firstB = new Date(b.entries[0].createdAt);
    return firstB - firstA;
  });
}

export function TimelineList({ posts }) {
  if (!posts?.length) {
    return <p>No published entries yet.</p>;
  }

  const groups = groupPosts(posts);

  return (
    <div className="timeline">
      {groups.map((group) => (
        <DateGroup key={group.label} label={group.label} posts={group.entries} />
      ))}
    </div>
  );
}

export function TimelineEntry({ post }) {
  const created = new Date(post.createdAt);
  const timeFormatter = new Intl.DateTimeFormat('en', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });

  return (
    <article className="timeline-entry">
      <h3>
        <Link href={`/p/${post.slug}`}>{post.title}</Link>
      </h3>
      <time dateTime={created.toISOString()}>{timeFormatter.format(created)}</time>
    </article>
  );
}

DateGroup.Entry = TimelineEntry;
