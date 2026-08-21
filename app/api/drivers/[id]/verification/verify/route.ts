import { NextRequest, NextResponse } from 'next/server';
import { getAccessTokenFromRequest } from '@/lib/auth-cookies';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://139.59.140.232';

    const response = await fetch(`${API_BASE_URL}/api/drivers/${id}/verification/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getAccessTokenFromRequest(request) || ''}`,
      },
    });

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
    console.error('Verify driver error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
