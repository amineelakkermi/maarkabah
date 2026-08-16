import { NextRequest, NextResponse } from 'next/server';
import { getAccessTokenFromRequest } from '@/lib/auth-cookies';

export async function GET(request: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  const { userId: userIdParam } = await params;
  const userId = Number(userIdParam);
  if (isNaN(userId) || userId <= 0) {
    return NextResponse.json(
      { error: 'Invalid user id' },
      { status: 400 }
    );
  }

  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://139.59.140.232'}/api/tenant/users/${userId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${getAccessTokenFromRequest(request) || ''}`
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      return NextResponse.json(
        { error: errorData?.message || 'Failed to fetch user' },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching user:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  const { userId: userIdParam } = await params;
  const userId = Number(userIdParam);
  if (isNaN(userId) || userId <= 0) {
    return NextResponse.json(
      { error: 'Invalid user id' },
      { status: 400 }
    );
  }

  try {
    const body = await request.json();
    
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://139.59.140.232'}/api/tenant/users/${userId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getAccessTokenFromRequest(request) || ''}`
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      console.error('Backend rejected update user:', errorData);
      return NextResponse.json(
        errorData || { error: 'Failed to update user' },
        { status: response.status }
      );
    }

    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      return new NextResponse(null, { status: response.status });
    }

    const text = await response.text();
    const data = text ? JSON.parse(text) : null;
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error updating user:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
