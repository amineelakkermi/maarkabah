// ─────────────────────────────────────────────────────────────
//  Maarkbh · مركبة — API Services
//  Service layer for API endpoints organized by module
// ─────────────────────────────────────────────────────────────

import { apiClient } from './api-client';
import * as Types from './api-types';

// ─── Authorization Service ─────────────────────────────────────
// Tokens are stored as HttpOnly cookies set by the Next.js route handlers
// (app/api/auth/login|refresh|logout|me). This service never sees or stores
// raw tokens — it only receives the decoded (non-sensitive) user claims.

export interface AuthSessionResponse {
  success: boolean;
  user: Record<string, any> | null;
}

export const authService = {
  /**
   * Authenticate user. The server sets HttpOnly cookies (access/refresh/id
   * token) and returns only the decoded user claims.
   * POST /connect/token (proxied)
   */
  async login(credentials: Types.TokenRequest): Promise<AuthSessionResponse> {
    const formData = new URLSearchParams();
    formData.append('grant_type', credentials.grant_type);
    formData.append('username', credentials.username);
    formData.append('password', credentials.password);

    // Use Next.js API route as proxy to avoid CORS
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      throw new Error(errorData?.error_description || errorData?.error || errorData?.details || 'Authentication failed');
    }

    return response.json();
  },

  /**
   * Logout user: clears the HttpOnly auth cookies server-side.
   */
  async logout(): Promise<void> {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' }).catch(() => {});
  },

  /**
   * Fetches the current session state (isLoggedIn + decoded user claims)
   * from the server, since the client can no longer read the cookies directly.
   */
  async getSession(): Promise<{ isLoggedIn: boolean; user: Record<string, any> | null }> {
    const response = await fetch('/api/auth/me', { credentials: 'include' });
    if (!response.ok) return { isLoggedIn: false, user: null };
    return response.json();
  },

  /**
   * Refresh access token using the HttpOnly refresh-token cookie.
   * POST /connect/token (proxied)
   */
  async refreshToken(): Promise<AuthSessionResponse> {
    const response = await fetch('/api/auth/refresh', { method: 'POST', credentials: 'include' });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      throw new Error(errorData?.error_description || errorData?.error || 'Token refresh failed');
    }

    return response.json();
  },
};

// ─── Account Service ───────────────────────────────────────────

