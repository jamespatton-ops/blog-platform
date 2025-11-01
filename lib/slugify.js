import slugifyLib from '@sindresorhus/slugify';

export function slugify(input) {
  return slugifyLib(input, { decamelize: false, lowercase: true });
}
