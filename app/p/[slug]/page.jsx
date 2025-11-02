import { notFound } from 'next/navigation';
import { ensureBootstrapped } from '@/lib/bootstrap';
import { safeDb } from '@/lib/db';
import { mdToHtml } from '@/lib/markdown';
import { coerceTokens, tokensToCssVars } from '@/lib/theme';
import { DEFAULT_TOKENS } from '@/lib/tokens';
import Prose from '@/components/Prose';

export default async function PostPage({ params }) {
  await ensureBootstrapped();
  const db = await safeDb();
  if (!db.available) {
    return (
      <main>
        <p style={{ marginTop: '2rem', opacity: 0.7 }}>
          Database not initialized. Run <code>npm run migrate</code> and <code>npm run seed</code> to publish posts.
        </p>
      </main>
    );
  }

  const post = await db.client.getPostBySlug(params.slug);
  if (!post || post.status !== 'PUBLISHED') {
    notFound();
  }

  const html = await mdToHtml(post.content_md);
  const overrideTheme = post.themeId ? await db.client.getThemeById(post.themeId) : null;
  const themeVars = overrideTheme
    ? tokensToCssVars(coerceTokens(overrideTheme.tokens ?? DEFAULT_TOKENS))
    : undefined;

  return (
    <main style={themeVars}>
      <h1 style={{ fontWeight: 600 }}>{post.title}</h1>
      <Prose html={html} />
    </main>
  );
}
