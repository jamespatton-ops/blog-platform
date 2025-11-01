import { prisma } from '@/lib/prisma';

const ENV_VARS = ['NEXTAUTH_SECRET', 'DATABASE_URL', 'OWNER_EMAIL', 'OWNER_PASSWORD', 'OWNER_ID'];

export async function GET() {
  let dbStatus = 'connected';
  let ok = true;
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch (error) {
    ok = false;
    dbStatus = error.message ?? 'unavailable';
  }

  const env = ENV_VARS.reduce((acc, key) => {
    acc[key] = Boolean(process.env[key]);
    return acc;
  }, {});

  return Response.json({
    ok,
    db: dbStatus,
    env
  });
}
