import { z } from 'zod';
import { safeDb } from '@/lib/db';
import { attachSession } from '@/lib/auth';

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
});

export async function POST(request) {
  const json = await request.json().catch(() => null);
  const parsed = LoginSchema.safeParse(json);
  if (!parsed.success) {
    return Response.json({ error: 'Invalid payload' }, { status: 400 });
  }

  const db = await safeDb();
  if (!db.available) {
    return Response.json({ error: 'Database unavailable' }, { status: 503 });
  }

  const user = await db.client.verifyPassword(parsed.data.email, parsed.data.password);
  if (!user) {
    return Response.json({ error: 'Invalid credentials' }, { status: 401 });
  }

  const response = Response.json({ ok: true, user: { id: user.id, email: user.email } });
  return await attachSession(response, user.id);
}
