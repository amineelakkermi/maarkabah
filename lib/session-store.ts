// ─────────────────────────────────────────────────────────────
//  Maarkbh · مركبة — Server-side Session Store
//  This backend issues encrypted (JWE) access/refresh tokens that are
//  routinely 4-5KB each — far beyond the ~4096-byte per-cookie limit
//  enforced by browsers (and even beyond what some HTTP clients will
//  reliably send back in a single Cookie header once split across
//  multiple cookies). Storing the raw tokens in cookies is not viable.
//
//  Instead we keep the real tokens server-side in this in-memory store,
//  keyed by an opaque session id, and only ever put that small id in
//  the browser's HttpOnly cookie.
//
//  Note: this is an in-memory store, so sessions are lost on server
//  restart (or across serverless instances). That's an acceptable
//  trade-off for this app's current single-instance deployment model;
//  swap this for Redis/a database if that changes.
// ─────────────────────────────────────────────────────────────

import { randomUUID } from 'crypto';

export interface SessionData {
  accessToken: string;
  refreshToken?: string;
  idToken?: string;
  expiresAt: number;
}

declare global {
  // eslint-disable-next-line no-var
  var __mkSessionStore: Map<string, SessionData> | undefined;
}

// Survive Next.js dev-mode hot reloads by stashing the store on globalThis.
const store: Map<string, SessionData> = globalThis.__mkSessionStore ?? new Map();
globalThis.__mkSessionStore = store;

export function createSession(data: SessionData): string {
  const id = randomUUID();
  store.set(id, data);
  return id;
}

export function getSession(id: string | null | undefined): SessionData | null {
  if (!id) return null;
  return store.get(id) ?? null;
}

export function updateSession(id: string, data: SessionData): void {
  store.set(id, data);
}

export function deleteSession(id: string | null | undefined): void {
  if (id) store.delete(id);
}
