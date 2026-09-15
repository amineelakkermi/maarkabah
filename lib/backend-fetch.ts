const API_BASE_URL = (process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://139.59.140.232').replace(/\/$/, '');

const RETRYABLE_ERROR_CODES = new Set([
  'UND_ERR_CONNECT_TIMEOUT',
  'UND_ERR_HEADERS_TIMEOUT',
  'UND_ERR_SOCKET',
  'ECONNREFUSED',
  'ECONNRESET',
  'ETIMEDOUT',
]);

function errorCode(error: unknown): string | undefined {
  if (!(error instanceof Error)) return undefined;
  const cause = error.cause;
  if (typeof cause !== 'object' || cause === null || !('code' in cause)) return undefined;
  return typeof cause.code === 'string' ? cause.code : undefined;
}

export function isBackendUnavailable(error: unknown): boolean {
  if (error instanceof Error && (error.name === 'AbortError' || error.name === 'TimeoutError')) return true;
  const code = errorCode(error);
  return code !== undefined && RETRYABLE_ERROR_CODES.has(code);
}

type BackendFetchOptions = {
  retry?: boolean;
  timeoutMs?: number;
};

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs: number): Promise<Response> {
  const signal = AbortSignal.timeout(timeoutMs);
  return fetch(url, { ...init, signal });
}

export async function backendFetch(
  path: string,
  init: RequestInit,
  { retry = false, timeoutMs = 8_000 }: BackendFetchOptions = {},
): Promise<Response> {
  const url = `${API_BASE_URL}${path}`;

  try {
    return await fetchWithTimeout(url, init, timeoutMs);
  } catch (error) {
    if (!retry || !isBackendUnavailable(error)) throw error;
    await new Promise((resolve) => setTimeout(resolve, 250));
    return fetchWithTimeout(url, init, timeoutMs);
  }
}
