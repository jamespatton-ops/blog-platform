import { z } from 'zod';

export const TokensSchema = z.object({
  font: z.object({
    sans: z.string(),
    serif: z.string(),
    mono: z.string(),
    body: z.enum(['sans', 'serif', 'mono']),
    headings: z.enum(['sans', 'serif', 'mono']),
    code: z.enum(['sans', 'serif', 'mono']),
    opticalSizing: z.boolean().default(true),
    liga: z.boolean().default(true)
  }),
  type: z.object({
    basePx: z.number().min(14).max(22),
    leading: z.number().min(1.3).max(1.8),
    maxCh: z.number().min(60).max(90),
    hScale: z.number().min(1.1).max(1.35),
    paraSpace: z.number().min(0).max(1.2)
  }),
  colors: z.object({
    light: z.object({ bg: z.string(), text: z.string(), muted: z.string(), accent: z.string() }),
    dark: z.object({ bg: z.string(), text: z.string(), muted: z.string(), accent: z.string() }),
    hc: z.object({ bg: z.string(), text: z.string(), muted: z.string(), accent: z.string() })
  }),
  links: z.object({
    underline: z.boolean(),
    offset: z.number().min(0).max(8),
    thickness: z.number().min(1).max(3)
  }),
  rules: z.object({
    hyphens: z.enum(['none', 'manual', 'auto']).default('auto'),
    orphans: z.number().min(1).max(3).default(2),
    widows: z.number().min(1).max(3).default(2)
  })
});

export type Tokens = z.infer<typeof TokensSchema>;
