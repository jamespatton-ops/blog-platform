import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireAuthUser } from '@/lib/auth';
import { slugify } from '@/lib/slugify';

const postCreateSchema = z.object({
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

function createDraftSlug() {
  return `draft-${crypto.randomUUID()}`;
}

async function resolveTheme(ownerId, themeId) {
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

async function ensureUniqueSlug(base, excludeId) {
  let candidate = slugify(base || 'entry');
  if (!candidate) {
    candidate = 'entry';
  }
  let suffix = 0;
  while (true) {
    const slug = suffix === 0 ? candidate : `${candidate}-${suffix}`;
    const existing = await prisma.post.findUnique({ where: { slug } });
    if (!existing || existing.id === excludeId) {
      return slug;
    }
    suffix += 1;
  }
}

export async function GET() {
  const posts = await prisma.post.findMany({
    where: { status: 'PUBLISHED' },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      title: true,
      slug: true,
      createdAt: true,
      updatedAt: true,
      themeId: true
    }
  });
  return NextResponse.json({ posts });
}

export async function POST(request) {
  let user;
  try {
    user = await requireAuthUser();
  } catch (error) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const json = await request.json().catch(() => ({}));
  const parsed = postCreateSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid payload', details: parsed.error.flatten() }, { status: 400 });
  }

  const { title, content_md, themeId, status } = parsed.data;
  try {
    const post = await prisma.post.create({
      data: {
        authorId: user.id,
        title: title?.trim() || 'Untitled',
        slug: createDraftSlug(),
        content_md: content_md ?? '',
        status: status ?? 'DRAFT',
        themeId: await resolveTheme(user.id, themeId ?? null)
      }
    });

    if (post.status === 'PUBLISHED') {
      const slug = await ensureUniqueSlug(post.title, post.id);
      const published = await prisma.post.update({
        where: { id: post.id },
        data: { slug }
      });
      return NextResponse.json({ post: sanitizePost(published) }, { status: 201 });
    }

    return NextResponse.json({ post: sanitizePost(post) }, { status: 201 });
  } catch (error) {
    if (error?.code === 'INVALID_THEME') {
      return NextResponse.json({ error: 'Invalid theme selection' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Unable to create post' }, { status: 500 });
  }
}
