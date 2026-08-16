import { NextRequest, NextResponse } from 'next/server';
import { getAccessTokenFromRequest } from '@/lib/auth-cookies';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const roleId = Number(id);
  if (isNaN(roleId) || roleId <= 0) {
    return NextResponse.json(
      { error: 'Invalid role id' },
      { status: 400 }
    );
  }

  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://139.59.140.232'}/api/tenant/roles/${roleId}`, {
      method: 'GET',
      headers: {
      'Authorization': `Bearer ${getAccessTokenFromRequest(request) || ''}`
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      return NextResponse.json(
        { error: errorData?.message || 'Failed to fetch role' },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching role:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const roleId = Number(id);
  if (isNaN(roleId) || roleId <= 0) {
    return NextResponse.json(
      { error: 'Invalid role id' },
      { status: 400 }
    );
  }

  try {
    const body = await request.json();

    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://139.59.140.232'}/api/tenant/roles/${roleId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      'Authorization': `Bearer ${getAccessTokenFromRequest(request) || ''}`
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      return NextResponse.json(
        { error: errorData?.message || 'Failed to update role' },
        { status: response.status }
      );
    }

    const text = await response.text();
    const data = text ? JSON.parse(text) : { success: true };
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error updating role:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const roleId = Number(id);
  if (isNaN(roleId) || roleId <= 0) {
    return NextResponse.json(
      { error: 'Invalid role id' },
      { status: 400 }
    );
  }

  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://139.59.140.232'}/api/tenant/roles/${roleId}`, {
      method: 'DELETE',
      headers: {
      'Authorization': `Bearer ${getAccessTokenFromRequest(request) || ''}`
      },
    });

    const responseText = await response.text();

    if (!response.ok) {
      let errorData = null;
      try { errorData = responseText ? JSON.parse(responseText) : null; } catch {}
      console.error('Role delete failed:', { status: response.status, body: responseText });
      return NextResponse.json(
        {
          error: errorData?.message || errorData?.title || errorData?.error || responseText || 'Failed to delete role',
          errors: errorData?.errors,
          details: errorData,
        },
        { status: response.status }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting role:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
