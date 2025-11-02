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

async function sign(value) {
  const secret = getSecret();
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(value));
  return Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

async function encodeSession(userId, issuedAt) {
  const payload = `${userId}.${issuedAt}`;
  const signature = await sign(payload);
  return `${payload}.${signature}`;
}

async function parseSession(token) {
  const [userId, issuedAtStr, signature] = token.split('.');
  if (!userId || !issuedAtStr || !signature) {
    return null;
  }
  const payload = `${userId}.${issuedAtStr}`;
  const expected = await sign(payload);
  // Timing-safe comparison for Edge Runtime
  if (signature.length !== expected.length) {
    return null;
  }
  let equal = true;
  for (let i = 0; i < signature.length; i++) {
    if (signature[i] !== expected[i]) {
      equal = false;
    }
  }
  if (!equal) {
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

export async function createSessionCookie(userId) {
  const issuedAt = Date.now();
  const token = await encodeSession(userId, issuedAt);
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
  return await parseSession(token);
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

export async function attachSession(response, userId) {
  const cookie = await createSessionCookie(userId);
  response.headers.append('Set-Cookie', cookie);
  return response;
}

export function detachSession(response) {
  response.headers.append('Set-Cookie', clearSessionCookie());
  return response;
}
