import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { getAuthSession } from '@/lib/auth';
import { ThemeControls } from '@/components/ThemeControls';

export default async function ThemeSettingsPage() {
  const session = await getAuthSession();
  if (!session?.user?.id) {
    redirect('/login');
  }

  const [themes, fonts] = await Promise.all([
    prisma.theme.findMany({
      where: { ownerId: session.user.id },
      orderBy: { createdAt: 'asc' }
    }),
    prisma.fontFace.findMany({
      where: { ownerId: session.user.id },
      orderBy: { createdAt: 'asc' }
    })
  ]);

  return (
    <ThemeControls initialThemes={themes} initialFonts={fonts} />
  );
}
