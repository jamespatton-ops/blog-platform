import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import { mdToHtml } from '@/lib/markdown';
import Prose from '@/components/Prose';

interface Params {
  params: { slug: string };
  searchParams?: { draft?: string };
}

export default async function Page({ params, searchParams }: Params) {
  const post = await prisma.post.findUnique({ where: { slug: params.slug } });
  if (!post) {
    notFound();
  }

  if (post.status !== 'PUBLISHED' && searchParams?.draft !== '1') {
    notFound();
  }

  const html = await mdToHtml(post.content_md);

  return (
    <main>
      <h1 style={{ fontWeight: 600, fontSize: '1.5rem', marginBottom: '2rem' }}>{post.title}</h1>
      <Prose html={html} />
    </main>
  );
}
