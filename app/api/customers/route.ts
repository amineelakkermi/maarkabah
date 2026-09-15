import { NextRequest, NextResponse } from 'next/server';
import { getAccessTokenFromRequest } from '@/lib/auth-cookies';
import { backendFetch, isBackendUnavailable } from '@/lib/backend-fetch';

const API_BASE_URL = (process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://139.59.140.232').replace(/\/$/, '');

function getIdentityKey(body: any): { identityType?: number; idNumber?: string } | null {
  const identityType = body?.identityType;
  if (!identityType) return null;

  switch (identityType) {
    case 1:
      return { identityType, idNumber: body.national?.beneficiaryIdNumber };
    case 2:
      return { identityType, idNumber: body.residence?.beneficiaryIdNumber };
    case 3:
      return {
        identityType,
        idNumber: body.visitor?.passportNumber,
      };
    case 4:
      return { identityType, idNumber: body.gulf?.beneficiaryIdNumber };
    default:
      return { identityType, idNumber: undefined };
  }
}

function normalizeId(value: string | undefined | null): string {
  return (value ?? '').toString().trim();
}

function extractIdentityNumber(item: any, identityType: number): string {
  switch (identityType) {
    case 1:
      return normalizeId(item.national?.beneficiaryIdNumber ?? item.beneficiaryIdNumber);
    case 2:
      return normalizeId(item.residence?.beneficiaryIdNumber ?? item.beneficiaryIdNumber);
    case 3:
      return normalizeId(item.visitor?.passportNumber ?? item.passportNumber);
    case 4:
      return normalizeId(item.gulf?.beneficiaryIdNumber ?? item.beneficiaryIdNumber);
    default:
      return '';
  }
}

async function findExistingCustomer(request: NextRequest, identityType: number, idNumber: string): Promise<any | null> {
  if (!idNumber) return null;

  try {
    const searchResponse = await backendFetch(
      '/api/customers/search',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getAccessTokenFromRequest(request) || ''}`,
        },
        body: JSON.stringify({
          search: idNumber,
          identityType,
          pageNumber: 1,
          pageSize: 20,
        }),
      },
      { retry: true }
    );

    if (!searchResponse.ok) return null;

    const searchData = await searchResponse.json().catch(() => null);
    const items = searchData?.items ?? searchData?.data?.items ?? searchData?.data ?? searchData?.result ?? [];
    if (!Array.isArray(items)) return null;

    const normalizedId = normalizeId(idNumber);
    return (
      items.find((item: any) => {
        const itemIdentityType = item.identityType ?? item.idType;
        if (itemIdentityType !== identityType) return false;
        const itemIdNumber = extractIdentityNumber(item, identityType);
        return itemIdNumber && itemIdNumber === normalizedId;
      }) ?? null
    );
  } catch {
    // If the search fails, do not block creation; the backend remains the final gatekeeper.
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Backend-level duplicate guard: prevent creating a new master file when
    // a customer already exists with the same identity type + number.
    const identityKey = getIdentityKey(body);
    if (identityKey?.identityType && identityKey.idNumber) {
      const existing = await findExistingCustomer(request, identityKey.identityType, identityKey.idNumber);
      if (existing) {
        return NextResponse.json(
          {
            error: 'Customer already exists',
            message: 'A customer with the same identity type and number already exists.',
            existingCustomer: existing,
          },
          { status: 409 }
        );
      }
    }

    // Forward the request to the backend
    const response = await fetch(`${API_BASE_URL}/api/customers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getAccessTokenFromRequest(request) || ''}`,
      },
      body: JSON.stringify(body),
    });

    const text = await response.text();
    const data = text ? JSON.parse(text) : null;

    if (!response.ok) {
      return NextResponse.json(data || { error: response.statusText }, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Customer creation error:', error);
    return NextResponse.json(
      {
        error: isBackendUnavailable(error) ? 'Backend service unavailable' : 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: isBackendUnavailable(error) ? 503 : 500 }
    );
  }
}
