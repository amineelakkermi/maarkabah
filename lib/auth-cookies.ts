// ─────────────────────────────────────────────────────────────
//  Maarkbh · مركبة — Server-side Auth Cookie Helpers
//  Tokens NEVER reach client-side JavaScript: they live server-side
//  in Redis (or in-memory when REDIS_URL is not set). The actual token
//  values are injected into request headers by middleware.ts so that
//  all API route handlers can read them synchronously.
// ─────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { createSession, deleteSession } from './session-store';

export const COOKIE_SESSION = 'mk_session';

// Refresh tokens from this backend typically live longer than access tokens.
// We don't know the exact backend-side lifetime, so we use a conservative
// 7-day ceiling; the session is still invalidated server-side whenever the
// backend rejects the refresh_token grant.
const REFRESH_TOKEN_MAX_AGE_SECONDS = 7 * 24 * 60 * 60;
const DEFAULT_ACCESS_TOKEN_MAX_AGE_SECONDS = 3600;

interface TokenSet {
  accessToken: string;
  refreshToken?: string;
  idToken?: string;
  expiresIn?: number;
}

interface CookieOptions {
  httpOnly: boolean;
  secure: boolean;
  sameSite: 'strict' | 'lax' | 'none';
  path: string;
  maxAge?: number;
}

function baseCookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    // Secure cookies require HTTPS. Disable only in local (http) dev so
    // testing on http://localhost still works.
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
  };
}

function serializeCookie(name: string, value: string, options: CookieOptions): string {
  const parts = [`${name}=${encodeURIComponent(value)}`];
  if (options.maxAge !== undefined) parts.push(`Max-Age=${options.maxAge}`);
  parts.push(`Path=${options.path}`);
  if (options.httpOnly) parts.push('HttpOnly');
  if (options.secure) parts.push('Secure');
  parts.push(`SameSite=${options.sameSite}`);
  return parts.join('; ');
}

function appendCookie(res: NextResponse, name: string, value: string, options: CookieOptions) {
  res.headers.append('Set-Cookie', serializeCookie(name, value, options));
}

function getSessionIdFromRequest(request: NextRequest): string | null {
  return request.cookies.get(COOKIE_SESSION)?.value || null;
}

/**
 * Creates a server-side session for the given tokens and sets the
 * (small, opaque) session-id cookie on the response. Call this from any
 * route that receives fresh tokens from the backend (login, refresh).
 *
 * If `request` is provided, any existing session tied to that request's
 * cookie is invalidated first (e.g. replacing the session on refresh).
 */
export async function setAuthCookies(res: NextResponse, tokens: TokenSet, request?: NextRequest) {
  if (request) {
    await deleteSession(getSessionIdFromRequest(request));
  }

  const accessMaxAge = tokens.expiresIn && tokens.expiresIn > 0 ? tokens.expiresIn : DEFAULT_ACCESS_TOKEN_MAX_AGE_SECONDS;
  const sessionId = await createSession({
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
    idToken: tokens.idToken,
    expiresAt: Date.now() + accessMaxAge * 1000,
  });

  appendCookie(res, COOKIE_SESSION, sessionId, { ...baseCookieOptions(), maxAge: REFRESH_TOKEN_MAX_AGE_SECONDS });
}

/**
 * Clears the auth session on the given response. Call this on logout,
 * or whenever a refresh attempt fails (session considered dead).
 */
export async function clearAuthCookies(res: NextResponse, request?: NextRequest) {
  if (request) {
    await deleteSession(getSessionIdFromRequest(request));
  }
  appendCookie(res, COOKIE_SESSION, '', { ...baseCookieOptions(), maxAge: 0 });
}

/**
 * Reads the access token injected by middleware.ts.
 * Use this in every proxy route instead of `request.headers.get('Authorization')`.
 *
 * Example:
 *   const token = getAccessTokenFromRequest(request);
 *   headers: { Authorization: token ? `Bearer ${token}` : '' }
 */
export function getAccessTokenFromRequest(request: NextRequest): string | null {
  return request.headers.get('x-mk-access-token') || null;
}

export function getRefreshTokenFromRequest(request: NextRequest): string | null {
  return request.headers.get('x-mk-refresh-token') || null;
}

export function getIdTokenFromRequest(request: NextRequest): string | null {
  return request.headers.get('x-mk-id-token') || null;
}

/**
 * Decodes a JWT payload without verifying the signature. Verification is
 * unnecessary here because the token was issued and freshly validated by
 * our own backend seconds earlier (same trust boundary) — this is purely
 * to extract display claims (name, email, exp...) for the UI.
 */
export function decodeJwtPayload(token: string): any {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const json = Buffer.from(base64, 'base64').toString('utf-8');
    return JSON.parse(json);
  } catch {
    return null;
  }
}
