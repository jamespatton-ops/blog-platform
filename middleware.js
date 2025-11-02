export { default } from 'next-auth/middleware';

export const config = {
  matcher: ['/write/:path*', '/edit/:path*', '/settings/:path*']
};
