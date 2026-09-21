import { NextRequest } from 'next/server';
import { forwardRequest } from '../../_proxy';

export async function GET(request: NextRequest) {
  return forwardRequest(request, '/api/late-returns/stats', 'GET');
}