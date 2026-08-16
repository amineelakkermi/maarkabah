import { NextRequest, NextResponse } from 'next/server';
import { getAccessTokenFromRequest, getIdTokenFromRequest, decodeJwtPayload } from '@/lib/auth-cookies';

// Returns whether the current request carries a valid session, plus the
// decoded (non-sensitive) user claims. The client can no longer read the
// tokens directly (HttpOnly), so this endpoint is how AuthContext bootstraps
// its "isLoggedIn" state on page load.
export async function GET(request: NextRequest) {
  const accessToken = getAccessTokenFromRequest(request);

  if (!accessToken) {
    return NextResponse.json({ isLoggedIn: false, user: null }, { status: 200 });
  }

  const idToken = getIdTokenFromRequest(request);
  const user = idToken ? decodeJwtPayload(idToken) : null;

  return NextResponse.json({ isLoggedIn: true, user });
}
