import { NextRequest, NextResponse } from 'next/server';
import { getAccessTokenFromRequest } from '@/lib/auth-cookies';
import { backendFetch, isBackendUnavailable } from '@/lib/backend-fetch';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const response = await backendFetch('/api/branches/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getAccessTokenFromRequest(request) || ''}`
      },
      body: JSON.stringify(body),
    }, { retry: true });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      return NextResponse.json(
        { error: errorData?.message || 'Failed to search branches' },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error searching branches:', error);
    return NextResponse.json(
      { error: isBackendUnavailable(error) ? 'Backend service unavailable' : 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: isBackendUnavailable(error) ? 503 : 500 }
    );
  }
}
