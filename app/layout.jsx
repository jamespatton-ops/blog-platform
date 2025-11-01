import '@/styles/globals.css';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { tokensToCssVars } from '@/lib/theme';
import { coerceTokens, DEFAULT_TOKENS } from '@/lib/tokens';
import { AuthSessionProvider } from '@/components/SessionProvider';
import { getAuthSession } from '@/lib/auth';
import { NavLinks } from '@/components/NavLinks';

export const metadata = {
  title: 'Plain Journal',
  description: 'A focused journaling blog with room to customize.'
};

function renderFontFaces(fonts) {
  if (!fonts.length) {
    return null;
  }
  const rules = fonts
    .map(
      (font) =>
        `@font-face { font-family: '${font.family}'; font-style: ${font.style}; font-weight: ${font.weightMin} ${font.weightMax}; font-display: ${font.display}; src: url('${font.srcUrl}') format('woff2'); }`
    )
    .join('\n');
  return <style data-font-faces="true" dangerouslySetInnerHTML={{ __html: rules }} />;
}

async function loadLayoutData() {
  const [session, defaultTheme, fonts] = await Promise.all([
    getAuthSession(),
    prisma.theme.findFirst({ where: { isDefault: true } }),
    prisma.fontFace.findMany({ orderBy: { createdAt: 'asc' } })
  ]);

  const tokens = defaultTheme ? coerceTokens(defaultTheme.tokens) : DEFAULT_TOKENS;
  return { session, tokens, fonts };
}

function Shell({ children }) {
  return (
    <div className="shell">
      <header className="site-header" role="banner">
        <div className="site-header__inner">
          <Link href="/" className="site-title">
            Plain Journal
          </Link>
          <nav aria-label="Primary" className="site-nav">
            <NavLinks />
          </nav>
        </div>
      </header>
      <main className="site-main" role="main">
        {children}
      </main>
    </div>
  );
}

export default async function RootLayout({ children }) {
  const { session, tokens, fonts } = await loadLayoutData();
  const cssVars = tokensToCssVars(tokens);

  return (
    <html lang="en" style={cssVars}>
      <head>{renderFontFaces(fonts)}</head>
      <body
        className="app-body"
        style={{
          fontFamily: 'var(--font-body)',
          fontOpticalSizing: tokens.fonts.opticalSizing ? 'auto' : 'none',
          fontVariantLigatures: tokens.fonts.liga ? 'normal' : 'none'
        }}
      >
        <AuthSessionProvider session={session}>
          <Shell>{children}</Shell>
        </AuthSessionProvider>
      </body>
    </html>
  );
}
