import { NextResponse } from 'next/server';
import { promises as fs } from 'node:fs';
import { join, extname } from 'node:path';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireAuthUser } from '@/lib/auth';

const fontSchema = z.object({
  family: z.string().min(2).max(80),
  style: z.string().min(3).max(32),
  weightMin: z.coerce.number().int().min(100).max(1000),
  weightMax: z.coerce.number().int().min(100).max(1000),
  display: z.string().min(3).max(32)
}).refine((data) => data.weightMin <= data.weightMax, {
  message: 'weightMin must be less than or equal to weightMax',
  path: ['weightMin']
});

function sanitizeFont(font) {
  return {
    id: font.id,
    family: font.family,
    style: font.style,
    weightMin: font.weightMin,
    weightMax: font.weightMax,
    srcUrl: font.srcUrl,
    display: font.display,
    ownerId: font.ownerId,
    createdAt: font.createdAt,
    updatedAt: font.updatedAt
  };
}

export async function POST(request) {
  let user;
  try {
    user = await requireAuthUser();
  } catch (error) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const formData = await request.formData();
  const file = formData.get('file');
  if (!file || typeof file === 'string') {
    return NextResponse.json({ error: 'Font file is required' }, { status: 400 });
  }

  const metadata = fontSchema.safeParse({
    family: formData.get('family'),
    style: formData.get('style'),
    weightMin: formData.get('weightMin'),
    weightMax: formData.get('weightMax'),
    display: formData.get('display') ?? 'swap'
  });

  if (!metadata.success) {
    return NextResponse.json({ error: 'Invalid metadata', details: metadata.error.flatten() }, { status: 400 });
  }

  const extension = extname(file.name ?? '').toLowerCase();
  if (extension !== '.woff2') {
    return NextResponse.json({ error: 'Only .woff2 files are supported' }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const fontsDir = join(process.cwd(), 'public', 'fonts');
  await fs.mkdir(fontsDir, { recursive: true });
  const fileName = `${randomUUID()}.woff2`;
  await fs.writeFile(join(fontsDir, fileName), buffer);

  const srcUrl = `/fonts/${fileName}`;

  const font = await prisma.fontFace.create({
    data: {
      ownerId: user.id,
      family: metadata.data.family,
      style: metadata.data.style,
      weightMin: metadata.data.weightMin,
      weightMax: metadata.data.weightMax,
      display: metadata.data.display,
      srcUrl
    }
  });

  return NextResponse.json({ font: sanitizeFont(font) }, { status: 201 });
}
