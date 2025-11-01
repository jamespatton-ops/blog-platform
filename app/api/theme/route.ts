import { prisma } from '@/lib/db';
import { auth } from '@/lib/auth';

export async function PUT(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return new Response('Unauthorized', { status: 401 });
  }

  const body = await req.json();
  const data = {
    font_stack: String(body.font_stack ?? '-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Inter,Arial,sans-serif'),
    max_width_ch: Number(body.max_width_ch ?? 72),
    base_font_size_px: Number(body.base_font_size_px ?? 18),
    leading: Number(body.leading ?? 1.55),
    text_color: String(body.text_color ?? '#0b0b0b'),
    bg_color: String(body.bg_color ?? '#ffffff'),
    accent_color: String(body.accent_color ?? '#0f62fe')
  };

  const updated = await prisma.theme.upsert({
    where: { userId: session.user.id },
    update: data,
    create: { ...data, userId: session.user.id }
  });

  return Response.json(updated);
}
