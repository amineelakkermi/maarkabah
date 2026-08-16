import { NextRequest, NextResponse } from 'next/server';
import { getAccessTokenFromRequest } from '@/lib/auth-cookies';

export async function POST(request: NextRequest) {
  try {
    const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://139.59.140.232';
    const formData = await request.formData();

    // Preserve query params (e.g. branchId) when forwarding to the backend
    const backendUrl = new URL(`${API_BASE_URL}/api/attachments/upload`);
    backendUrl.search = request.nextUrl.search;

    const response = await fetch(backendUrl.toString(), {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${getAccessTokenFromRequest(request) || ''}`,
        // Do not set Content-Type: the browser sets it with the multipart boundary
      },
      body: formData,
    });

    const text = await response.text();

    if (!response.ok) {
      console.error('Attachment upload failed:', {
        url: backendUrl.toString(),
        status: response.status,
        body: text,
      });
      return NextResponse.json(
        { error: text || response.statusText, status: response.status },
        { status: response.status }
      );
    }

    try {
      return NextResponse.json(text ? JSON.parse(text) : null);
    } catch {
      console.error('Attachment upload returned non-JSON body:', text);
      return NextResponse.json({ error: 'Unexpected upload response', body: text }, { status: 502 });
    }
  } catch (error) {
    console.error('Attachment upload error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
