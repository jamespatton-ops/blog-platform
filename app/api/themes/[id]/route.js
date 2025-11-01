import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireAuthUser } from '@/lib/auth';
import { ThemeTokensSchema, coerceTokens, mergeTokens } from '@/lib/tokens';

const themeUpdateSchema = z.object({
  name: z.string().min(2).max(64).optional(),
  tokens: ThemeTokensSchema.deepPartial().optional(),
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

export async function GET(_request, { params }) {
  let user;
  try {
    user = await requireAuthUser();
  } catch (error) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const theme = await prisma.theme.findUnique({ where: { id: params.id } });
  if (!theme || theme.ownerId !== user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  return NextResponse.json({ theme: sanitizeTheme(theme) });
}

export async function PATCH(request, { params }) {
  let user;
  try {
    user = await requireAuthUser();
  } catch (error) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const theme = await prisma.theme.findUnique({ where: { id: params.id } });
  if (!theme || theme.ownerId !== user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const body = await request.json().catch(() => ({}));
  const parsed = themeUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid payload', details: parsed.error.flatten() }, { status: 400 });
  }

  const { name, tokens, isDefault } = parsed.data;
  const data = {};
  if (name !== undefined) {
    data.name = name;
  }
  if (tokens !== undefined) {
    data.tokens = mergeTokens(coerceTokens(theme.tokens), tokens);
  }
  if (isDefault !== undefined) {
    data.isDefault = isDefault;
  }

  try {
    const updated = await prisma.theme.update({ where: { id: params.id }, data });
    if (updated.isDefault) {
      await ensureSingleDefault(user.id, updated.id);
    }
    return NextResponse.json({ theme: sanitizeTheme(updated) });
  } catch (error) {
    if (error?.code === 'P2002') {
      return NextResponse.json({ error: 'Theme name already exists' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Unable to update theme' }, { status: 500 });
  }
}

export async function DELETE(_request, { params }) {
  let user;
  try {
    user = await requireAuthUser();
  } catch (error) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const theme = await prisma.theme.findUnique({ where: { id: params.id } });
  if (!theme || theme.ownerId !== user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  await prisma.post.updateMany({
    where: { authorId: user.id, themeId: theme.id },
    data: { themeId: null }
  });

  await prisma.theme.delete({ where: { id: params.id } });

  if (theme.isDefault) {
    const fallback = await prisma.theme.findFirst({
      where: { ownerId: user.id },
      orderBy: { createdAt: 'asc' }
    });
    if (fallback) {
      await prisma.theme.update({ where: { id: fallback.id }, data: { isDefault: true } });
      await ensureSingleDefault(user.id, fallback.id);
    }
  }

  return NextResponse.json({ ok: true });
}
