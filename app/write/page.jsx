import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { getAuthSession } from '@/lib/auth';
import { EditorShell } from '@/components/EditorShell';

export default async function WritePage() {
  const session = await getAuthSession();
  if (!session?.user?.id) {
    redirect('/login');
  }

  const themes = await prisma.theme.findMany({
    where: { ownerId: session.user.id },
    orderBy: { name: 'asc' },
    select: { id: true, name: true }
  });

  return (
    <>
      <h1>New entry</h1>
      <EditorShell initialPost={null} themes={themes} />
    </>
  );
}
