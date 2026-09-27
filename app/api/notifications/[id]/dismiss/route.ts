import { NextRequest } from 'next/server';
import { forwardRequest } from '../../../_proxy';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return forwardRequest(request, `/api/notifications/${encodeURIComponent(id)}/dismiss`, 'POST');
}
