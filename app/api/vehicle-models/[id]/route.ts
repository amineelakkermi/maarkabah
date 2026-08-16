import { NextRequest, NextResponse } from 'next/server';
import { getAccessTokenFromRequest } from '@/lib/auth-cookies';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const modelId = Number((await params).id);
  if (isNaN(modelId) || modelId <= 0) {
    return NextResponse.json(
      { error: 'Invalid vehicle model id' },
      { status: 400 }
    );
  }

  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://139.59.140.232'}/api/vehicle-models/${modelId}`, {
      method: 'GET',
      headers: {
'Authorization': `Bearer ${getAccessTokenFromRequest(request) || ''}`
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      return NextResponse.json(
        { error: errorData?.message || 'Failed to fetch vehicle model' },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching vehicle model:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const modelId = Number((await params).id);
  if (isNaN(modelId) || modelId <= 0) {
    return NextResponse.json(
      { error: 'Invalid vehicle model id' },
      { status: 400 }
    );
  }

  try {
    const body = await request.json();
    
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://139.59.140.232'}/api/vehicle-models/${modelId}`, {
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
        { error: errorData?.message || 'Failed to update vehicle model' },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error updating vehicle model:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const modelId = Number((await params).id);
  if (isNaN(modelId) || modelId <= 0) {
    return NextResponse.json(
      { error: 'Invalid vehicle model id' },
      { status: 400 }
    );
  }

  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://139.59.140.232'}/api/vehicle-models/${modelId}`, {
      method: 'DELETE',
      headers: {
'Authorization': `Bearer ${getAccessTokenFromRequest(request) || ''}`
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      return NextResponse.json(
        { error: errorData?.message || 'Failed to delete vehicle model' },
        { status: response.status }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting vehicle model:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
