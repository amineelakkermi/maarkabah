import { NextRequest, NextResponse } from 'next/server';
import { getAccessTokenFromRequest } from '@/lib/auth-cookies';

async function proxy(request: NextRequest, id: string, method: 'GET' | 'PUT' | 'DELETE') {
  try {
    const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://139.59.140.232';
    const body = method === 'PUT' ? await request.text() : undefined;
    const response = await fetch(`${API_BASE_URL}/api/rent-policies/${id}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getAccessTokenFromRequest(request) || ''}`,
      },
      body,
    });
    const text = await response.text();
    const data = text ? JSON.parse(text) : null;
    if (!response.ok) return NextResponse.json(data || { error: response.statusText }, { status: response.status });
    return data == null ? new NextResponse(null, { status: response.status }) : NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error(`${method} rent policy error:`, error);
    return NextResponse.json({ error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return proxy(request, (await params).id, 'GET');
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return proxy(request, (await params).id, 'PUT');
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return proxy(request, (await params).id, 'DELETE');
}
