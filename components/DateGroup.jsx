import { TimelineEntry } from './TimelineList';

export function DateGroup({ label, posts }) {
  return (
    <section className="timeline-group">
      <h2>{label}</h2>
      {posts.map((post) => (
        <TimelineEntry key={post.id} post={post} />
      ))}
    </section>
  );
}
