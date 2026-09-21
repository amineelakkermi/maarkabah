import { NextRequest } from 'next/server';
import { forwardContractRequest } from '../../../_proxy';

type RouteContext = {
  params: Promise<{ name: string }>;
};

export async function GET(request: NextRequest, context: RouteContext) {
  const { name } = await context.params;
  return forwardContractRequest(request, `/api/contracts/tajeer/lookups/${name}`, 'GET');
}