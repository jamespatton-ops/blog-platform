import { safeDb } from '@/lib/db';
import { ThemeControls } from '@/components/ThemeControls';
import { DEFAULT_THEME_NAME } from '@/lib/constants';
import { DEFAULT_TOKENS } from '@/lib/tokens';

export default async function ThemeSettingsPage() {
  const db = await safeDb();
  const theme = db.available ? await db.client.getDefaultTheme() : null;

  const value = theme ?? { id: undefined, name: DEFAULT_THEME_NAME, tokens: DEFAULT_TOKENS };

  return (
    <main>
      <h1 style={{ fontWeight: 600, fontSize: '1.5rem', marginBottom: '2rem' }}>Theme</h1>
      {!db.available && (
        <p style={{ marginBottom: '1.5rem', opacity: 0.7 }}>
          Theme editor is unavailable until the database is initialized.
        </p>
      )}
      <ThemeControls theme={value} />
    </main>
  );
}
