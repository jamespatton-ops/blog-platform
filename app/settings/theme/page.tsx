import { prisma } from '@/lib/db';
import { ThemeControls } from '@/components/ThemeControls';
import { DEFAULT_THEME_NAME } from '@/lib/constants';
import { DEFAULT_TOKENS } from '@/lib/tokens';

export default async function ThemeSettingsPage() {
  const theme = await prisma.theme.findFirst({
    where: { isDefault: true },
    select: { id: true, name: true, tokens: true }
  });

  const value = theme ?? { id: undefined, name: DEFAULT_THEME_NAME, tokens: DEFAULT_TOKENS };

  return (
    <main>
      <h1 style={{ fontWeight: 600, fontSize: '1.5rem', marginBottom: '2rem' }}>Theme</h1>
      <ThemeControls theme={value} />
    </main>
  );
}
