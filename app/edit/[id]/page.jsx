import { notFound } from 'next/navigation';
import { safeDb } from '@/lib/db';
import Editor from '@/components/Editor';

export default async function EditPage({ params }) {
  const db = await safeDb();
  if (!db.available) {
    notFound();
  }

  const post = await db.client.getPostById(params.id);
  if (!post) {
    notFound();
  }

  return (
    <main>
      <Editor initial={post} />
    </main>
  );
}
