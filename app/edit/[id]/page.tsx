import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import Editor from '@/components/Editor';

export default async function EditPage({ params }: { params: { id: string } }) {
  const post = await prisma.post.findUnique({ where: { id: params.id } });
  if (!post) {
    notFound();
  }

  return (
    <main>
      <Editor initial={post} />
    </main>
  );
}
