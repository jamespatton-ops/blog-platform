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
      <h1 style={{ fontWeight: 600, fontSize: '1.5rem' }}>Writing</h1>
      <PostList posts={posts} />
    </main>
  );
}
