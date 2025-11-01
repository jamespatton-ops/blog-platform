import { prisma } from '@/lib/prisma';
import { TimelineList } from '@/components/TimelineList';

export const revalidate = 60;

export default async function Home() {
  const posts = await prisma.post.findMany({
    where: { status: 'PUBLISHED' },
    orderBy: { createdAt: 'desc' },
    select: { id: true, title: true, slug: true, createdAt: true }
  });

  return (
    <>
      <h1>Latest entries</h1>
      <TimelineList posts={posts} />
    </>
  );
}
