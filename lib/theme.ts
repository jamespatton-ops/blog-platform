import type { Tokens } from './tokens';

export function tokensToVars(t: Tokens, mode: 'light' | 'dark' | 'hc') {
  const c = t.colors[mode];
  return {
    '--font-sans': t.font.sans,
    '--font-serif': t.font.serif,
    '--font-mono': t.font.mono,
    '--font-body': t.font[t.font.body],
    '--font-head': t.font[t.font.headings],
    '--font-code': t.font[t.font.code],
    '--base': `${t.type.basePx}px`,
    '--leading': String(t.type.leading),
    '--max-ch': String(t.type.maxCh),
    '--h-scale': String(t.type.hScale),
    '--para-space': `${t.type.paraSpace}em`,
    '--bg': c.bg,
    '--text': c.text,
    '--muted': c.muted,
    '--accent': c.accent,
    '--link-underline': t.links.underline ? '1' : '0',
    '--link-offset': `${t.links.offset}px`,
    '--link-thickness': `${t.links.thickness}px`,
    '--hyphens': t.rules.hyphens,
    '--orphans': String(t.rules.orphans),
    '--widows': String(t.rules.widows)
  };
}
