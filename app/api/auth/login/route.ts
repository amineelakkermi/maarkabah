import { NextRequest, NextResponse } from 'next/server';
import { setAuthCookies, decodeJwtPayload } from '@/lib/auth-cookies';

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    
    // Use environment variable for API base URL, fallback to localhost or production
    const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://139.59.140.232';
    
    // Forward the request to the backend
    const response = await fetch(`${API_BASE_URL}/connect/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body,
    });

    const data = await response.json();
    
    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }

    // Never expose raw tokens to client-side JS: store them as HttpOnly cookies
    // and only return the decoded (non-sensitive) user claims.
    const user = data.id_token ? decodeJwtPayload(data.id_token) : null;
    const res = NextResponse.json({ success: true, user });
    setAuthCookies(res, {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      idToken: data.id_token,
      expiresIn: data.expires_in,
    }, request);
    return res;
  } catch (error) {
    console.error('❌ Login route error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
