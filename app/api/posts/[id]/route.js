import { z } from 'zod';
import { safeDb } from '@/lib/db';
import { slugify } from '@/lib/slugify';

const UpdateSchema = z.object({
  title: z.string().optional(),
  content_md: z.string().optional(),
  published: z.boolean().optional(),
  themeId: z.string().nullable().optional()
});

export async function PATCH(request, { params }) {
  const db = await safeDb();
  if (!db.available) {
    return Response.json({ error: 'Database unavailable' }, { status: 503 });
  }

  const json = await request.json().catch(() => null);
  const parsed = UpdateSchema.safeParse(json);
  if (!parsed.success) {
    return Response.json({ error: 'Invalid payload' }, { status: 400 });
  }

  const updates = {};
  if (typeof parsed.data.content_md === 'string') {
    updates.content_md = parsed.data.content_md;
  }

  if (typeof parsed.data.published === 'boolean') {
    updates.status = parsed.data.published ? 'PUBLISHED' : 'DRAFT';
  }

  if ('themeId' in parsed.data) {
    updates.themeId = parsed.data.themeId ?? null;
  }

  if (typeof parsed.data.title === 'string' && parsed.data.title.trim().length > 0) {
    const title = parsed.data.title.trim();
    updates.title = title;
    const baseSlug = slugify(title).slice(0, 80) || `untitled-${Date.now()}`;
    let slug = baseSlug;
    let attempt = 1;
    while (true) {
      const existing = await db.client.getPostBySlug(slug);
      if (!existing || existing.id === params.id) {
        break;
      }
      slug = `${baseSlug}-${attempt++}`;
    }
    updates.slug = slug;
  }

  const post = await db.client.updatePost(params.id, updates);
  if (!post) {
    return Response.json({ error: 'Post not found' }, { status: 404 });
  }

  return Response.json(post);
}
