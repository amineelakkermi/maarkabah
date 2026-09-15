import { NextRequest, NextResponse } from 'next/server';
import { getAccessTokenFromRequest } from '@/lib/auth-cookies';
import { backendFetch, isBackendUnavailable } from '@/lib/backend-fetch';

type RouteContext = {
  params: Promise<{ path?: string[] }>;
};

async function proxy(request: NextRequest, context: RouteContext, method: string) {
  const { path = [] } = await context.params;
  const backendPath = `/api/extended-coverages${path.length ? `/${path.join('/')}` : ''}`;
  const token = getAccessTokenFromRequest(request);
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;

  const init: RequestInit = { method, headers };
  if (method !== 'GET' && method !== 'HEAD') {
    const text = await request.text();
    if (text) {
      headers['Content-Type'] = request.headers.get('content-type') || 'application/json';
      init.body = text;
    }
  }

  try {
    const retry = method === 'GET' || backendPath.endsWith('/picker') || backendPath.endsWith('/search');
    const response = await backendFetch(`${backendPath}${request.nextUrl.search}`, init, { retry });
    const text = await response.text();
    const contentType = response.headers.get('content-type');

    if (!text) return new NextResponse(null, { status: response.status });
    if (contentType?.includes('application/json')) {
      return NextResponse.json(JSON.parse(text), { status: response.status });
    }
    return new NextResponse(text, { status: response.status, headers: contentType ? { 'Content-Type': contentType } : undefined });
  } catch (error) {
    console.error(`Extended coverages proxy error (${method} ${backendPath}):`, error);
    return NextResponse.json(
      { error: isBackendUnavailable(error) ? 'Backend service unavailable' : 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: isBackendUnavailable(error) ? 503 : 500 }
    );
  }
}

export async function GET(request: NextRequest, context: RouteContext) {
  return proxy(request, context, 'GET');
}

export async function POST(request: NextRequest, context: RouteContext) {
  return proxy(request, context, 'POST');
}

export async function PUT(request: NextRequest, context: RouteContext) {
  return proxy(request, context, 'PUT');
}
