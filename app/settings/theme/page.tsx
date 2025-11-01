import { prisma } from '@/lib/db';
import { ThemeControls } from '@/components/ThemeControls';

const defaults = {
  font_stack: '-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Inter,Arial,sans-serif',
  max_width_ch: 72,
  base_font_size_px: 18,
  leading: 1.55,
  text_color: '#0b0b0b',
  bg_color: '#ffffff',
  accent_color: '#0f62fe'
};

export default async function ThemeSettingsPage() {
  const theme = await prisma.theme.findFirst();

  return (
    <main>
      <h1 style={{ fontWeight: 600, fontSize: '1.5rem', marginBottom: '2rem' }}>Theme</h1>
      <ThemeControls initial={theme ?? defaults} />
    </main>
  );
}
