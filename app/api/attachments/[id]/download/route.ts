import { NextRequest, NextResponse } from 'next/server';
import { getAccessTokenFromRequest } from '@/lib/auth-cookies';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://139.59.140.232';

    const backendUrl = new URL(`${API_BASE_URL}/api/attachments/${id}/download`);
    backendUrl.search = request.nextUrl.search;

    const response = await fetch(backendUrl.toString(), {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${getAccessTokenFromRequest(request) || ''}`,
      },
    });

    if (!response.ok) {
      const text = await response.text();
      console.error('Attachment download failed:', {
        url: backendUrl.toString(),
        status: response.status,
        body: text,
      });
      return NextResponse.json(
        { error: text || response.statusText, status: response.status },
        { status: response.status }
      );
    }

    const blob = await response.blob();
    const headers = new Headers();
    const contentType = response.headers.get('content-type');
    const contentDisposition = response.headers.get('content-disposition');

    if (contentType) headers.set('Content-Type', contentType);
    if (contentDisposition) headers.set('Content-Disposition', contentDisposition);

    return new NextResponse(blob, { status: 200, headers });
  } catch (error) {
    console.error('Attachment download error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
