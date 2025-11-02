import { ensureBootstrapped } from '@/lib/bootstrap';
import { safeDb } from '@/lib/db';

const ENV_VARS = ['SESSION_SECRET', 'LIBSQL_URL', 'LIBSQL_AUTH_TOKEN', 'OWNER_EMAIL', 'OWNER_PASSWORD', 'OWNER_ID'];

export async function GET() {
  await ensureBootstrapped();
  const db = await safeDb();
  const env = ENV_VARS.reduce((acc, key) => {
    acc[key] = Boolean(process.env[key]);
    return acc;
  }, {});

  return Response.json({
    ok: db.available,
    db: db.available ? 'connected' : db.reason,
    env
  });
}
