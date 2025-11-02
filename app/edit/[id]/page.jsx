import { notFound } from 'next/navigation';
import { ensureBootstrapped } from '@/lib/bootstrap';
import { safeDb } from '@/lib/db';
import Editor from '@/components/Editor';

export default async function EditPage({ params }) {
  await ensureBootstrapped();
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
