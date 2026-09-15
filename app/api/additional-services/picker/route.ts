import { NextRequest, NextResponse } from 'next/server';
import { getAccessTokenFromRequest } from '@/lib/auth-cookies';
import { backendFetch, isBackendUnavailable } from '@/lib/backend-fetch';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const response = await backendFetch('/api/additional-services/picker', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getAccessTokenFromRequest(request) || ''}`,
      },
      body: JSON.stringify(body),
    }, { retry: true });

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
    console.error('Additional service picker error:', error);
    return NextResponse.json(
      { error: isBackendUnavailable(error) ? 'Backend service unavailable' : 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: isBackendUnavailable(error) ? 503 : 500 }
    );
  }
}
