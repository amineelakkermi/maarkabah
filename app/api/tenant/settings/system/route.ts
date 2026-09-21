import { NextRequest } from 'next/server';
import { forwardRequest } from '../../../_proxy';

export async function PUT(request: NextRequest) {
  return forwardRequest(request, '/api/tenant/settings/system', 'PUT', true);
}