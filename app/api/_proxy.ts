import { NextRequest, NextResponse } from 'next/server';
import { getAccessTokenFromRequest } from '@/lib/auth-cookies';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://139.59.140.232';

export async function forwardRequest(
  request: NextRequest,
  backendPath: string,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE',
  includeBody = false
) {
  try {
    const headers: Record<string, string> = {
      Authorization: `Bearer ${getAccessTokenFromRequest(request) || ''}`,
    };
    const init: RequestInit = { method, headers };

    if (includeBody) {
      const body = await request.text();
      if (body) {
        headers['Content-Type'] = request.headers.get('content-type') || 'application/json';
        init.body = body;
      }
    }

    const response = await fetch(`${API_BASE_URL}${backendPath}${request.nextUrl.search}`, init);
    const text = await response.text();
    console.log(`[PROXY ${method} ${backendPath}] ${response.status}:`, text.slice(0, 2000));

    if (!text) {
      return new NextResponse(null, { status: response.status });
    }

    const contentType = response.headers.get('content-type');
    if (contentType?.includes('application/json')) {
      try {
        return NextResponse.json(JSON.parse(text), { status: response.status });
      } catch {
        return new NextResponse(text, {
          status: response.status,
          headers: { 'Content-Type': contentType },
        });
      }
    }

    return new NextResponse(text, {
      status: response.status,
      headers: contentType ? { 'Content-Type': contentType } : undefined,
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
