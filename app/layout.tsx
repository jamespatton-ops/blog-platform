import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import '@/styles/globals.css';
import { prisma } from '@/lib/db';
import { coerceTokens, tokensToCssVars } from '@/lib/theme';
import { DEFAULT_TOKENS } from '@/lib/tokens';

export const metadata: Metadata = {
  title: 'Writing Portfolio',
  description: 'A calm place for collected writing.'
};

async function loadDefaultTokens() {
  const theme = await prisma.theme.findFirst({
    where: { isDefault: true },
    select: { tokens: true }
  });

  return coerceTokens(theme?.tokens ?? DEFAULT_TOKENS);
}

export default async function RootLayout({ children }: { children: ReactNode }) {
  const tokens = await loadDefaultTokens();

  return (
    <html lang="en" style={tokensToCssVars(tokens)}>
      <body>{children}</body>
    </html>
  );
}
