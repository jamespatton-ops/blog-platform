import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { mdToHtml } from '@/lib/markdown';
import { tokensToCssVars } from '@/lib/theme';
import { coerceTokens } from '@/lib/tokens';

export const revalidate = 60;

export default async function PostPage({ params }) {
  const post = await prisma.post.findUnique({
    where: { slug: params.slug },
    include: { theme: true }
  });

  if (!post || post.status !== 'PUBLISHED') {
    notFound();
  }

  const html = await mdToHtml(post.content_md);
  const overrideVars = post.theme ? tokensToCssVars(coerceTokens(post.theme.tokens)) : null;
  const created = new Date(post.createdAt);

  return (
    <div style={overrideVars ? { ...overrideVars, backgroundColor: 'var(--bg)', color: 'var(--text)' } : undefined}>
      <article className="prose">
        <header style={{ marginBottom: '2.5rem' }}>
          <h1 style={{ marginTop: 0 }}>{post.title}</h1>
          <time dateTime={created.toISOString()} className="status-indicator">
            {created.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}
          </time>
        </header>
        <div dangerouslySetInnerHTML={{ __html: html }} />
      </article>
    </div>
  );
}
