import { NextRequest } from 'next/server';
import { forwardRequest } from '../../../_proxy';

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  return forwardRequest(request, `/api/pricing/discount-rates/${id}`, 'GET');
}

export async function PUT(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  return forwardRequest(request, `/api/pricing/discount-rates/${id}`, 'PUT', true);
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  return forwardRequest(request, `/api/pricing/discount-rates/${id}`, 'DELETE');
}