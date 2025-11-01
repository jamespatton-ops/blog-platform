import { safeDb } from '@/lib/db';
import Editor from '@/components/Editor';

export default async function WritePage() {
  const db = await safeDb();
  if (!db.available) {
    return (
      <main>
        <p style={{ marginTop: '2rem', opacity: 0.7 }}>
          Database not initialized. Run <code>npm run migrate</code> and <code>npm run seed</code> before writing.
        </p>
      </main>
    );
  }

  return (
    <main>
      <Editor />
    </main>
  );
}
