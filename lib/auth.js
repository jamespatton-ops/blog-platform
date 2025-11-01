import { createHmac, timingSafeEqual } from 'node:crypto';
import { NextResponse } from 'next/server';

const SESSION_COOKIE = 'sid';
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30; // 30 days

function getSecret() {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error('SESSION_SECRET is not set');
  }
  return secret;
}

function sign(value) {
  const secret = getSecret();
  return createHmac('sha256', secret).update(value).digest('hex');
}

function encodeSession(userId, issuedAt) {
  const payload = `${userId}.${issuedAt}`;
  const signature = sign(payload);
  return `${payload}.${signature}`;
}

function parseSession(token) {
  const [userId, issuedAtStr, signature] = token.split('.');
  if (!userId || !issuedAtStr || !signature) {
    return null;
  }
  const payload = `${userId}.${issuedAtStr}`;
  const expected = sign(payload);
  try {
    const a = Buffer.from(signature, 'hex');
    const b = Buffer.from(expected, 'hex');
    if (a.length !== b.length || !timingSafeEqual(a, b)) {
      return null;
    }
  } catch {
    return null;
  }
  const issuedAt = Number(issuedAtStr);
  if (Number.isNaN(issuedAt)) {
    return null;
  }
  if (Date.now() - issuedAt > SESSION_TTL_MS) {
    return null;
  }
  return { userId, issuedAt };
}

export function createSessionCookie(userId) {
  const issuedAt = Date.now();
  const token = encodeSession(userId, issuedAt);
  const maxAge = Math.floor(SESSION_TTL_MS / 1000);
  const secure = process.env.NODE_ENV === 'production';
  return `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge};${secure ? ' Secure;' : ''}`;
}

export function clearSessionCookie() {
  const secure = process.env.NODE_ENV === 'production';
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0;${secure ? ' Secure;' : ''}`;
}

export function extractSessionToken(cookieHeader) {
  if (!cookieHeader) {
    return null;
  }
  const cookies = cookieHeader.split(';').map((part) => part.trim());
  for (const cookie of cookies) {
    if (cookie.startsWith(`${SESSION_COOKIE}=`)) {
      return cookie.slice(SESSION_COOKIE.length + 1);
    }
  }
  return null;
}

export async function getSessionFromRequest(request) {
  const cookieHeader = request.headers.get('cookie');
  const token = extractSessionToken(cookieHeader);
  if (!token) {
    return null;
  }
  return parseSession(token);
}

export async function requireSession(request) {
  const session = await getSessionFromRequest(request);
  if (!session) {
    return null;
  }
  return session;
}

export function redirectToLogin(request) {
  const loginUrl = new URL('/login', request.nextUrl);
  loginUrl.searchParams.set('redirect', request.nextUrl.pathname);
  return NextResponse.redirect(loginUrl);
}

export function attachSession(response, userId) {
  response.headers.append('Set-Cookie', createSessionCookie(userId));
  return response;
}

export function detachSession(response) {
  response.headers.append('Set-Cookie', clearSessionCookie());
  return response;
}
