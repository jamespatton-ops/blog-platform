import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';

const middleware = auth((req) => {
  const { nextUrl } = req;
  const protectedPaths = ['/write', '/edit', '/settings'];
  const isProtected = protectedPaths.some((path) => nextUrl.pathname.startsWith(path));

  if (isProtected && !req.auth) {
    const loginUrl = new URL('/login', nextUrl);
    loginUrl.searchParams.set('redirect', nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
});

export default middleware;

export const config = {
  matcher: ['/write/:path*', '/edit/:path*', '/settings/:path*']
};
