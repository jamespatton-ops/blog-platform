import { z } from 'zod';
import { ensureBootstrapped } from '@/lib/bootstrap';
import { safeDb } from '@/lib/db';
import { OWNER_ID } from '@/lib/constants';
import { DEFAULT_TOKENS, normalizeTokens } from '@/lib/tokens';

const ThemePayload = z.object({
  id: z.string().optional(),
  name: z.string().min(1),
  tokens: z.unknown(),
  isDefault: z.boolean().optional()
});

export async function GET() {
  await ensureBootstrapped();
  const db = await safeDb();
  if (!db.available) {
    return Response.json({ theme: { name: 'Default', tokens: DEFAULT_TOKENS } });
  }
  const theme = await db.client.getDefaultTheme();
  return Response.json({ theme: theme ?? { name: 'Default', tokens: DEFAULT_TOKENS } });
}

export async function POST(request) {
  await ensureBootstrapped();
  const db = await safeDb();
  if (!db.available) {
    return Response.json({ error: 'Database unavailable' }, { status: 503 });
  }

  const json = await request.json().catch(() => null);
  const parsed = ThemePayload.safeParse(json);
  if (!parsed.success) {
    return Response.json({ error: 'Invalid payload' }, { status: 400 });
  }

  const tokens = normalizeTokens(parsed.data.tokens);
  const theme = await db.client.upsertTheme({
    id: parsed.data.id,
    name: parsed.data.name,
    tokens,
    isDefault: parsed.data.isDefault ?? false,
    ownerId: OWNER_ID
  });

  return Response.json({ theme });
}
