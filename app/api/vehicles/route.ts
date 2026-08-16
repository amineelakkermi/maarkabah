import { NextRequest, NextResponse } from 'next/server';
import { getAccessTokenFromRequest } from '@/lib/auth-cookies';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('Vehicle create payload:', JSON.stringify(body, null, 2));

    // The backend create endpoint fails when `id` is explicitly sent as null.
    // Remove it for creates, keep it for updates.
    const { id, ...rest } = body;
    const forwardBody = id ? { ...rest, id } : rest;
    console.log('Vehicle forward payload:', JSON.stringify(forwardBody, null, 2));

    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://139.59.140.232'}/api/vehicles`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
'Authorization': `Bearer ${getAccessTokenFromRequest(request) || ''}`
      },
      body: JSON.stringify(forwardBody),
    });

    const responseText = await response.text();

    if (!response.ok) {
      let errorData = null;
      try { errorData = responseText ? JSON.parse(responseText) : null; } catch {}
      console.error('Vehicle create/update failed:', { status: response.status, body: responseText });
      return NextResponse.json(
        {
          error: errorData?.message || errorData?.title || errorData?.error || responseText || 'Failed to save vehicle',
          errors: errorData?.errors,
          details: errorData,
        },
        { status: response.status }
      );
    }

    const data = responseText ? JSON.parse(responseText) : null;
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error creating vehicle:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
