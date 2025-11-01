import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireAuthUser } from '@/lib/auth';
import { slugify } from '@/lib/slugify';

const postUpdateSchema = z.object({
  title: z.string().max(200).optional(),
  content_md: z.string().optional(),
  themeId: z.string().nullable().optional(),
  status: z.enum(['DRAFT', 'PUBLISHED']).optional()
});

function sanitizePost(post) {
  return {
    id: post.id,
    title: post.title,
    slug: post.slug,
    content_md: post.content_md,
    status: post.status,
    themeId: post.themeId,
    createdAt: post.createdAt,
    updatedAt: post.updatedAt
  };
}

async function resolveTheme(ownerId, themeId) {
  if (themeId === undefined) {
    return undefined;
  }
  if (!themeId) {
    return null;
  }
  const theme = await prisma.theme.findUnique({ where: { id: themeId } });
  if (!theme || theme.ownerId !== ownerId) {
    const error = new Error('INVALID_THEME');
    error.code = 'INVALID_THEME';
    throw error;
  }
  return theme.id;
}

async function ensurePublishedSlug(post) {
  if (post.status !== 'PUBLISHED') {
    return post;
  }
  const needsSlug = !post.slug || post.slug.startsWith('draft-');
  if (!needsSlug) {
    return post;
  }
  let candidate = slugify(post.title || 'entry');
  if (!candidate) {
    candidate = 'entry';
  }
  let suffix = 0;
  while (true) {
    const slug = suffix === 0 ? candidate : `${candidate}-${suffix}`;
    const existing = await prisma.post.findUnique({ where: { slug } });
    if (!existing || existing.id === post.id) {
      return prisma.post.update({ where: { id: post.id }, data: { slug } });
    }
    suffix += 1;
  }
}

export async function GET(_request, { params }) {
  let user;
  try {
    user = await requireAuthUser();
  } catch (error) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const post = await prisma.post.findUnique({ where: { id: params.id } });
  if (!post || post.authorId !== user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  return NextResponse.json({ post: sanitizePost(post) });
}

export async function PATCH(request, { params }) {
  let user;
  try {
    user = await requireAuthUser();
  } catch (error) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const post = await prisma.post.findUnique({ where: { id: params.id } });
  if (!post || post.authorId !== user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const body = await request.json().catch(() => ({}));
  const parsed = postUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid payload', details: parsed.error.flatten() }, { status: 400 });
  }

  const payload = parsed.data;
  const data = {};
  if (payload.title !== undefined) {
    data.title = payload.title.trim() || 'Untitled';
  }
  if (payload.content_md !== undefined) {
    data.content_md = payload.content_md;
  }
  if (payload.status !== undefined) {
    data.status = payload.status;
  }
  if (payload.themeId !== undefined) {
    data.themeId = await resolveTheme(user.id, payload.themeId);
  }

  try {
    const updated = await prisma.post.update({
      where: { id: params.id },
      data
    });
    const maybeSlugged = await ensurePublishedSlug(updated);
    return NextResponse.json({ post: sanitizePost(maybeSlugged) });
  } catch (error) {
    if (error?.code === 'INVALID_THEME') {
      return NextResponse.json({ error: 'Invalid theme selection' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Unable to update post' }, { status: 500 });
  }
}

export async function DELETE(_request, { params }) {
  let user;
  try {
    user = await requireAuthUser();
  } catch (error) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const post = await prisma.post.findUnique({ where: { id: params.id } });
  if (!post || post.authorId !== user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  await prisma.post.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
