import { NextRequest } from 'next/server';
import { forwardContractRequest } from '../../../_proxy';

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  return forwardContractRequest(request, `/api/contracts/${id}/tajeer/validate`, 'POST', true);
}