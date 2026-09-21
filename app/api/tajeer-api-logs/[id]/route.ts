import { NextRequest } from 'next/server';
import { forwardRequest } from '../../_proxy';

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  return forwardRequest(request, `/api/tajeer-api-logs/${id}`, 'GET');
}