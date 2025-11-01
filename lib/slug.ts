import slugify from '@sindresorhus/slugify';
import { prisma } from './db';

const MAX_SLUG_LENGTH = 80;

function buildSlug(base: string, attempt: number) {
  const suffix = attempt === 0 ? '' : `-${attempt}`;
  const limit = MAX_SLUG_LENGTH - suffix.length;
  const trimmed = base.slice(0, Math.max(1, limit));
  const sanitized = trimmed.replace(/-+/g, '-').replace(/^-|-$/g, '');
  return `${sanitized}${suffix}` || `untitled${suffix ? `-${attempt}` : ''}`;
}

export async function generateUniqueSlug(title: string, excludeId?: string): Promise<string> {
  const base = slugify(title, { decamelize: false, lowercase: true }) || 'untitled';
  let attempt = 0;

  while (attempt < 1000) {
    const candidate = buildSlug(base, attempt);
    const existing = await prisma.post.findUnique({ where: { slug: candidate } });
    if (!existing || existing.id === excludeId) {
      return candidate;
    }
    attempt += 1;
  }

  throw new Error('Unable to generate unique slug');
}
