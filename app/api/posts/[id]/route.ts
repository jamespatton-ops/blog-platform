import slugify from '@sindresorhus/slugify';
import { prisma } from '@/lib/db';
import { auth } from '@/lib/auth';

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) {
    return new Response('Unauthorized', { status: 401 });
  }

  const body = await req.json();
  const data: Record<string, unknown> = {};

  if (typeof body.title === 'string') {
    data.title = body.title;
    const slug = slugify(body.title).slice(0, 80);
    if (slug) {
      const existingSlug = await prisma.post.findUnique({ where: { slug } });
      data.slug = existingSlug && existingSlug.id !== params.id ? `${slug}-${Date.now()}` : slug;
    }
  }

  if (typeof body.content_md === 'string') {
    data.content_md = body.content_md;
  }

  if (body.status === 'PUBLISHED' || body.status === 'DRAFT') {
    data.status = body.status;
  }

  const existing = await prisma.post.findUnique({
    where: { id: params.id }
  });

  if (!existing || existing.authorId !== session.user.id) {
    return new Response('Not found', { status: 404 });
  }

  const post = await prisma.post.update({
    where: { id: params.id },
    data
  });

  return Response.json(post);
}
