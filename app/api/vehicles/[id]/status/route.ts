import { NextRequest } from 'next/server';
import { forwardRequest } from '@/app/api/_proxy';

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return forwardRequest(request, `/api/vehicles/${id}/status`, 'PUT', true);
}
