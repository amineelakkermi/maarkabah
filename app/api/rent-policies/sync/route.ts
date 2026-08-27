import { NextRequest, NextResponse } from 'next/server';
import { getAccessTokenFromRequest } from '@/lib/auth-cookies';

export async function POST(request: NextRequest) {
  try {
    const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://139.59.140.232';
    const response = await fetch(`${API_BASE_URL}/api/rent-policies/sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getAccessTokenFromRequest(request) || ''}`,
      },
    });
    const text = await response.text();
    const data = text ? JSON.parse(text) : null;
    if (!response.ok) return NextResponse.json(data || { error: response.statusText }, { status: response.status });
    return data == null ? new NextResponse(null, { status: response.status }) : NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Sync rent policies error:', error);
    return NextResponse.json({ error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}
