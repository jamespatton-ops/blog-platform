import { notFound, redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { getAuthSession } from '@/lib/auth';
import { EditorShell } from '@/components/EditorShell';

export default async function EditPage({ params }) {
  const session = await getAuthSession();
  if (!session?.user?.id) {
    redirect('/login');
  }

  const [post, themes] = await Promise.all([
    prisma.post.findUnique({ where: { id: params.id } }),
    prisma.theme.findMany({
      where: { ownerId: session.user.id },
      orderBy: { name: 'asc' },
      select: { id: true, name: true }
    })
  ]);

  if (!post || post.authorId !== session.user.id) {
    notFound();
  }

  return (
    <>
      <h1>Edit entry</h1>
      <EditorShell
        initialPost={{
          id: post.id,
          title: post.title,
          slug: post.slug,
          status: post.status,
          themeId: post.themeId ?? '',
          content_md: post.content_md
        }}
        themes={themes}
      />
    </>
  );
}
