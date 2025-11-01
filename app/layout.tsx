import type { Metadata } from 'next';
import type { CSSProperties, ReactNode } from 'react';
import '@/styles/globals.css';
import { prisma } from '@/lib/db';

const DEFAULT_THEME = {
  font_stack: '-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Inter,Arial,sans-serif',
  max_width_ch: 72,
  base_font_size_px: 18,
  leading: 1.55,
  text_color: '#0b0b0b',
  bg_color: '#ffffff',
  accent_color: '#0f62fe'
};

export const metadata: Metadata = {
  title: 'Journal',
  description: 'A calm place for collected writing.'
};

export const dynamic = 'force-dynamic';

async function loadTheme() {
  const theme = await prisma.theme.findFirst();
  if (!theme) return DEFAULT_THEME;
  return theme;
}

export default async function RootLayout({ children }: { children: ReactNode }) {
  const theme = await loadTheme();

  return (
    <html
      lang="en"
      style={{
        '--font': theme.font_stack,
        '--max-ch': String(theme.max_width_ch),
        '--base': `${theme.base_font_size_px}px`,
        '--leading': String(theme.leading),
        '--text': theme.text_color,
        '--bg': theme.bg_color,
        '--accent': theme.accent_color
      } as CSSProperties}
    >
      <body>{children}</body>
    </html>
  );
}
