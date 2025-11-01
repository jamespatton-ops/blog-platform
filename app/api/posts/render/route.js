import { mdToHtml } from '@/lib/markdown';

export async function POST(req) {
  const { content = '' } = await req.json();
  const html = await mdToHtml(String(content));
  return Response.json({ html });
}
