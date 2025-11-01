import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireAuthUser } from '@/lib/auth';
import { ThemeTokensSchema, coerceTokens } from '@/lib/tokens';

const themeCreateSchema = z.object({
  name: z.string().min(2).max(64),
  tokens: ThemeTokensSchema,
  isDefault: z.boolean().optional()
});

function sanitizeTheme(theme) {
  return {
    id: theme.id,
    name: theme.name,
    tokens: coerceTokens(theme.tokens),
    isDefault: theme.isDefault,
    ownerId: theme.ownerId,
    createdAt: theme.createdAt,
    updatedAt: theme.updatedAt
  };
}

async function ensureSingleDefault(ownerId, defaultId) {
  await prisma.theme.updateMany({
    where: { ownerId, id: { not: defaultId } },
    data: { isDefault: false }
  });
}

export async function GET() {
  let user;
  try {
    user = await requireAuthUser();
  } catch (error) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const themes = await prisma.theme.findMany({
    where: { ownerId: user.id },
    orderBy: { name: 'asc' }
  });
  return NextResponse.json({ themes: themes.map(sanitizeTheme) });
}

export async function POST(request) {
  let user;
  try {
    user = await requireAuthUser();
  } catch (error) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const body = await request.json().catch(() => ({}));
  const parsed = themeCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid payload', details: parsed.error.flatten() }, { status: 400 });
  }

  const { name, tokens, isDefault } = parsed.data;

  try {
    const created = await prisma.theme.create({
      data: {
        ownerId: user.id,
        name,
        tokens,
        isDefault: Boolean(isDefault)
      }
    });
    if (created.isDefault) {
      await ensureSingleDefault(user.id, created.id);
    }
    return NextResponse.json({ theme: sanitizeTheme(created) }, { status: 201 });
  } catch (error) {
    if (error?.code === 'P2002') {
      return NextResponse.json({ error: 'Theme name already exists' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Unable to create theme' }, { status: 500 });
  }
}
