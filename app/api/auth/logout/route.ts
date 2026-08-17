import { NextRequest, NextResponse } from 'next/server';
import { clearAuthCookies } from '@/lib/auth-cookies';

export async function POST(request: NextRequest) {
  const res = NextResponse.json({ success: true });
  await clearAuthCookies(res, request);
  return res;
}
