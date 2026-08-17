// ─────────────────────────────────────────────────────────────
//  Maarkbh · مركبة — Session Store
//
//  Uses Upstash Redis (or Vercel KV) when the REST credentials are
//  configured, otherwise falls back to an in-memory Map for local dev.
//
//  This file is imported by both API route handlers (Node runtime) and
//  the Edge middleware, so it must stay Edge-compatible: no Node-only
//  modules like 'crypto' or 'ioredis' may be imported at the top level.
// ─────────────────────────────────────────────────────────────

import { Redis } from '@upstash/redis';

export interface SessionData {
  accessToken: string;
  refreshToken?: string;
  idToken?: string;
  expiresAt: number;
}

const UPSTASH_URL = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;

const redis = UPSTASH_URL && UPSTASH_TOKEN
  ? new Redis({ url: UPSTASH_URL, token: UPSTASH_TOKEN })
  : null;

// Fallback in-memory store for local dev without Redis.
const LOCAL_STORE_KEY = '__mkSessionStore';

declare global {
  // eslint-disable-next-line no-var
  var __mkSessionStore: Map<string, SessionData> | undefined;
}

const memoryStore: Map<string, SessionData> = globalThis.__mkSessionStore ?? new Map();
globalThis.__mkSessionStore = memoryStore;

const REDIS_TTL_SECONDS = 7 * 24 * 60 * 60;

function randomUUID(): string {
  const bytes = new Uint8Array(16);
  (globalThis as any).crypto.getRandomValues(bytes);

  bytes[6] = (bytes[6] & 0x0f) | 0x40; // version 4
  bytes[8] = (bytes[8] & 0x3f) | 0x80; // variant 10

  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}

function isExpired(data: SessionData): boolean {
  return Date.now() > data.expiresAt;
}

export async function createSession(data: SessionData): Promise<string> {
  const id = randomUUID();
  if (redis) {
    await redis.set(`mk:session:${id}`, JSON.stringify(data), { ex: REDIS_TTL_SECONDS });
  } else {
    memoryStore.set(id, data);
  }
  return id;
}

export async function getSession(id: string | null | undefined): Promise<SessionData | null> {
  if (!id) return null;

  let data: SessionData | null | undefined;

  if (redis) {
    const raw = await redis.get<string>(`mk:session:${id}`);
    if (!raw) return null;
    try {
      data = typeof raw === 'string' ? (JSON.parse(raw) as SessionData) : (raw as unknown as SessionData);
    } catch {
      return null;
    }
  } else {
    data = memoryStore.get(id);
  }

  if (!data) return null;

  if (isExpired(data)) {
    await deleteSession(id);
    return null;
  }

  return data;
}

export async function updateSession(id: string, data: SessionData): Promise<void> {
  if (!id) return;
  if (redis) {
    await redis.set(`mk:session:${id}`, JSON.stringify(data), { ex: REDIS_TTL_SECONDS });
  } else {
    memoryStore.set(id, data);
  }
}

export async function deleteSession(id: string | null | undefined): Promise<void> {
  if (!id) return;
  if (redis) {
    await redis.del(`mk:session:${id}`);
  } else {
    memoryStore.delete(id);
  }
}
