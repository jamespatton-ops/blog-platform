import '@/styles/globals.css';
import { safeDb } from '@/lib/db';
import { coerceTokens, tokensToCssVars } from '@/lib/theme';
import { DEFAULT_TOKENS } from '@/lib/tokens';

export const metadata = {
  title: 'Writing Portfolio',
  description: 'A calm place for collected writing.'
};

async function loadDefaultTokens() {
  const db = await safeDb();
  if (!db.available) {
    return DEFAULT_TOKENS;
  }

  const theme = await db.client.getDefaultTheme();
  return coerceTokens(theme?.tokens ?? DEFAULT_TOKENS);
}

export default async function RootLayout({ children }) {
  const tokens = await loadDefaultTokens();

  return (
    <html lang="en" style={tokensToCssVars(tokens)}>
      <body>{children}</body>
    </html>
  );
}
