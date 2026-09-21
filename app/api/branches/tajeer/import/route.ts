import { NextRequest } from 'next/server';
import { forwardRequest } from '../../../_proxy';

export async function POST(request: NextRequest) {
  return forwardRequest(request, '/api/branches/tajeer/import', 'POST', true);
}