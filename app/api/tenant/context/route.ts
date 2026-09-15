import { NextRequest, NextResponse } from 'next/server';
import { getAccessTokenFromRequest } from '@/lib/auth-cookies';
import { backendFetch, isBackendUnavailable } from '@/lib/backend-fetch';

export async function GET(request: NextRequest) {
  try {
    const response = await backendFetch('/api/tenant/context', {
      method: 'GET',
      headers: {
      'Authorization': `Bearer ${getAccessTokenFromRequest(request) || ''}`
      },
    }, { retry: true });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      return NextResponse.json(
        { error: errorData?.message || 'Failed to fetch tenant context' },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching tenant context:', error);
    return NextResponse.json(
      { error: isBackendUnavailable(error) ? 'Backend service unavailable' : 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: isBackendUnavailable(error) ? 503 : 500 }
    );
  }
}
