// ─────────────────────────────────────────────────────────────
//  Maarkbh · مركبة — Server-side Session Store
//
//  Uses Redis when REDIS_URL is configured (required for serverless
//  platforms like Vercel), otherwise falls back to an in-memory Map
//  suitable for single-instance local/dev deployments.
// ─────────────────────────────────────────────────────────────

import { randomUUID } from 'crypto';
import Redis from 'ioredis';

export interface SessionData {
  accessToken: string;
  refreshToken?: string;
  idToken?: string;
  expiresAt: number;
}

const redisUrl = process.env.REDIS_URL;
const redis = redisUrl ? new Redis(redisUrl) : null;

// Survive Next.js dev-mode hot reloads by stashing the store on globalThis.
const LOCAL_STORE_KEY = '__mkSessionStore';

declare global {
  // eslint-disable-next-line no-var
  var __mkSessionStore: Map<string, SessionData> | undefined;
}

const memoryStore: Map<string, SessionData> = globalThis.__mkSessionStore ?? new Map();
globalThis.__mkSessionStore = memoryStore;

const REDIS_TTL_SECONDS = 7 * 24 * 60 * 60;

function isExpired(data: SessionData): boolean {
  return Date.now() > data.expiresAt;
}

export async function createSession(data: SessionData): Promise<string> {
  const id = randomUUID();
  if (redis) {
    await redis.setex(`mk:session:${id}`, REDIS_TTL_SECONDS, JSON.stringify(data));
  } else {
    memoryStore.set(id, data);
  }
  return id;
}

export async function getSession(id: string | null | undefined): Promise<SessionData | null> {
  if (!id) return null;

  let data: SessionData | null | undefined;

  if (redis) {
    const json = await redis.get(`mk:session:${id}`);
    if (!json) return null;
    try {
      data = JSON.parse(json) as SessionData;
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
    await redis.setex(`mk:session:${id}`, REDIS_TTL_SECONDS, JSON.stringify(data));
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
