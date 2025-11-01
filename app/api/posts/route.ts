import { prisma } from '@/lib/db';
import { auth } from '@/lib/auth';
import { generateUniqueSlug } from '@/lib/slug';
import { z } from 'zod';

const PostCreateSchema = z.object({
  title: z.string().max(160).optional(),
  content_md: z.string().optional(),
  published: z.boolean().optional(),
  themeId: z.string().optional()
});

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return new Response('Unauthorized', { status: 401 });
  }

  const posts = await prisma.post.findMany({
    where: { authorId: session.user.id },
    orderBy: { updatedAt: 'desc' },
    include: {
      theme: { select: { id: true, name: true } }
    }
  });

  return Response.json(posts);
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return new Response('Unauthorized', { status: 401 });
  }

  const json = await request.json();
  const payload = PostCreateSchema.safeParse(json);

  if (!payload.success) {
    return new Response('Invalid post payload', { status: 422 });
  }

  let themeId: string | undefined;
  if (payload.data.themeId) {
    const theme = await prisma.theme.findFirst({
      where: { id: payload.data.themeId, ownerId: session.user.id }
    });
    if (!theme) {
      return new Response('Invalid theme', { status: 422 });
    }
    themeId = theme.id;
  }

  const title = payload.data.title?.trim() || 'Untitled';
  const slug = await generateUniqueSlug(title);
  const status = payload.data.published ? 'PUBLISHED' : 'DRAFT';
  const post = await prisma.post.create({
    data: {
      title,
      slug,
      content_md: payload.data.content_md ?? '',
      status,
      authorId: session.user.id,
      themeId
    }
  });

  return Response.json(post);
}
