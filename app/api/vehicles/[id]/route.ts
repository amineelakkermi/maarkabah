import { NextRequest, NextResponse } from 'next/server';
import { getAccessTokenFromRequest } from '@/lib/auth-cookies';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const vehicleId = Number((await params).id);
  if (isNaN(vehicleId) || vehicleId <= 0) {
    return NextResponse.json(
      { error: 'Invalid vehicle id' },
      { status: 400 }
    );
  }

  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://139.59.140.232'}/api/vehicles/${vehicleId}`, {
      method: 'GET',
      headers: {
 'Authorization': `Bearer ${getAccessTokenFromRequest(request) || ''}`
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      return NextResponse.json(
        { error: errorData?.message || 'Failed to fetch vehicle' },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching vehicle:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const vehicleId = Number((await params).id);
  if (isNaN(vehicleId) || vehicleId <= 0) {
    return NextResponse.json(
      { error: 'Invalid vehicle id' },
      { status: 400 }
    );
  }

  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://139.59.140.232'}/api/vehicles/${vehicleId}`, {
      method: 'DELETE',
      headers: {
 'Authorization': `Bearer ${getAccessTokenFromRequest(request) || ''}`
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      return NextResponse.json(
        { error: errorData?.message || 'Failed to delete vehicle' },
        { status: response.status }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting vehicle:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
