import { prisma } from '@/lib/db';
import type { Prisma } from '@prisma/client';
import { auth } from '@/lib/auth';
import { generateUniqueSlug } from '@/lib/slug';
import { z } from 'zod';

const PostUpdateSchema = z.object({
  title: z.string().max(160).optional(),
  content_md: z.string().optional(),
  published: z.boolean().optional(),
  themeId: z.string().nullable().optional()
});

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) {
    return new Response('Unauthorized', { status: 401 });
  }

  const post = await prisma.post.findFirst({
    where: { id: params.id, authorId: session.user.id }
  });

  if (!post) {
    return new Response('Not found', { status: 404 });
  }

  const json = await request.json();
  const payload = PostUpdateSchema.safeParse(json);

  if (!payload.success) {
    return new Response('Invalid post payload', { status: 422 });
  }

  const data: Prisma.PostUpdateInput = {};

  if (typeof payload.data.title === 'string') {
    const title = payload.data.title.trim();
    if (title.length > 0) {
      data.title = title;
      data.slug = await generateUniqueSlug(title, post.id);
    }
  }

  if (typeof payload.data.content_md === 'string') {
    data.content_md = payload.data.content_md;
  }

  if (payload.data.published !== undefined) {
    data.status = payload.data.published ? 'PUBLISHED' : 'DRAFT';
  }

  if (payload.data.themeId !== undefined) {
    if (!payload.data.themeId) {
      data.themeId = null;
    } else {
      const theme = await prisma.theme.findFirst({
        where: { id: payload.data.themeId, ownerId: session.user.id }
      });
      if (!theme) {
        return new Response('Invalid theme', { status: 422 });
      }
      data.themeId = theme.id;
    }
  }

  const updated = await prisma.post.update({
    where: { id: post.id },
    data
  });

  return Response.json(updated);
}
