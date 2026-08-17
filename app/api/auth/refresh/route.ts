import { NextRequest, NextResponse } from 'next/server';
import { setAuthCookies, clearAuthCookies, getRefreshTokenFromRequest, decodeJwtPayload } from '@/lib/auth-cookies';

export async function POST(request: NextRequest) {
  try {
    // The refresh token now lives only in an HttpOnly cookie, never sent by
    // client-side JS. We read it here on the server instead of the request body.
    const refreshToken = getRefreshTokenFromRequest(request);
    if (!refreshToken) {
      return NextResponse.json({ error: 'No refresh token' }, { status: 401 });
    }

    const formData = new URLSearchParams();
    formData.append('grant_type', 'refresh_token');
    formData.append('refresh_token', refreshToken);

    // Use environment variable for API base URL, fallback to localhost or production
    const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://139.59.140.232';
    
    // Forward the request to the backend
    const response = await fetch(`${API_BASE_URL}/connect/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
    });

    const data = await response.json();
    
    if (!response.ok) {
      // Refresh token is dead (expired/revoked): clear cookies so the client
      // guard treats the user as logged out instead of retrying forever.
      const res = NextResponse.json(data, { status: response.status });
      await clearAuthCookies(res, request);
      return res;
    }

    const user = data.id_token ? decodeJwtPayload(data.id_token) : null;
    const res = NextResponse.json({ success: true, user });
    await setAuthCookies(res, {
      accessToken: data.access_token,
      refreshToken: data.refresh_token || refreshToken,
      idToken: data.id_token,
      expiresIn: data.expires_in,
    }, request);
    return res;
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
