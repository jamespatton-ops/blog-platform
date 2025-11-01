import { z } from 'zod';
import { safeDb } from '@/lib/db';
import { OWNER_ID } from '@/lib/constants';
import { slugify } from '@/lib/slugify';

const CreateSchema = z.object({
  title: z.string().optional(),
  content_md: z.string().optional(),
  published: z.boolean().optional()
});

export async function GET() {
  const db = await safeDb();
  if (!db.available) {
    return Response.json({ posts: [] });
  }

  const posts = await db.client.listAllPosts();
  return Response.json({ posts });
}

export async function POST(request) {
  const db = await safeDb();
  if (!db.available) {
    return Response.json({ error: 'Database unavailable' }, { status: 503 });
  }

  const json = await request.json().catch(() => null);
  const parsed = CreateSchema.safeParse(json);
  if (!parsed.success) {
    return Response.json({ error: 'Invalid payload' }, { status: 400 });
  }

  const title = parsed.data.title?.trim() || 'Untitled';
  const content = parsed.data.content_md ?? '';
  const baseSlug = slugify(title).slice(0, 80) || `untitled-${Date.now()}`;
  let slug = baseSlug;
  let attempt = 1;
  while ((await db.client.getPostBySlug(slug)) !== null) {
    slug = `${baseSlug}-${attempt++}`;
  }

  const post = await db.client.createPost({
    authorId: OWNER_ID,
    title,
    slug,
    content_md: content,
    status: parsed.data.published ? 'PUBLISHED' : 'DRAFT',
    themeId: null
  });

  return Response.json(post);
}
