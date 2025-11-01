import { coerceTokens } from './tokens';

export function tokensToCssVars(inputTokens) {
  const tokens = coerceTokens(inputTokens);
  const vars = {
    '--font-sans': tokens.fonts.sans,
    '--font-serif': tokens.fonts.serif,
    '--font-mono': tokens.fonts.mono,
    '--font-body': tokens.fonts.body,
    '--font-head': tokens.fonts.headings,
    '--font-code': tokens.fonts.code,
    '--base': `${tokens.type.basePx}px`,
    '--leading': String(tokens.type.leading),
    '--max-ch': String(tokens.type.maxCh),
    '--h-scale': String(tokens.type.hScale),
    '--para-space': String(tokens.type.paraSpace),
    '--link-underline': tokens.links.underline ? 'underline' : 'none',
    '--link-offset': `${tokens.links.offset}px`,
    '--link-thickness': `${tokens.links.thickness}px`,
    '--hyphens': tokens.rules.hyphens,
    '--orphans': String(tokens.rules.orphans),
    '--widows': String(tokens.rules.widows),
    '--bg': tokens.colors.light.bg,
    '--text': tokens.colors.light.text,
    '--muted': tokens.colors.light.muted,
    '--accent': tokens.colors.light.accent,
    '--color-light-bg': tokens.colors.light.bg,
    '--color-light-text': tokens.colors.light.text,
    '--color-light-muted': tokens.colors.light.muted,
    '--color-light-accent': tokens.colors.light.accent,
    '--color-dark-bg': tokens.colors.dark.bg,
    '--color-dark-text': tokens.colors.dark.text,
    '--color-dark-muted': tokens.colors.dark.muted,
    '--color-dark-accent': tokens.colors.dark.accent,
    '--color-hc-bg': tokens.colors.hc.bg,
    '--color-hc-text': tokens.colors.hc.text,
    '--color-hc-muted': tokens.colors.hc.muted,
    '--color-hc-accent': tokens.colors.hc.accent
  };
  return vars;
}
