import { NextRequest, NextResponse } from 'next/server';
import { getAccessTokenFromRequest } from '@/lib/auth-cookies';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://139.59.140.232';

type RouteContext = {
  params: Promise<{ path?: string[] }>;
};

async function proxy(
  request: NextRequest,
  context: RouteContext,
  method: string
) {
  const params = await context.params;
  const segments = params.path ?? [];
  const backendPath = '/api/admin/tenants' + (segments.length ? `/${segments.join('/')}` : '');
  const search = request.nextUrl.search;
  const url = `${API_BASE_URL}${backendPath}${search}`;

  const token = getAccessTokenFromRequest(request);
  const headers: Record<string, string> = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const init: RequestInit = { method, headers };

  if (method !== 'GET' && method !== 'HEAD') {
    try {
      const body = await request.json();
      headers['Content-Type'] = 'application/json';
      init.body = JSON.stringify(body);
    } catch {
      // No JSON body; leave body empty.
    }
  }

  try {
    const response = await fetch(url, init);
    const text = await response.text();
    const data = text ? JSON.parse(text) : null;

    if (!response.ok) {
      return NextResponse.json(
        data || { error: response.statusText },
        { status: response.status }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error(`Admin tenants proxy error (${method} ${backendPath}):`, error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
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
