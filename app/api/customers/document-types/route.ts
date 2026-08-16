import { NextRequest, NextResponse } from "next/server";
import { getAccessTokenFromRequest } from '@/lib/auth-cookies';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://139.59.140.232';

export async function GET(request: NextRequest) {
  try {
    const token = getAccessTokenFromRequest(request);
    const headers: Record<string, string> = token
      ? { 'Authorization': `Bearer ${token}` }
      : {};

    const primary = await fetch(`${BASE_URL}/api/customers/document-types`, {
      method: 'GET',
      headers,
    });

    if (primary.ok) {
      return NextResponse.json(await primary.json());
    }

    // Fallback to identity-types when document-types is unavailable (404 or otherwise)
    const fallback = await fetch(`${BASE_URL}/api/customers/identity-types`, {
      method: 'GET',
      headers,
    });

    if (fallback.ok) {
      return NextResponse.json(await fallback.json());
    }

    // Neither upstream endpoint is implemented on this backend instance.
    // Return a static fallback so the customer forms still work.
    console.warn('Backend document-types and identity-types both returned 404; using static fallback.');
    return NextResponse.json([
      { id: 1, value: 1, nameEn: 'Identity Document', nameAr: 'وثيقة الهوية', name: 'Identity Document' },
      { id: 2, value: 2, nameEn: 'Driving License', nameAr: 'رخصة القيادة', name: 'Driving License' },
      { id: 3, value: 3, nameEn: 'Passport', nameAr: 'جواز السفر', name: 'Passport' },
      { id: 4, value: 4, nameEn: 'Other', nameAr: 'أخرى', name: 'Other' },
    ]);
  } catch (error) {
    console.error('Error fetching document types:', error);
    return NextResponse.json({ error: 'Failed to fetch document types' }, { status: 500 });
  }
}
