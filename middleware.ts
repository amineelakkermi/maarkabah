// ─────────────────────────────────────────────────────────────
//  Maarkbh · مركبة — Middleware
//
//  Resolves the opaque mk_session cookie to the actual tokens and
//  injects them as internal request headers. This keeps all API route
//  handlers synchronous while still supporting async Redis lookups.
//
//  This file must stay Edge-compatible: it only imports Edge-safe
//  modules (lib/session-store.ts uses @upstash/redis and Web Crypto).
// ─────────────────────────────────────────────────────────────

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getSession } from '@/lib/session-store';

const COOKIE_SESSION = 'mk_session';

export async function middleware(request: NextRequest) {
  const requestHeaders = new Headers(request.headers);
  const sessionId = request.cookies.get(COOKIE_SESSION)?.value;

  if (sessionId) {
    const session = await getSession(sessionId);
    if (session) {
      requestHeaders.set('x-mk-access-token', session.accessToken);
      if (session.refreshToken) {
        requestHeaders.set('x-mk-refresh-token', session.refreshToken);
      }
      if (session.idToken) {
        requestHeaders.set('x-mk-id-token', session.idToken);
      }
    }
  }

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}

export const config = {
  matcher: '/api/:path*',
};
