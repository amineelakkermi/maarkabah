import { NextRequest } from 'next/server';
import { forwardContractRequest } from '../../_proxy';

export async function POST(request: NextRequest) {
  return forwardContractRequest(request, '/api/contracts/pending-returns/search', 'POST', true);
}