import { prisma } from '@/lib/db';
import { auth } from '@/lib/auth';
import { tryNormalizeTokens } from '@/lib/tokens';
import { z } from 'zod';

const ThemePayload = z.object({
  id: z.string().optional(),
  name: z.string().min(1).max(100),
  tokens: z.unknown(),
  isDefault: z.boolean().optional()
});

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return new Response('Unauthorized', { status: 401 });
  }

  const themes = await prisma.theme.findMany({
    where: { ownerId: session.user.id },
    orderBy: { createdAt: 'asc' },
    select: {
      id: true,
      name: true,
      tokens: true,
      isDefault: true,
      createdAt: true,
      updatedAt: true
    }
  });

  return Response.json(themes);
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return new Response('Unauthorized', { status: 401 });
  }

  const json = await request.json();
  const payload = ThemePayload.safeParse(json);

  if (!payload.success) {
    return new Response('Invalid theme payload', { status: 422 });
  }

  const { tokens, valid } = tryNormalizeTokens(payload.data.tokens);
  if (!valid) {
    return new Response('Invalid theme tokens', { status: 422 });
  }

  const isDefault = payload.data.isDefault ?? false;
  let theme;

  if (payload.data.id) {
    const existing = await prisma.theme.findFirst({
      where: { id: payload.data.id, ownerId: session.user.id }
    });

    if (!existing) {
      return new Response('Theme not found', { status: 404 });
    }

    theme = await prisma.theme.update({
      where: { id: existing.id },
      data: {
        name: payload.data.name,
        tokens,
        isDefault: isDefault || existing.isDefault,
        ownerId: session.user.id
      }
    });
  } else {
    theme = await prisma.theme.create({
      data: {
        ownerId: session.user.id,
        name: payload.data.name,
        tokens,
        isDefault
      }
    });
  }

  if (theme.isDefault) {
    await prisma.theme.updateMany({
      where: { ownerId: session.user.id, id: { not: theme.id } },
      data: { isDefault: false }
    });
  }

  return Response.json(theme);
}
