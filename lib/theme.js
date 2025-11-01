import { normalizeTokens } from './tokens';

export function tokensToCssVars(tokens) {
  return {
    '--font': tokens.fontFamily,
    '--max-ch': String(tokens.maxWidthCh),
    '--base': `${tokens.baseFontSizePx}px`,
    '--leading': String(tokens.lineHeight),
    '--text': tokens.textColor,
    '--bg': tokens.backgroundColor,
    '--accent': tokens.accentColor,
    '--space': `${tokens.spacingUnit}rem`
  };
}

export function coerceTokens(input) {
  return normalizeTokens(input);
}
