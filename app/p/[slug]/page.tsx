import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import { mdToHtml } from '@/lib/markdown';
import Prose from '@/components/Prose';
import { auth } from '@/lib/auth';
import { coerceTokens, tokensToCssVars } from '@/lib/theme';

interface PageProps {
  params: { slug: string };
  searchParams?: { draft?: string };
}

export default async function Page({ params, searchParams }: PageProps) {
  const post = await prisma.post.findUnique({
    where: { slug: params.slug },
    include: { theme: { select: { tokens: true } } }
  });

  if (!post) {
    notFound();
  }

  if (post.status !== 'PUBLISHED') {
    if (searchParams?.draft !== '1') {
      notFound();
    }
    const session = await auth();
    if (!session?.user?.id) {
      notFound();
    }
  }

  const html = await mdToHtml(post.content_md);
  const overrideTokens = post.theme ? coerceTokens(post.theme.tokens) : null;
  const style = overrideTokens ? tokensToCssVars(overrideTokens) : undefined;

  return (
    <main style={style}>
      <h1 style={{ fontWeight: 600, fontSize: '1.5rem', marginBottom: '2rem' }}>{post.title}</h1>
      <Prose html={html} />
    </main>
  );
}
