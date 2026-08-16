# API Configuration Setup

## Environment Variables

Create a `.env.local` file in the root directory with the following variables:

```env
# API Base URL - Point to your Maarkbh.API backend
NEXT_PUBLIC_API_URL=http://localhost:5000
```

## Usage Example

### Authentication

```typescript
import { authService } from '@/lib/api-services';

// Login
const tokenResponse = await authService.login({
  grant_type: 'password',
  username: 'your-username',
  password: 'your-password',
});

// The token is automatically stored in the client
console.log('Access token:', tokenResponse.access_token);

// Logout
authService.logout();
```

### Customer Management

```typescript
import { customerService } from '@/lib/api-services';

// Search customers
const customers = await customerService.search({
  search: 'Ahmed',
  pageNumber: 1,
  pageSize: 10,
});

// Create customer
const newCustomer = await customerService.create({
  fullNameAr: 'أحمد محمد',
  phoneNumber: '+966501234567',
  identityType: 1, // Saudi
  national: {
    beneficiaryIdNumber: '1234567890',
    birthDate: '1990-01-01',
    isHijriBirthDate: false,
  },
});

// Verify customer
await customerService.verify(customerId);
```

### Vehicle Management

```typescript
import { vehicleService } from '@/lib/api-services';

// Search vehicles
const vehicles = await vehicleService.search({
  branchId: 1,
  status: 1, // Available
  pageNumber: 1,
  pageSize: 20,
});
```

### File Upload

```typescript
import { attachmentService } from '@/lib/api-services';

// Upload single file
const uploadedFile = await attachmentService.upload(file);

// Upload multiple files
const uploadedFiles = await attachmentService.uploadMultiple([file1, file2]);
```

## API Client Features

### Automatic Token Management

The API client automatically:
- Stores the JWT token in localStorage
- Includes the Bearer token in all authenticated requests
- Clears the token on logout

### Error Handling

All API calls throw `ApiError` with detailed information:

```typescript
import { ApiError } from '@/lib/api-client';

try {
  await customerService.create(customerData);
} catch (error) {
  if (error instanceof ApiError) {
    console.error('API Error:', error.message);
    console.error('Status:', error.status);
    console.error('Response:', error.response);
  }
}
```

### Request Options

You can customize requests using the base `apiClient`:

```typescript
import { apiClient } from '@/lib/api-client';

const response = await apiClient.request('/custom-endpoint', {
  method: 'POST',
  body: { data: 'value' },
  headers: { 'Custom-Header': 'value' },
  requiresAuth: true, // default
});
```

## Available Services

- `authService` - Authentication (login, logout)
- `accountService` - Account management (change password)
- `customerService` - Customer CRUD and KYC operations
- `branchService` - Branch management
- `countryService` - Country management
- `vehicleService` - Vehicle fleet management
- `attachmentService` - File upload/download
- `adminTenantService` - Multi-tenant admin operations
- `lookupService` - System lookups and reference data

## Type Safety

All services use TypeScript types defined in `api-types.ts`:

```typescript
import * as Types from '@/lib/api-types';

const customerData: Types.CreateCustomerCommand = {
  fullNameAr: 'اسم العميل',
  phoneNumber: '+966501234567',
  identityType: Types.IdentityType.Saudi,
  // ... other fields with full type safety
};
```

## Development Notes

1. The API base URL defaults to `http://localhost:5000` if not specified
2. All requests are JSON by default (except file uploads)
3. Pagination uses `pageNumber` and `pageSize` parameters
4. Most endpoints require authentication (Bearer JWT)
5. The client handles both JSON and FormData automatically

## Testing the Connection

To test if your API is accessible:

```typescript
import { authService } from '@/lib/api-services';

try {
  const response = await authService.login({
    grant_type: 'password',
    username: 'test',
    password: 'test',
  });
  console.log('API connection successful!');
} catch (error) {
  console.error('API connection failed:', error);
}
```
