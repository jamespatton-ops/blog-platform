import { safeDb } from '@/lib/db';
import { PostList } from '@/components/PostList';

export default async function Home() {
  const db = await safeDb();
  const posts = db.available ? await db.client.listPublishedPosts() : [];

  return (
    <main>
      <h1 style={{ fontWeight: 600, fontSize: '1.25rem' }}>Writing</h1>
      {!db.available && (
        <p style={{ marginTop: '1rem', opacity: 0.7 }}>
          Database not initialized. Run <code>npm run migrate</code> and <code>npm run seed</code> to get started.
        </p>
      )}
      <PostList
        posts={posts.map((post) => ({
          slug: post.slug,
          title: post.title,
          createdAt: new Date(post.createdAt)
        }))}
      />
    </main>
  );
}