export const accountService = {
  /**
   * Change user password
   * POST /api/account/change-password
   */
  async changePassword(request: Types.ChangePasswordRequest): Promise<void> {
    // Same-origin request: the HttpOnly access-token cookie is sent automatically.
    const response = await fetch('/api/account/change-password', {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      throw new Error(errorData?.error || 'Failed to change password');
    }
  },
};

// ─── Customer Service ───────────────────────────────────────────

export const customerService = {
  /**
   * Search customers
   * POST /api/customers/search
   */
  async search(request: Types.CustomerSearchRequest): Promise<any> {
    return apiClient.request('/customers/search', {
      method: 'POST',
      body: request,
    });
  },

  /**
   * Get customer by ID
   * GET /api/customers/{id}
   */
  async getById(id: number): Promise<any> {
    return apiClient.request(`/customers/${id}`, {
      method: 'GET',
    });
  },

  /**
   * Create new customer
   * POST /api/customers
   */
  async create(request: Types.CreateCustomerCommand): Promise<any> {
    return apiClient.request('/customers', {
      method: 'POST',
      body: request,
    });
  },

  /**
   * Update customer
   * PUT /api/customers/{id}
   */
  async update(id: number, request: Types.UpdateCustomerRequest): Promise<any> {
    return apiClient.request(`/customers/${id}`, {
      method: 'PUT',
      body: request,
    });
  },

  /**
   * Delete customer
   * DELETE /api/customers/{id}
   */
  async delete(id: number): Promise<void> {
    await apiClient.request(`/customers/${id}`, {
      method: 'DELETE',
    });
  },

  /**
   * Get identity types
   * GET /api/customers/identity-types
   */
  async getIdentityTypes(): Promise<any> {
    return apiClient.request('/customers/identity-types', {
      method: 'GET',
    });
  },

  /**
   * Get verification statuses
   * GET /api/customers/verification-statuses
   */
  async getVerificationStatuses(): Promise<any> {
    return apiClient.request('/customers/verification-statuses', {
      method: 'GET',
    });
  },

  /**
   * Get tajeer statuses
   * GET /api/customers/tajeer-statuses
   */
  async getTajeerStatuses(): Promise<any> {
    return apiClient.request('/customers/tajeer-statuses', {
      method: 'GET',
    });
  },

  /**
   * Get document types
   * GET /api/customers/document-types
   */
  async getDocumentTypes(): Promise<any> {
    return apiClient.request('/customers/document-types', {
      method: 'GET',
    });
  },

  /**
   * Verify customer
   * POST /api/customers/{id}/verification/verify
   */
  async verify(id: number): Promise<void> {
    await apiClient.request(`/customers/${id}/verification/verify`, {
      method: 'POST',
    });
  },

  /**
   * Reject customer verification
   * POST /api/customers/{id}/verification/reject
   */
  async rejectVerification(id: number, request: Types.CustomerReasonRequest): Promise<void> {
    await apiClient.request(`/customers/${id}/verification/reject`, {
      method: 'POST',
      body: request,
    });
  },

  /**
   * Add customer to blacklist
   * POST /api/customers/{id}/blacklist
   */
  async addToBlacklist(id: number, request: Types.CustomerReasonRequest): Promise<void> {
    await apiClient.request(`/customers/${id}/blacklist`, {
      method: 'POST',
      body: request,
    });
  },

  /**
   * Remove customer from blacklist
   * DELETE /api/customers/{id}/blacklist
   */
  async removeFromBlacklist(id: number): Promise<void> {
    await apiClient.request(`/customers/${id}/blacklist`, {
      method: 'DELETE',
    });
  },
};

// ─── Blacklist Service ────────────────────────────────────────────

export const blacklistService = {
  /**
   * Search network-wide blacklist entries
   * POST /api/blacklist/search
   */
  async search(request: { search?: string; pageNumber?: number; pageSize?: number }): Promise<any> {
    return apiClient.request('/blacklist/search', {
      method: 'POST',
      body: request,
    });
  },

  /**
   * Get blacklist stats
   * GET /api/blacklist/stats
   */
  async getStats(): Promise<any> {
    return apiClient.request('/blacklist/stats', {
      method: 'GET',
    });
  },

  /**
   * Check if an identity is blacklisted
   * POST /api/blacklist/check
   */
  async check(request: { identityType?: number; idNumber?: string; phoneNumber?: string }): Promise<any> {
    return apiClient.request('/blacklist/check', {
      method: 'POST',
      body: request,
    });
  },

  /**
   * Report a renter to the network blacklist
   * POST /api/blacklist/report
   */
  async report(request: { identityType: number; idNumber: string; reason: string; phoneNumber?: string; fullNameAr?: string; fullNameEn?: string }): Promise<any> {
    return apiClient.request('/blacklist/report', {
      method: 'POST',
      body: request,
    });
  },

  /**
   * Get blacklist entry by ID
   * GET /api/blacklist/{id}
   */
  async getById(id: number | string): Promise<any> {
    return apiClient.request(`/blacklist/${id}`, {
      method: 'GET',
    });
  },
};

// ─── Branch Service ─────────────────────────────────────────────

export const branchService = {
  /**
   * Search branches
   * POST /api/branches/search
   */
  async search(request: Types.BranchSearchRequest): Promise<any> {
    return apiClient.request('/branches/search', {
      method: 'POST',
      body: request,
    });
  },

  /**
   * Get branch by ID
   * GET /api/branches/{id}
   */
  async getById(id: number): Promise<any> {
    return apiClient.request(`/branches/${id}`, {
      method: 'GET',
    });
  },

  /**
   * Create new branch
   * POST /api/branches
   */
  async create(request: Types.CreateBranchCommand): Promise<any> {
    return apiClient.request('/branches', {
      method: 'POST',
      body: request,
    });
  },

  /**
   * Update branch
   * PUT /api/branches/{id}
   */
  async update(id: number, request: Types.UpdateBranchRequest): Promise<any> {
    return apiClient.request(`/branches/${id}`, {
      method: 'PUT',
      body: request,
    });
  },

  /**
   * Delete branch
   * DELETE /api/branches/{id}
   */
  async delete(id: number): Promise<void> {
    await apiClient.request(`/branches/${id}`, {
      method: 'DELETE',
    });
  },
};

// ─── Country Service ────────────────────────────────────────────

export const countryService = {
  /**
   * Search countries
   * POST /api/countries/search
   */
  async search(request: Types.CountrySearchRequest): Promise<any> {
    return apiClient.request('/countries/search', {
      method: 'POST',
      body: request,
    });
  },

  /**
   * Create new country
   * POST /api/countries
   */
  async create(request: Types.CreateCountryRequest): Promise<any> {
    return apiClient.request('/api/countries', {
      method: 'POST',
      body: request,
    });
  },

  /**
   * Update country
   * PUT /api/countries/{id}
   */
  async update(id: number, request: Types.UpdateCountryRequest): Promise<any> {
    return apiClient.request(`/api/countries/${id}`, {
      method: 'PUT',
      body: request,
    });
  },

  /**
   * Delete country
   * DELETE /api/countries/{id}
   */
  async delete(id: number): Promise<void> {
    await apiClient.request(`/api/countries/${id}`, {
      method: 'DELETE',
    });
  },
};

// ─── Vehicle Service ────────────────────────────────────────────

export const vehicleService = {
  /**
   * Search vehicles
   * POST /api/vehicles/search
   */
  async search(request: Types.VehicleSearchRequest): Promise<any> {
    return apiClient.request('/vehicles/search', {
      method: 'POST',
      body: request,
    });
  },

  /**
   * Get vehicle by ID
   * GET /api/vehicles/{id}
   */
  async getById(id: number): Promise<any> {
    return apiClient.request(`/vehicles/${id}`, {
      method: 'GET',
    });
  },

  /**
   * Create new vehicle
   * POST /api/vehicles
   */
  async create(request: Types.VehicleRequest): Promise<any> {
    return apiClient.request('/vehicles', {
      method: 'POST',
      body: request,
    });
  },

  /**
   * Update existing vehicle
   * POST /api/vehicles (id: non-null) — same endpoint, distinguished by id in body.
   */
  async update(id: number, request: Types.VehicleRequest): Promise<any> {
    return apiClient.request('/vehicles', {
      method: 'POST',
      body: { ...request, id },
    });
  },

  /**
   * Search vehicle feature types
   * POST /api/vehicle-feature-types/search
   */
  async searchFeatureTypes(request: any = {}): Promise<any> {
    return apiClient.request('/vehicle-feature-types/search', {
      method: 'POST',
      body: request,
    });
  },

  /**
   * Search vehicles picker
   * POST /api/vehicles/picker
   */
  async picker(request: any): Promise<any> {
    return apiClient.request('/vehicles/picker', {
      method: 'POST',
      body: request,
    });
  },

  /**
   * Delete vehicle
   * DELETE /api/vehicles/{id}
   */
  async delete(id: number): Promise<void> {
    await apiClient.request(`/vehicles/${id}`, {
      method: 'DELETE',
    });
  },
};

// ─── Attachment Service ────────────────────────────────────────

export const attachmentService = {
  /**
   * Upload single file
   * POST /api/attachments/upload
   */
  async upload(file: File, branchId?: number): Promise<any> {
    const formData = new FormData();
    formData.append('file', file);

    const endpoint = branchId ? `/attachments/upload?branchId=${branchId}` : '/attachments/upload';
    return apiClient.request(endpoint, {
      method: 'POST',
      body: formData,
    });
  },

  /**
   * Upload multiple files
   * POST /api/attachments/upload-multi
   */
  async uploadMultiple(files: File[]): Promise<any> {
    const formData = new FormData();
    files.forEach(file => {
      formData.append('files', file);
    });

    return apiClient.request('/attachments/upload-multi', {
      method: 'POST',
      body: formData,
    });
  },

  /**
   * Get attachment by ID
   * GET /api/attachments/{id}
   */
  async getById(id: number): Promise<any> {
    return apiClient.request(`/attachments/${id}`, {
      method: 'GET',
    });
  },

  /**
   * Download attachment
   * GET /api/attachments/{id}/download
   */
  getDownloadUrl(id: number): string {
    return `/api/attachments/${id}/download`;
  },

  async download(id: number): Promise<Blob> {
    const response = await fetch(this.getDownloadUrl(id), { credentials: 'include' });

    if (!response.ok) {
      throw new Error('Download failed');
    }

    return response.blob();
  },
};

// ─── Admin Tenant Service ───────────────────────────────────────

export const adminTenantService = {
  /**
   * Get users for a tenant
   * GET /api/admin/tenants/{tenantId}/users
   */
  async getUsers(tenantId: number, pageNumber?: number, pageSize?: number): Promise<any> {
    const params: Record<string, number> = {};
    if (pageNumber !== undefined) params.PageNumber = pageNumber;
    if (pageSize !== undefined) params.PageSize = pageSize;

    return apiClient.request(`/api/admin/tenants/${tenantId}/users`, {
      method: 'GET',
      params,
    });
  },

  /**
   * Create user for a tenant
   * POST /api/admin/tenants/{tenantId}/users
   */
  async createUser(tenantId: number, request: Types.CreateTenantUserRequest): Promise<any> {
    return apiClient.request(`/api/admin/tenants/${tenantId}/users`, {
      method: 'POST',
      body: request,
    });
  },

  /**
   * Get user by ID
   * GET /api/admin/tenants/{tenantId}/users/{userId}
   */
  async getUserById(tenantId: number, userId: number): Promise<any> {
    return apiClient.request(`/api/admin/tenants/${tenantId}/users/${userId}`, {
      method: 'GET',
    });
  },

  /**
   * Update user
   * PUT /api/admin/tenants/{tenantId}/users/{userId}
   */
  async updateUser(tenantId: number, userId: number, request: Types.UpdateTenantUserRequest): Promise<any> {
    return apiClient.request(`/api/admin/tenants/${tenantId}/users/${userId}`, {
      method: 'PUT',
      body: request,
    });
  },

  /**
   * Get roles for a tenant
   * GET /api/admin/tenants/{tenantId}/roles
   */
  async getRoles(tenantId: number, pageNumber?: number, pageSize?: number): Promise<any> {
    const params: Record<string, number> = {};
    if (pageNumber !== undefined) params.PageNumber = pageNumber;
    if (pageSize !== undefined) params.PageSize = pageSize;

    return apiClient.request(`/api/admin/tenants/${tenantId}/roles`, {
      method: 'GET',
      params,
    });
  },
};

// ─── Vehicle Makes Service ───────────────────────────────────────

export const vehicleMakeService = {
  /**
   * Search vehicle makes
   * POST /api/vehicle-makes/search
   */
  async search(request: Types.VehicleLookupSearchRequest): Promise<any> {
    return apiClient.request('/vehicle-makes/search', {
      method: 'POST',
      body: request,
    });
  },

  /**
   * Create new vehicle make
   * POST /api/vehicle-makes
   */
  async create(request: Types.CreateVehicleLookupRequest): Promise<any> {
    return apiClient.request('/vehicle-makes', {
      method: 'POST',
      body: request,
    });
  },

  /**
   * Update vehicle make
   * PUT /api/vehicle-makes/{id}
   */
  async update(id: number, request: Types.UpdateVehicleLookupRequest): Promise<any> {
    return apiClient.request(`/vehicle-makes/${id}`, {
      method: 'PUT',
      body: request,
    });
  },

  /**
   * Delete vehicle make
   * DELETE /api/vehicle-makes/{id}
   */
  async delete(id: number): Promise<void> {
    await apiClient.request(`/vehicle-makes/${id}`, {
      method: 'DELETE',
    });
  },
};

// ─── Vehicle Models Service ──────────────────────────────────────

export const vehicleModelService = {
  /**
   * Search vehicle models
   * POST /api/vehicle-models/search
   */
  async search(request: Types.VehicleLookupSearchRequest): Promise<any> {
    return apiClient.request('/vehicle-models/search', {
      method: 'POST',
      body: request,
    });
  },

  /**
   * Create new vehicle model
   * POST /api/vehicle-models
   */
  async create(request: any): Promise<any> {
    return apiClient.request('/vehicle-models', {
      method: 'POST',
      body: request,
    });
  },

  /**
   * Update vehicle model
   * PUT /api/vehicle-models/{id}
   */
  async update(id: number, request: any): Promise<any> {
    return apiClient.request(`/vehicle-models/${id}`, {
      method: 'PUT',
      body: request,
    });
  },

  /**
   * Delete vehicle model
   * DELETE /api/vehicle-models/{id}
   */
  async delete(id: number): Promise<void> {
    await apiClient.request(`/vehicle-models/${id}`, {
      method: 'DELETE',
    });
  },
};

// ─── Plate Type Service ────────────────────────────────────────────

export const plateTypeService = {
  /**
   * Search plate types
   * POST /api/plate-types/search
   */
  async search(request: Types.VehicleLookupSearchRequest): Promise<any> {
    return apiClient.request('/plate-types/search', {
      method: 'POST',
      body: request,
    });
  },

  /**
   * Create new plate type
   * POST /api/plate-types
   */
  async create(request: Types.CreateVehicleLookupRequest): Promise<any> {
    return apiClient.request('/plate-types', {
      method: 'POST',
      body: request,
    });
  },

  /**
   * Update plate type
   * PUT /api/plate-types/{id}
   */
  async update(id: number, request: Types.UpdateVehicleLookupRequest): Promise<any> {
    return apiClient.request(`/plate-types/${id}`, {
      method: 'PUT',
      body: request,
    });
  },

  /**
   * Delete plate type
   * DELETE /api/plate-types/{id}
   */
  async delete(id: number): Promise<void> {
    await apiClient.request(`/plate-types/${id}`, {
      method: 'DELETE',
    });
  },
};

// ─── Insurance Company Service ─────────────────────────────────────

export const insuranceCompanyService = {
  /**
   * Search insurance companies
   * POST /api/insurance-companies/search
   */
  async search(request: Types.VehicleLookupSearchRequest): Promise<any> {
    return apiClient.request('/insurance-companies/search', {
      method: 'POST',
      body: request,
    });
  },

  /**
   * Create new insurance company
   * POST /api/insurance-companies
   */
  async create(request: Types.CreateVehicleLookupRequest): Promise<any> {
    return apiClient.request('/insurance-companies', {
      method: 'POST',
      body: request,
    });
  },

  /**
   * Update insurance company
   * PUT /api/insurance-companies/{id}
   */
  async update(id: number, request: Types.UpdateVehicleLookupRequest): Promise<any> {
    return apiClient.request(`/insurance-companies/${id}`, {
      method: 'PUT',
      body: request,
    });
  },

  /**
   * Delete insurance company
   * DELETE /api/insurance-companies/{id}
   */
  async delete(id: number): Promise<void> {
    await apiClient.request(`/insurance-companies/${id}`, {
      method: 'DELETE',
    });
  },
};

// ─── Insurance Type Service ─────────────────────────────────────────

export const insuranceTypeService = {
  /**
   * Search insurance types
   * POST /api/insurance-types/search
   */
  async search(request: Types.VehicleLookupSearchRequest): Promise<any> {
    return apiClient.request('/insurance-types/search', {
      method: 'POST',
      body: request,
    });
  },

  /**
   * Create new insurance type
   * POST /api/insurance-types
   */
  async create(request: Types.CreateVehicleLookupRequest): Promise<any> {
    return apiClient.request('/insurance-types', {
      method: 'POST',
      body: request,
    });
  },

  /**
   * Update insurance type
   * PUT /api/insurance-types/{id}
   */
  async update(id: number, request: Types.UpdateVehicleLookupRequest): Promise<any> {
    return apiClient.request(`/insurance-types/${id}`, {
      method: 'PUT',
      body: request,
    });
  },

  /**
   * Delete insurance type
   * DELETE /api/insurance-types/{id}
   */
  async delete(id: number): Promise<void> {
    await apiClient.request(`/insurance-types/${id}`, {
      method: 'DELETE',
    });
  },
};

// ─── Vehicle Feature Types Service ────────────────────────────────

export const vehicleFeatureTypeService = {
  /**
   * Search vehicle feature types
   * POST /api/vehicle-feature-types/search
   */
  async search(request: Types.VehicleLookupSearchRequest): Promise<any> {
    return apiClient.request('/vehicle-feature-types/search', {
      method: 'POST',
      body: request,
    });
  },

  /**
   * Create new vehicle feature type
   * POST /api/vehicle-feature-types
   */
  async create(request: Types.CreateVehicleLookupRequest): Promise<any> {
    return apiClient.request('/vehicle-feature-types', {
      method: 'POST',
      body: request,
    });
  },

  /**
   * Update vehicle feature type
   * PUT /api/vehicle-feature-types/{id}
   */
  async update(id: number, request: Types.UpdateVehicleLookupRequest): Promise<any> {
    return apiClient.request(`/vehicle-feature-types/${id}`, {
      method: 'PUT',
      body: request,
    });
  },

  /**
   * Delete vehicle feature type
   * DELETE /api/vehicle-feature-types/{id}
   */
  async delete(id: number): Promise<void> {
    await apiClient.request(`/vehicle-feature-types/${id}`, {
      method: 'DELETE',
    });
  },
};

// ─── Tenant Users Service ─────────────────────────────────────────

export const tenantUserService = {
  /**
   * Get tenant users
   * GET /api/tenant/users
   */
  async getUsers(pageNumber?: number, pageSize?: number): Promise<any> {
    const params: Record<string, number> = {};
    if (pageNumber !== undefined) params.PageNumber = pageNumber;
    if (pageSize !== undefined) params.PageSize = pageSize;

    return apiClient.request('/tenant/users', {
      method: 'GET',
      params,
    });
  },

  /**
   * Create tenant user
   * POST /api/tenant/users
   */
  async create(request: Types.CreateTenantUserRequest): Promise<any> {
    return apiClient.request('/tenant/users', {
      method: 'POST',
      body: request,
    });
  },

  /**
   * Get tenant user by ID
   * GET /api/tenant/users/{userId}
   */
  async getById(userId: number): Promise<any> {
    return apiClient.request(`/tenant/users/${userId}`, {
      method: 'GET',
    });
  },

  /**
   * Update tenant user
   * PUT /api/tenant/users/{userId}
   */
  async update(userId: number, request: Types.UpdateTenantUserRequest): Promise<any> {
    return apiClient.request(`/tenant/users/${userId}`, {
      method: 'PUT',
      body: request,
    });
  },

  /**
   * Activate tenant user
   * POST /api/tenant/users/{userId}/activate
   */
  async activate(userId: number): Promise<void> {
    await apiClient.request(`/tenant/users/${userId}/activate`, {
      method: 'POST',
    });
  },

  /**
   * Deactivate tenant user
   * POST /api/tenant/users/{userId}/deactivate
   */
  async deactivate(userId: number): Promise<void> {
    await apiClient.request(`/tenant/users/${userId}/deactivate`, {
      method: 'POST',
    });
  },

  /**
   * Reset tenant user password
   * POST /api/tenant/users/{userId}/reset-password
   */
  async resetPassword(userId: number, request: { newPassword: string }): Promise<void> {
    await apiClient.request(`/tenant/users/${userId}/reset-password`, {
      method: 'POST',
      body: request,
    });
  },
};

// ─── Tenant Roles Service ─────────────────────────────────────────

export const tenantRoleService = {
  /**
   * Search tenant roles
   * POST /api/tenant/roles/search
   */
  async search(request: any): Promise<any> {
    return apiClient.request('/tenant/roles/search', {
      method: 'POST',
      body: request,
    });
  },

  /**
   * Get tenant roles lookup (assignable role names)
   * GET /api/tenant/roles/lookup
   */
  async lookup(): Promise<any> {
    return apiClient.request('/tenant/roles/lookup', {
      method: 'GET',
    });
  },

  /**
   * Create tenant role
   * POST /api/tenant/roles
   */
  async create(request: any): Promise<any> {
    return apiClient.request('/tenant/roles', {
      method: 'POST',
      body: request,
    });
  },

  /**
   * Get tenant role by ID
   * GET /api/tenant/roles/{id}
   */
  async getById(id: number): Promise<any> {
    return apiClient.request(`/tenant/roles/${id}`, {
      method: 'GET',
    });
  },

  /**
   * Update tenant role
   * PUT /api/tenant/roles/{id}
   */
  async update(id: number, request: any): Promise<any> {
    return apiClient.request(`/tenant/roles/${id}`, {
      method: 'PUT',
      body: request,
    });
  },

  /**
   * Delete tenant role
   * DELETE /api/tenant/roles/{id}
   */
  async delete(id: number): Promise<void> {
    await apiClient.request(`/tenant/roles/${id}`, {
      method: 'DELETE',
    });
  },

  /**
   * Get permissions
   * GET /api/tenant/roles/get-permissions
   */
  async getPermissions(): Promise<any> {
    return apiClient.request('/tenant/roles/get-permissions', {
      method: 'GET',
    });
  },

  /**
   * Check if role name exists
   * GET /api/tenant/roles/name-exists/{name}/{roleId}
   */
  async nameExists(name: string, roleId: number): Promise<any> {
    return apiClient.request(`/tenant/roles/name-exists/${name}/${roleId}`, {
      method: 'GET',
    });
  },
};

// ─── Customer Cross-Tab Sync ───────────────────────────────────

const RELOAD_KEY = 'mk-customers-reload';

export const customerEvents = {
  /**
   * Notify all listening tabs/pages that customer data should reload.
   * Call this after create, update, delete, verify or reject.
   */
  reload() {
    if (typeof window === 'undefined') return;
    const now = Date.now().toString();
    try {
      localStorage.setItem(RELOAD_KEY, now);
    } catch {
      // ignore storage errors (private mode, etc.)
    }
    window.dispatchEvent(new CustomEvent('customers:reload'));
  },

  /**
   * Subscribe to reload events from any tab or the same page.
   * Returns an unsubscribe function.
   */
  onReload(callback: () => void): () => void {
    if (typeof window === 'undefined') return () => {};

    const storageHandler = (e: StorageEvent) => {
      if (e.key === RELOAD_KEY) callback();
    };
    const customHandler = () => callback();

    window.addEventListener('storage', storageHandler);
    window.addEventListener('customers:reload', customHandler);

    return () => {
      window.removeEventListener('storage', storageHandler);
      window.removeEventListener('customers:reload', customHandler);
    };
  },
};

// ─── Driver Cross-Tab Sync ─────────────────────────────────────

const DRIVER_RELOAD_KEY = 'mk-drivers-reload';

export const driverEvents = {
  /**
   * Notify all listening tabs/pages that driver data should reload.
   * Call this after create, update, delete, verify, reject, or blacklist changes.
   */
  reload() {
    if (typeof window === 'undefined') return;
    const now = Date.now().toString();
    try {
      localStorage.setItem(DRIVER_RELOAD_KEY, now);
    } catch {
      // ignore storage errors (private mode, etc.)
    }
    window.dispatchEvent(new CustomEvent('drivers:reload'));
  },

  /**
   * Subscribe to reload events from any tab or the same page.
   * Returns an unsubscribe function.
   */
  onReload(callback: () => void): () => void {
    if (typeof window === 'undefined') return () => {};

    const storageHandler = (e: StorageEvent) => {
      if (e.key === DRIVER_RELOAD_KEY) callback();
    };
    const customHandler = () => callback();

    window.addEventListener('storage', storageHandler);
    window.addEventListener('drivers:reload', customHandler);

    return () => {
      window.removeEventListener('storage', storageHandler);
      window.removeEventListener('drivers:reload', customHandler);
    };
  },
};

// ─── Lookup Service ─────────────────────────────────────────────

export const lookupService = {
  /**
   * Get lookup context
   * POST /api/lookups/context
   */
  async getContext(request: Types.SystemLookupContextRequest): Promise<any> {
    return apiClient.request('/lookups/context', {
      method: 'POST',
      body: request,
    });
  },
};

// ─── Additional Service Service ─────────────────────────────────

export const additionalServiceService = {
  /**
   * Search additional services
   * POST /api/additional-services/search
   */
  async search(request: Types.AdditionalServiceSearchRequest): Promise<any> {
    return apiClient.request('/additional-services/search', {
      method: 'POST',
      body: request,
    });
  },

  /**
   * Get active additional services for a branch (picker)
   * POST /api/additional-services/picker
   */
  async picker(request: Types.AdditionalServicePickerRequest): Promise<any> {
    return apiClient.request('/additional-services/picker', {
      method: 'POST',
      body: request,
    });
  },

  /**
   * Get additional service by ID
   * GET /api/additional-services/{id}
   */
  async getById(id: number | string): Promise<any> {
    return apiClient.request(`/additional-services/${id}`, {
      method: 'GET',
    });
  },

  /**
   * Create additional service
   * POST /api/additional-services
   */
  async create(request: Types.CreateAdditionalServiceCommand): Promise<any> {
    return apiClient.request('/additional-services', {
      method: 'POST',
      body: request,
    });
  },

  /**
   * Update additional service
   * PUT /api/additional-services/{id}
   */
  async update(id: number | string, request: Types.UpdateAdditionalServiceRequest): Promise<any> {
    return apiClient.request(`/additional-services/${id}`, {
      method: 'PUT',
      body: request,
    });
  },

  /**
   * Delete (soft-delete) additional service
   * DELETE /api/additional-services/{id}
   */
  async delete(id: number | string): Promise<void> {
    await apiClient.request(`/additional-services/${id}`, {
      method: 'DELETE',
    });
  },
};

// ─── Customer Warehouse Service ─────────────────────────────────

export const customerWarehouseService = {
  /**
   * Search the shared customer warehouse (masked results)
   * POST /api/customer-warehouse/inquiry
   */
  async inquiry(request: Types.CustomerWarehouseInquiryRequest): Promise<any> {
    return apiClient.request('/customer-warehouse/inquiry', {
      method: 'POST',
      body: request,
    });
  },

  /**
   * Get warehouse customer summary with per-office risk records
   * GET /api/customer-warehouse/{id}
   */
  async getSummary(warehouseCustomerId: number | string): Promise<any> {
    return apiClient.request(`/customer-warehouse/${warehouseCustomerId}`, {
      method: 'GET',
    });
  },

  /**
   * Import a warehouse identity as a local customer
   * POST /api/customer-warehouse/{id}/import
   */
  async importCustomer(warehouseCustomerId: number | string): Promise<any> {
    return apiClient.request(`/customer-warehouse/${warehouseCustomerId}/import`, {
      method: 'POST',
    });
  },

  /**
   * Get admin warehouse stats (SuperAdmin)
   * GET /api/admin/customer-warehouse/stats
   */
  async getAdminStats(): Promise<any> {
    return apiClient.request('/admin/customer-warehouse/stats', {
      method: 'GET',
    });
  },

  /**
   * Search warehouse with unmasked IDs (SuperAdmin)
   * POST /api/admin/customer-warehouse/search
   */
  async adminSearch(request: Types.CustomerWarehouseInquiryRequest): Promise<any> {
    return apiClient.request('/admin/customer-warehouse/search', {
      method: 'POST',
      body: request,
    });
  },

  /**
   * Download the blank Excel import template (SuperAdmin)
   * GET /api/admin/customer-warehouse/import/template
   */
  async downloadImportTemplate(): Promise<Blob> {
    const response = await fetch('/api/admin/customer-warehouse/import/template', {
      method: 'GET',
      credentials: 'include',
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      throw new Error(errorData?.error || 'Failed to download template');
    }
    return response.blob();
  },

  /**
   * Upload a filled Excel import template (SuperAdmin)
   * POST /api/admin/customer-warehouse/import/excel
   */
  async importExcel(file: File, sourceName?: string): Promise<any> {
    const formData = new FormData();
    formData.append('file', file);
    if (sourceName) formData.append('sourceName', sourceName);

    const response = await fetch('/api/admin/customer-warehouse/import/excel', {
      method: 'POST',
      credentials: 'include',
      body: formData,
    });

    const text = await response.text();
    const data = text ? JSON.parse(text) : null;

    if (!response.ok) {
      throw new Error(data?.error || data?.message || 'Failed to import Excel file');
    }
    return data;
  },
};

// ─── Driver Service ───────────────────────────────────────────────

export const driverService = {
  /**
   * Search drivers
   * POST /api/drivers/search
   */
  async search(request: { search?: string; identityType?: number | null; verificationStatus?: number | null; isBlacklisted?: boolean | null; isActive?: boolean | null; customerId?: number | string | null; pageNumber?: number; pageSize?: number }): Promise<any> {
    return apiClient.request('/drivers/search', {
      method: 'POST',
      body: request,
    });
  },

  /**
   * Get driver stats
   * GET /api/drivers/stats
   */
  async getStats(): Promise<any> {
    return apiClient.request('/drivers/stats', {
      method: 'GET',
    });
  },

  /**
   * Driver picker for contract selection
   * POST /api/drivers/picker
   */
  async picker(request: { search?: string; identityType?: number | null; pageNumber?: number; pageSize?: number }): Promise<any> {
    return apiClient.request('/drivers/picker', {
      method: 'POST',
      body: request,
    });
  },

  /**
   * Create a new driver
   * POST /api/drivers
   */
  async create(request: any): Promise<any> {
    return apiClient.request('/drivers', {
      method: 'POST',
      body: request,
    });
  },

  /**
   * Get driver by ID
   * GET /api/drivers/{id}
   */
  async getById(id: number | string): Promise<any> {
    return apiClient.request(`/drivers/${id}`, {
      method: 'GET',
    });
  },

  /**
   * Update driver
   * PUT /api/drivers/{id}
   */
  async update(id: number | string, request: any): Promise<any> {
    return apiClient.request(`/drivers/${id}`, {
      method: 'PUT',
      body: request,
    });
  },

  /**
   * Delete driver
   * DELETE /api/drivers/{id}
   */
  async delete(id: number | string): Promise<void> {
    await apiClient.request(`/drivers/${id}`, {
      method: 'DELETE',
    });
  },

  /**
   * Verify driver
   * POST /api/drivers/{id}/verification/verify
   */
  async verify(id: number | string): Promise<void> {
    await apiClient.request(`/drivers/${id}/verification/verify`, {
      method: 'POST',
    });
  },

  /**
   * Reject driver verification
   * POST /api/drivers/{id}/verification/reject
   */
  async rejectVerification(id: number | string, request: { reason: string }): Promise<void> {
    await apiClient.request(`/drivers/${id}/verification/reject`, {
      method: 'POST',
      body: request,
    });
  },

  /**
   * Add driver to blacklist
   * POST /api/drivers/{id}/blacklist
   */
  async addToBlacklist(id: number | string, request: { reason: string }): Promise<void> {
    await apiClient.request(`/drivers/${id}/blacklist`, {
      method: 'POST',
      body: request,
    });
  },

  /**
   * Remove driver from blacklist
   * DELETE /api/drivers/{id}/blacklist
   */
  async removeFromBlacklist(id: number | string): Promise<void> {
    await apiClient.request(`/drivers/${id}/blacklist`, {
      method: 'DELETE',
    });
  },
};
