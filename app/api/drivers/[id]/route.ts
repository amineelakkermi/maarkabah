import { NextRequest, NextResponse } from 'next/server';
import { getAccessTokenFromRequest } from '@/lib/auth-cookies';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://139.59.140.232';

    const response = await fetch(`${API_BASE_URL}/api/drivers/${id}`, {
      method: 'GET',
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
    console.error('Get driver error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();

    const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://139.59.140.232';

    const response = await fetch(`${API_BASE_URL}/api/drivers/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getAccessTokenFromRequest(request) || ''}`,
      },
      body: JSON.stringify(body),
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
    console.error('Update driver error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://139.59.140.232';

    const response = await fetch(`${API_BASE_URL}/api/drivers/${id}`, {
      method: 'DELETE',
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
    console.error('Delete driver error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
