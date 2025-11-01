import { prisma } from '@/lib/db';
import { PostList } from '@/components/PostList';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const posts = await prisma.post.findMany({
    where: { status: 'PUBLISHED' },
    orderBy: { createdAt: 'desc' },
    select: { title: true, slug: true, createdAt: true }
  });

  return (
    <main>
      <header style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <h1 style={{ fontWeight: 600, fontSize: '1.5rem', margin: 0 }}>Writing</h1>
        <p style={{ margin: 0, opacity: 0.7 }}>Collected essays, notes, and drafts.</p>
      </header>
      <PostList posts={posts} />
    </main>
  );
}
