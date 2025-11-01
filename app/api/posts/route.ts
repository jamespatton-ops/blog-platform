import slugify from '@sindresorhus/slugify';
import { prisma } from '@/lib/db';
import { auth } from '@/lib/auth';

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return new Response('Unauthorized', { status: 401 });
  }

  const { title = 'Untitled', content_md = '' } = await req.json();
  const baseSlug = slugify(title).slice(0, 80);
  let slug = baseSlug || `untitled-${Date.now()}`;

  const existing = await prisma.post.findUnique({ where: { slug } });
  if (existing) {
    slug = `${slug}-${Date.now()}`;
  }

  const post = await prisma.post.create({
    data: {
      title,
      slug,
      content_md,
      status: 'DRAFT',
      authorId: session.user.id
    }
  });

  return Response.json(post);
}
