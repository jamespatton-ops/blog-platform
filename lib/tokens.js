import { z } from 'zod';

export const ThemeTokensSchema = z.object({
  fontFamily: z.string().min(1),
  maxWidthCh: z.number().int().min(48).max(120),
  baseFontSizePx: z.number().min(14).max(24),
  lineHeight: z.number().min(1.2).max(2.5),
  textColor: z.string().min(1),
  backgroundColor: z.string().min(1),
  accentColor: z.string().min(1),
  spacingUnit: z.number().min(0.25).max(4)
});

export const DEFAULT_TOKENS = {
  fontFamily: '-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Inter,Arial,sans-serif',
  maxWidthCh: 72,
  baseFontSizePx: 18,
  lineHeight: 1.55,
  textColor: '#0b0b0b',
  backgroundColor: '#ffffff',
  accentColor: '#0f62fe',
  spacingUnit: 1
};

const PartialTokensSchema = ThemeTokensSchema.partial();

export function normalizeTokens(input) {
  const parsed = PartialTokensSchema.safeParse(input);
  const partial = parsed.success ? parsed.data : {};
  return { ...DEFAULT_TOKENS, ...partial };
}

export function tryNormalizeTokens(input) {
  const parsed = PartialTokensSchema.safeParse(input);
  if (!parsed.success) {
    return { tokens: DEFAULT_TOKENS, valid: false };
  }
  return { tokens: { ...DEFAULT_TOKENS, ...parsed.data }, valid: true };
}
