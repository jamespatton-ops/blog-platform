import { NextResponse } from 'next/server';
import { requireSession, redirectToLogin } from '@/lib/auth';

const PROTECTED_PATHS = ['/write', '/edit', '/settings'];

export default async function middleware(request) {
  const isProtected = PROTECTED_PATHS.some((path) => request.nextUrl.pathname.startsWith(path));
  if (!isProtected) {
    return NextResponse.next();
  }

  const session = await requireSession(request);
  if (!session) {
    return redirectToLogin(request);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/write/:path*', '/edit/:path*', '/settings/:path*']
};
