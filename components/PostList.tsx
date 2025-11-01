import Link from 'next/link';

type PostListItem = {
  slug: string;
  title: string;
  createdAt: Date;
};

export function PostList({ posts }: { posts: PostListItem[] }) {
  return (
    <ul style={{ listStyle: 'none', padding: 0, margin: '2rem 0 0' }}>
      {posts.map((post) => (
        <li key={post.slug} style={{ margin: '1rem 0' }}>
          <Link href={`/p/${post.slug}`} prefetch>
            <div style={{ fontSize: '1.125rem', fontWeight: 600 }}>{post.title}</div>
            <time
              dateTime={post.createdAt.toISOString()}
              style={{ display: 'block', fontSize: '0.875rem', opacity: 0.7 }}
            >
              {post.createdAt.toLocaleDateString(undefined, {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
              })}
            </time>
          </Link>
        </li>
      ))}
    </ul>
  );
}
