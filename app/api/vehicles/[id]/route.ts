import { NextRequest } from 'next/server';
import { forwardRequest } from '@/app/api/_proxy';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return forwardRequest(request, `/api/vehicles/${id}`, 'GET');
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return forwardRequest(request, `/api/vehicles/${id}`, 'DELETE');
}
