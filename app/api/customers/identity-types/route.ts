import { NextRequest, NextResponse } from "next/server";
import { getAccessTokenFromRequest } from '@/lib/auth-cookies';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://139.59.140.232';

export async function GET(request: NextRequest) {
  try {
    const token = getAccessTokenFromRequest(request);
    const headers: Record<string, string> = token
      ? { 'Authorization': `Bearer ${token}` }
      : {};

    const response = await fetch(`${BASE_URL}/api/customers/identity-types`, {
      method: 'GET',
      headers,
    });

    if (response.ok) {
      return NextResponse.json(await response.json());
    }

    console.warn('Backend identity-types returned 404; using static fallback.');
    return NextResponse.json([
      { id: 1, value: 1, nameEn: 'Saudi ID', nameAr: 'الهوية السعودية', name: 'Saudi ID' },
      { id: 2, value: 2, nameEn: 'Iqama', nameAr: 'الإقامة', name: 'Iqama' },
      { id: 3, value: 3, nameEn: 'Visitor', nameAr: 'زائر', name: 'Visitor' },
      { id: 4, value: 4, nameEn: 'GCC', nameAr: 'دول الخليج', name: 'GCC' },
    ]);
  } catch (error) {
    console.error('Error fetching identity types:', error);
    return NextResponse.json({ error: 'Failed to fetch identity types' }, { status: 500 });
  }
}
