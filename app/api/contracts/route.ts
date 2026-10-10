import { NextRequest, NextResponse } from 'next/server';
import { forwardContractRequest } from './_proxy';
import { getAccessTokenFromRequest } from '@/lib/auth-cookies';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://139.59.140.232';
const VEHICLE_STATUS_AVAILABLE = 2;

export async function POST(request: NextRequest) {
  // Server-side availability guard — a disabled button is trivially bypassed
  // via DevTools, so the contract-create route itself refuses to attach a
  // vehicle whose backend status isn't Available(2) (Rented/Overdue/
  // Maintenance/Reserved/Inactive/Draft). Fail-open only when the check
  // can't run (unparseable body, unreachable backend) — the upstream API
  // remains the authority on schema and business validation.
  try {
    const bodyText = await request.clone().text();
    const vehicleId = Number(bodyText ? JSON.parse(bodyText)?.vehicleId : undefined);
    if (Number.isFinite(vehicleId) && vehicleId > 0) {
      const res = await fetch(`${API_BASE_URL}/api/vehicles/${vehicleId}`, {
        headers: { Authorization: `Bearer ${getAccessTokenFromRequest(request) || ''}` },
      });
      if (res.ok) {
        const vehicle = await res.json();
        const status = Number(vehicle?.tajeerStatus?.status ?? vehicle?.status);
        if (status !== VEHICLE_STATUS_AVAILABLE) {
          console.log(`[CONTRACT CREATE] Rejected — vehicle ${vehicleId} status ${status} (not Available)`);
          return NextResponse.json(
            { code: 'Contract.VehicleUnavailable', error: 'Vehicle is not available for rental' },
            { status: 400 }
          );
        }
      }
    }
  } catch { /* fail-open — the backend validates the payload too */ }

  return forwardContractRequest(request, '/api/contracts', 'POST', true);
}
