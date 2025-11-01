import { detachSession } from '@/lib/auth';

export async function POST() {
  const response = new Response(null, { status: 204 });
  detachSession(response);
  return response;
}
