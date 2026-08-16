import { NextRequest, NextResponse } from 'next/server';
import { getAccessTokenFromRequest } from '@/lib/auth-cookies';

export async function POST(request: NextRequest) {
  try {
    const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://139.59.140.232';
    const formData = await request.formData();

    // Preserve query params (e.g. branchId) when forwarding to the backend
    const backendUrl = new URL(`${API_BASE_URL}/api/attachments/upload-multi`);
    backendUrl.search = request.nextUrl.search;

    const response = await fetch(backendUrl.toString(), {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${getAccessTokenFromRequest(request) || ''}`,
      },
      body: formData,
    });

    const text = await response.text();
    const data = text ? JSON.parse(text) : null;

    if (!response.ok) {
      return NextResponse.json(data || { error: response.statusText }, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Attachment multi-upload error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
