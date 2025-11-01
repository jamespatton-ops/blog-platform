import type { CSSProperties } from 'react';
import { normalizeTokens, type ThemeTokens } from './tokens';

export function tokensToCssVars(tokens: ThemeTokens): CSSProperties {
  return {
    '--font': tokens.fontFamily,
    '--max-ch': String(tokens.maxWidthCh),
    '--base': `${tokens.baseFontSizePx}px`,
    '--leading': String(tokens.lineHeight),
    '--text': tokens.textColor,
    '--bg': tokens.backgroundColor,
    '--accent': tokens.accentColor,
    '--space': `${tokens.spacingUnit}rem`
  } as CSSProperties;
}

export function coerceTokens(input: unknown): ThemeTokens {
  return normalizeTokens(input);
}
