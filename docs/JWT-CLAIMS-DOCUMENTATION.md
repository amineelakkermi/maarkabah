# JWT Token Claims Documentation

## Overview

This document documents all JWT claims returned by the Maarkbh backend in the `id_token` and maps them to the application's user model.

---

## JWT Claims in id_token

### Standard JWT Claims

| Claim | Type | Example Value | Description |
|-------|------|---------------|-------------|
| `iss` | string | `"http://139.59.140.232/"` | Issuer - The URL of the authentication server |
| `sub` | string | `"1"` | Subject - User ID (unique identifier) |
| `iat` | number | `1785536733` | Issued At - Unix timestamp when token was created |
| `exp` | number | `1785537933` | Expiration - Unix timestamp when token expires |

### Standard OpenID Connect Claims

| Claim | Type | Example Value | Description |
|-------|------|---------------|-------------|
| `name` | string | `"admin@maarkbh.com"` | Username/Email - The user's login identifier |
| `email` | string | `"admin@maarkbh.com"` | Email address - The user's email |

### Custom Maarkbh Claims

| Claim | Type | Example Value | Description |
|-------|------|---------------|-------------|
| `full_name` | string | `"System Administrator"` | Full display name - The user's complete name |
| `oi_au_id` | string | `"25"` | OpenIddict Authorization ID - Internal authorization identifier |
| `at_hash` | string | `"4lEkte8lcNsooDWagvmxRA"` | Access Token hash - Hash of the access token |
| `oi_tkn_id` | string | `"75"` | OpenIddict Token ID - Internal token identifier |

---

## Mapping to Application UserProfile

### UserProfile Model

```typescript
interface UserProfile {
  name: string;           // ✅ Mapped from full_name or name
  initials: string;       // ✅ Derived from full_name
  phone: string;          // ❌ NOT in JWT - needs API call
  branch: string;         // ❌ NOT in JWT - needs API call
  branchAr: string;       // ❌ NOT in JWT - needs API call
  roleLabel: string;      // ✅ Derived from selected role
  roleLabelAr: string;    // ✅ Derived from selected role
  operatorId: string;     // ✅ Mapped from oi_au_id or sub
}
```

### Claim → Field Mapping

| UserProfile Field | JWT Claim(s) | Status |
|-------------------|--------------|--------|
| `name` | `full_name` → `name` | ✅ Complete |
| `initials` | Derived from `full_name` | ✅ Complete |
| `phone` | Not available | ❌ Missing |
| `branch` | Not available | ❌ Missing |
| `branchAr` | Not available | ❌ Missing |
| `roleLabel` | Derived from UI selection | ✅ Complete |
| `roleLabelAr` | Derived from UI selection | ✅ Complete |
| `operatorId` | `oi_au_id` → `sub` | ✅ Complete |

---

## Missing User Information

### Currently Missing from JWT

The following user information is **NOT** available in the JWT token and must be fetched from the API:

1. **Phone Number** (`phone`)
   - Current fallback: `"+966 50 123 4567"`
   - Needs: API endpoint to fetch user profile

2. **Branch Name** (`branch`)
   - Current fallback: `"Headquarters"`
   - Needs: API endpoint to fetch user's assigned branch

3. **Branch Name (Arabic)** (`branchAr`)
   - Current fallback: `"المقر الرئيسي"`
   - Needs: API endpoint to fetch user's assigned branch

---

## Recommended API Endpoints

Based on the swagger.json, the following endpoints may provide the missing user information:

### User Profile Endpoints

1. **GET /api/tenant/users**
   - May return user details including phone and branch assignment
   - Requires authentication (Bearer token)

2. **GET /api/account/profile** (if available)
   - May return current user's profile information
   - Requires authentication

3. **GET /api/tenant/branches**
   - Returns branch information
   - Can be used to map branch IDs to names

### Implementation Suggestion

```typescript
// Fetch complete user profile after login
async function fetchUserProfile(userId: string): Promise<UserProfile> {
  const response = await apiClient.request(`/api/tenant/users/${userId}`);
  return {
    ...mapAuthUserToProfile(decodedToken, role),
    phone: response.phone_number,
    branch: response.branch_name,
    branchAr: response.branch_name_ar,
  };
}
```

---

## Token Expiration Management

The JWT token has a 30-minute expiration time (`expires_in: 1800` seconds).

### Current Implementation

- Token expiration is checked via `isTokenExpired(authUser)`
- Time remaining can be checked via `getTokenTimeRemaining(authUser)`

### Recommended Enhancement

Implement automatic token refresh using the `refresh_token`:

```typescript
// Refresh token before expiration
if (getTokenTimeRemaining(authUser) < 300) { // 5 minutes remaining
  await refreshAccessToken();
}
```

---

## Summary

### ✅ Available from JWT
- User ID (`sub`, `oi_au_id`)
- Username/Email (`name`, `email`)
- Full Name (`full_name`)
- Token metadata (`iss`, `iat`, `exp`, `at_hash`, `oi_tkn_id`)

### ❌ Missing from JWT (Requires API)
- Phone number
- Branch assignment
- Branch name (Arabic/English)

### 📋 Next Steps
1. Implement API call to fetch complete user profile after login
2. Store complete profile in UserContext
3. Implement automatic token refresh mechanism
4. Add error handling for missing profile data
