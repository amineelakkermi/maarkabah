import { NextRequest } from 'next/server';
import { forwardRequest } from '../../_proxy';

export async function GET(request: NextRequest) {
  return forwardRequest(request, '/api/pricing/dispute-policy', 'GET');
}

export async function PUT(request: NextRequest) {
  return forwardRequest(request, '/api/pricing/dispute-policy', 'PUT', true);
}