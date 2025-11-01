import { z } from 'zod';

const colorSchema = z.object({
  bg: z.string().min(1),
  text: z.string().min(1),
  muted: z.string().min(1),
  accent: z.string().min(1)
});

export const ThemeTokensSchema = z.object({
  fonts: z.object({
    sans: z.string().min(1),
    serif: z.string().min(1),
    mono: z.string().min(1),
    body: z.string().min(1),
    headings: z.string().min(1),
    code: z.string().min(1),
    opticalSizing: z.boolean(),
    liga: z.boolean()
  }),
  type: z.object({
    basePx: z.number().min(14).max(22),
    leading: z.number().min(1.3).max(1.8),
    maxCh: z.number().min(60).max(90),
    hScale: z.number().min(1.1).max(1.35),
    paraSpace: z.number().min(0).max(1.2)
  }),
  colors: z.object({
    light: colorSchema,
    dark: colorSchema,
    hc: colorSchema
  }),
  links: z.object({
    underline: z.boolean(),
    offset: z.number().min(0).max(16),
    thickness: z.number().min(1).max(6)
  }),
  rules: z.object({
    hyphens: z.enum(['none', 'manual', 'auto']),
    orphans: z.number().int().min(1).max(3),
    widows: z.number().int().min(1).max(3)
  })
});

export const DEFAULT_TOKENS = {
  fonts: {
    sans: "'Inter', 'Segoe UI', system-ui, -apple-system, sans-serif",
    serif: "'Source Serif 4', 'Iowan Old Style', serif",
    mono: "'JetBrains Mono', 'SFMono-Regular', 'Consolas', monospace",
    body: "'Inter', 'Segoe UI', system-ui, -apple-system, sans-serif",
    headings: "'Source Serif 4', 'Iowan Old Style', serif",
    code: "'JetBrains Mono', 'SFMono-Regular', 'Consolas', monospace",
    opticalSizing: true,
    liga: true
  },
  type: {
    basePx: 18,
    leading: 1.5,
    maxCh: 72,
    hScale: 1.2,
    paraSpace: 0.6
  },
  colors: {
    light: {
      bg: '#fbfbfb',
      text: '#111111',
      muted: '#5a5a5a',
      accent: '#1f6feb'
    },
    dark: {
      bg: '#0f1115',
      text: '#f4f4f4',
      muted: '#a0a0a0',
      accent: '#4ea1ff'
    },
    hc: {
      bg: '#000000',
      text: '#ffffff',
      muted: '#d6d6d6',
      accent: '#ffd500'
    }
  },
  links: {
    underline: true,
    offset: 3,
    thickness: 1
  },
  rules: {
    hyphens: 'manual',
    orphans: 2,
    widows: 2
  }
};

const PartialTokensSchema = ThemeTokensSchema.deepPartial();

export function mergeTokens(base, partial) {
  const baseObject = typeof base === 'object' && base !== null ? base : {};
  const output = { ...baseObject };
  for (const key of Object.keys(partial ?? {})) {
    const value = partial[key];
    if (value === undefined || value === null) {
      continue;
    }
    if (typeof value === 'object' && !Array.isArray(value)) {
      output[key] = mergeTokens(baseObject[key], value);
    } else {
      output[key] = value;
    }
  }
  return output;
}

export function coerceTokens(input) {
  const parsed = PartialTokensSchema.safeParse(input);
  if (!parsed.success) {
    return DEFAULT_TOKENS;
  }
  return mergeTokens(DEFAULT_TOKENS, parsed.data);
}

export function stringifyTokens(tokens) {
  return JSON.stringify(tokens, null, 2);
}
