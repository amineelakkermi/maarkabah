import { NextRequest } from 'next/server';
import { forwardContractRequest } from '../../../_proxy';

type RouteContext = {
  params: Promise<{ vehicleId: string }>;
};

export async function GET(request: NextRequest, context: RouteContext) {
  const { vehicleId } = await context.params;
  return forwardContractRequest(request, `/api/contracts/tajeer/saved-by-plate/${vehicleId}`, 'GET');
}