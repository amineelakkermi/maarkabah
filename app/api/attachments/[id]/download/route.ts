import { NextRequest, NextResponse } from 'next/server';
import { getAccessTokenFromRequest } from '@/lib/auth-cookies';
import { backendFetch, isBackendUnavailable } from '@/lib/backend-fetch';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const backendPath = `/api/attachments/${id}/download${request.nextUrl.search}`;

    const response = await backendFetch(backendPath, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${getAccessTokenFromRequest(request) || ''}`,
      },
    }, { retry: true });

    if (!response.ok) {
      const text = await response.text();
      console.error('Attachment download failed:', {
        path: backendPath,
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
      { error: isBackendUnavailable(error) ? 'Backend service unavailable' : 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: isBackendUnavailable(error) ? 503 : 500 }
    );
  }
}
