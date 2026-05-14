const BASE = process.env.NEXT_PUBLIC_BACKEND_URL ?? process.env.BACKEND_URL ?? 'http://localhost:3001';
if (typeof window !== 'undefined') console.log('[FIDELIO] BACKEND_URL =', BASE);

export class AuthError extends Error {
  constructor() { super('Unauthorized'); this.name = 'AuthError'; }
}

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, { credentials: 'include', ...options });
  if (res.status === 401) throw new AuthError();
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`API ${res.status}: ${text}`);
  }
  return res.json() as Promise<T>;
}

function jsonHeaders(): HeadersInit {
  return { 'Content-Type': 'application/json' };
}

// Kept for admin page which uses manual JWT paste via Authorization header
export function authHeaders(token: string): HeadersInit {
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
}

// --- Auth ---

export function pilotLogin(body: { username: string; credential: string }) {
  return apiFetch<{
    data: {
      user: UserRecord;
      transactions: Transaction[];
      milestones: Milestone[];
      merchants: Merchant[];
    };
  }>('/api/auth/pilot-login', {
    method: 'POST',
    headers: jsonHeaders(),
    body: JSON.stringify(body),
  });
}

export function merchantLogin(body: { username: string; credential: string }) {
  return apiFetch<{
    data: {
      merchant: Merchant;
    };
  }>('/api/auth/merchant-login', {
    method: 'POST',
    headers: jsonHeaders(),
    body: JSON.stringify(body),
  });
}

export function logout() {
  return apiFetch<{ data: { ok: boolean } }>('/api/auth/logout', { method: 'POST' });
}

export function forgotPassword(email: string) {
  return apiFetch<{ data: { ok: boolean } }>('/api/auth/forgot-password', {
    method: 'POST',
    headers: jsonHeaders(),
    body: JSON.stringify({ email }),
  });
}

export function resetPassword(body: { email: string; code: string; new_password: string }) {
  return apiFetch<{ data: { ok: boolean } }>('/api/auth/reset-password', {
    method: 'POST',
    headers: jsonHeaders(),
    body: JSON.stringify(body),
  });
}

export function register(body: { role: 'client'; username: string; full_name: string; email: string; phone: string; password: string }) {
  return apiFetch<{ data: { role: 'client'; user_id: string } }>('/api/auth/register', {
    method: 'POST',
    headers: jsonHeaders(),
    body: JSON.stringify(body),
  });
}

export function applyMerchant(body: {
  business_name: string;
  category: string;
  contact_name: string;
  contact_email: string;
  contact_phone: string;
  username: string;
  notes?: string;
}) {
  return apiFetch<{ data: { id: string } }>('/api/applications/merchant', {
    method: 'POST',
    headers: jsonHeaders(),
    body: JSON.stringify(body),
  });
}

export function setPassword(body: { user_id: string; current_credential: string; new_password: string }) {
  return apiFetch<{ data: { ok: boolean } }>('/api/auth/set-password', {
    method: 'POST',
    headers: jsonHeaders(),
    body: JSON.stringify(body),
  });
}

// --- User ---

export function updateUserNotifications(
  id: string,
  body: { notify_points_received?: boolean; notify_milestone_near?: boolean },
) {
  return apiFetch<{ data: { notify_points_received: boolean; notify_milestone_near: boolean } }>(
    `/api/users/${id}/notifications`,
    { method: 'PATCH', headers: jsonHeaders(), body: JSON.stringify(body) }
  );
}

export function updateUser(id: string, body: { full_name?: string; email?: string; phone?: string }) {
  return apiFetch<{ data: UserRecord }>(`/api/users/${id}`, {
    method: 'PATCH',
    headers: jsonHeaders(),
    body: JSON.stringify(body),
  });
}

export function getUser(id: string) {
  return apiFetch<{ data: UserRecord }>(`/api/users/${id}`);
}

export function getUserTransactions(id: string, page = 1, limit = 20) {
  return apiFetch<{ data: Transaction[]; total: number; page: number; limit: number }>(
    `/api/users/${id}/transactions?page=${page}&limit=${limit}`,
  );
}

export function getUserRewards(id: string) {
  return apiFetch<{ data: Milestone[] }>(`/api/rewards/${id}`);
}

// --- Spend ---

export function spendCATR(body: { user_id: string; merchant_id: string; amount_catr: string }) {
  return apiFetch<{ data: Transaction }>('/api/transactions/spend', {
    method: 'POST',
    headers: jsonHeaders(),
    body: JSON.stringify(body),
  });
}

// --- Merchants ---

export function getMerchants(token?: string) {
  return apiFetch<{ data: Merchant[] }>('/api/merchants', token ? { headers: authHeaders(token) } : undefined);
}

export function getActiveMerchants() {
  return apiFetch<{ data: Merchant[] }>('/api/merchants/active');
}

export function getMerchant(id: string) {
  return apiFetch<{ data: Merchant }>(`/api/merchants/${id}`);
}

export function getMerchantPublic(id: string) {
  return apiFetch<{ data: Merchant }>(`/api/merchants/${id}/public`);
}

export function getMerchantBalance(id: string) {
  return apiFetch<{ data: MerchantBalance }>(`/api/merchants/${id}/balance`);
}

export function getMerchantTransactions(id: string) {
  return apiFetch<{ data: MerchantTransaction[] }>(`/api/merchants/${id}/transactions`);
}

export function getMerchantRedemptions(id: string) {
  return apiFetch<{ data: RedemptionRequest[] }>(`/api/merchants/${id}/redemptions`);
}

export function createMerchantRedemption(merchantId: string, amount_catr: string) {
  return apiFetch<{ data: RedemptionRequest }>(`/api/merchants/${merchantId}/redemptions`, {
    method: 'POST',
    headers: jsonHeaders(),
    body: JSON.stringify({ amount_catr }),
  });
}

export function createMerchant(
  body: { name: string; category: string; wallet_address: string; contact_email: string },
  token?: string,
) {
  return apiFetch<{ data: Merchant }>('/api/merchants', {
    method: 'POST',
    headers: token ? authHeaders(token) : jsonHeaders(),
    body: JSON.stringify(body),
  });
}

export function updateMerchantNotifications(
  id: string,
  body: { notify_redemption_update?: boolean },
) {
  return apiFetch<{ data: { notify_redemption_update: boolean } }>(`/api/merchants/${id}/notifications`, {
    method: 'PATCH',
    headers: jsonHeaders(),
    body: JSON.stringify(body),
  });
}

export function updateMerchantPayout(
  id: string,
  body: {
    payout_bank?: string;
    payout_account_number?: string;
    payout_account_type?: 'SAVINGS' | 'CHECKING';
    payout_crypto_address?: string;
  },
) {
  return apiFetch<{ data: Merchant }>(`/api/merchants/${id}/payout`, {
    method: 'PATCH',
    headers: jsonHeaders(),
    body: JSON.stringify(body),
  });
}

export function changeMerchantPassword(
  id: string,
  body: { current_password: string; new_password: string },
) {
  return apiFetch<{ data: { ok: boolean } }>(`/api/merchants/${id}/password`, {
    method: 'PATCH',
    headers: jsonHeaders(),
    body: JSON.stringify(body),
  });
}

export function updateMerchantProfile(
  id: string,
  body: { name?: string; category?: string; contact_email?: string },
) {
  return apiFetch<{ data: Merchant }>(`/api/merchants/${id}/profile`, {
    method: 'PATCH',
    headers: jsonHeaders(),
    body: JSON.stringify(body),
  });
}

export function updateMerchant(
  id: string,
  body: { name?: string; category?: string; contact_email?: string },
  token?: string,
) {
  return apiFetch<{ data: Merchant }>(`/api/merchants/${id}`, {
    method: 'PATCH',
    headers: token ? authHeaders(token) : jsonHeaders(),
    body: JSON.stringify(body),
  });
}

export function activateMerchantAdmin(id: string, token: string) {
  return apiFetch<{ data: { ok: boolean } }>(`/api/merchants/${id}/activate`, {
    method: 'PATCH',
    headers: authHeaders(token),
  });
}

export function deactivateMerchantAdmin(id: string, reason: string, token: string) {
  return apiFetch<{ data: { ok: boolean } }>(`/api/merchants/${id}/deactivate`, {
    method: 'PATCH',
    headers: authHeaders(token),
    body: JSON.stringify({ reason }),
  });
}

// --- Redemptions ---

export function createRedemption(body: { merchant_id: string; amount_catr: string }) {
  return apiFetch<{ data: RedemptionRequest }>('/api/redemptions', {
    method: 'POST',
    headers: jsonHeaders(),
    body: JSON.stringify(body),
  });
}

export function getRedemptions(token?: string, filters?: { status?: string; tier?: string }) {
  const params = new URLSearchParams();
  if (filters?.status) params.set('status', filters.status);
  if (filters?.tier) params.set('tier', filters.tier);
  const qs = params.toString() ? `?${params.toString()}` : '';
  return apiFetch<{ data: RedemptionRequest[] }>(`/api/redemptions${qs}`,
    token ? { headers: authHeaders(token) } : undefined
  );
}

export function approveRedemption(id: string, token?: string) {
  return apiFetch<{ data: RedemptionRequest }>(`/api/redemptions/${id}/approve`, {
    method: 'PATCH',
    ...(token ? { headers: authHeaders(token) } : {}),
  });
}

export function rejectRedemption(id: string, token?: string) {
  return apiFetch<{ data: RedemptionRequest }>(`/api/redemptions/${id}/reject`, {
    method: 'PATCH',
    ...(token ? { headers: authHeaders(token) } : {}),
  });
}

export function forceBurn(id: string, token?: string) {
  return apiFetch<{ data: { redemption_id: string; tx_hash: string } }>(`/api/redemptions/${id}/force-burn`, {
    method: 'POST',
    ...(token ? { headers: authHeaders(token) } : {}),
  });
}

export function confirmLempirasSent(id: string, token?: string) {
  return apiFetch<{ data: RedemptionRequest }>(`/api/redemptions/${id}/confirm-lempiras`, {
    method: 'PATCH',
    ...(token ? { headers: authHeaders(token) } : {}),
  });
}

// --- Admin ---

export function getAdminUsers(token: string) {
  return apiFetch<{ data: AdminUser[] }>('/api/admin/users', {
    headers: authHeaders(token),
  });
}

export interface RunwayData {
  pool_balance: string;
  active_merchants: number;
  monthly_pool_inflow: string;
  monthly_cashback_outflow: string;
  monthly_net: string;
  projected_runway_months: string;
  breakeven_merchants: string;
  total_transactions: number;
}

export function getRunway(token: string) {
  return apiFetch<{ data: RunwayData }>('/api/admin/runway', {
    headers: authHeaders(token),
  });
}

export type AdminMintBody =
  | { user_id: string; amount: number }
  | { merchant_id: string; amount: number }
  | { wallet_address: string; amount: number };

export function adminMint(body: AdminMintBody, token: string) {
  return apiFetch<{ data: { reference_code: string; wallet_address: string; amount: number } }>(
    '/api/admin/mint',
    {
      method: 'POST',
      headers: authHeaders(token),
      body: JSON.stringify(body),
    }
  );
}

// --- Reward queue ---

export function getRewardQueue(token: string) {
  return apiFetch<{ data: RewardPayout[] }>('/api/rewards/queue', { headers: authHeaders(token) });
}

export function approveRewardPayout(id: string, token: string) {
  return apiFetch<{ data: RewardPayout }>(`/api/rewards/queue/${id}/approve`, {
    method: 'PATCH',
    headers: authHeaders(token),
  });
}

// --- Shared types ---

export interface UserRecord {
  id: string;
  full_name: string;
  email: string;
  phone?: string;
  catr_balance: string;
  wallet_address?: string;
  created_at: string;
  notify_points_received: boolean;
  notify_milestone_near: boolean;
}

export interface Transaction {
  id: string;
  amount_catr: string;
  type: string;
  created_at: string;
  merchant_id?: string;
}

export interface Milestone {
  id: string;
  type: string;
  unlocked_at: string;
}

export interface Merchant {
  id: string;
  name: string;
  category: string;
  wallet_address: string;
  contact_email: string;
  merchant_status: 'PENDING_ACTIVATION' | 'ACTIVE' | 'DEACTIVATED';
  reactivated_at?: string | null;
  notify_redemption_update: boolean;
  payout_bank?: string | null;
  payout_account_number?: string | null;
  payout_account_type?: 'SAVINGS' | 'CHECKING' | null;
  payout_crypto_address?: string | null;
}

export interface RedemptionRequest {
  id: string;
  merchant_id: string;
  amount_catr: string;
  tier: string;
  status: string;
  created_at: string;
}

export interface MerchantBalance {
  catr_balance: string;
  total_received: string;
  total_redeemed: string;
}

export interface MerchantTransaction {
  id: string;
  user_id: string | null;
  amount_catr: string;
  type: string;
  status: string;
  source?: string;
  created_at: string;
}

export interface RewardPayout {
  id: string;
  user_id: string;
  amount_catr: string;
  status: string;
  created_at: string;
}

export interface AdminUser {
  id: string;
  full_name: string;
  email: string;
  wallet: { address: string; catr_balance: string } | null;
  reset_code?: string | null;
  reset_code_expires_at?: string | null;
}

// --- GCA ---

export interface GcaBalance {
  gca_balance: string;
  milestones_claimed: number;
  milestones_remaining: number;
  lifetime_effective_catr: string;
  next_milestone_at: string;
  price_floor_hnl: string;
  estimated_hnl_value: string;
}

export interface GcaRedemptionRequest {
  id: string;
  merchant_id: string;
  amount_gca: string;
  price_floor_hnl: string;
  amount_hnl_estimated: string;
  status: string;
  created_at: string;
  merchant?: { id: string; name: string; wallet_address: string };
}

export interface GcaMerchantAllocation {
  merchant_id: string;
  merchant_name: string;
  gca_balance: string;
  milestones_claimed: number;
  lifetime_effective_catr: string;
  next_milestone_at: string;
  estimated_hnl_value: string;
  price_floor_hnl: string;
}

export interface GcaHistoryEntry {
  id: string;
  merchant_id: string;
  type: string;
  amount_gca: string;
  notes?: string | null;
  created_at: string;
}

export function getAdminGcaMerchants(token: string) {
  return apiFetch<{ data: GcaMerchantAllocation[] }>('/api/gca/admin/merchants', {
    headers: authHeaders(token),
  });
}

export function adminVestMerchant(merchantId: string, token: string) {
  return apiFetch<{ data: { ok: boolean; new_balance: string; milestones_claimed: number } }>(
    `/api/gca/admin/vest/${merchantId}`,
    { method: 'POST', headers: authHeaders(token) }
  );
}

export function getGcaHistory(merchantId: string) {
  return apiFetch<{ data: GcaHistoryEntry[] }>(`/api/gca/${merchantId}/history`);
}

export function getGcaBalance(merchantId: string) {
  return apiFetch<{ data: GcaBalance }>(`/api/gca/${merchantId}`);
}

export function redeemGca(body: { merchant_id: string; amount_gca: number }) {
  return apiFetch<{ data: GcaRedemptionRequest }>('/api/gca/redeem', {
    method: 'POST',
    headers: jsonHeaders(),
    body: JSON.stringify(body),
  });
}

export function getGcaRedemptions(token: string) {
  return apiFetch<{ data: GcaRedemptionRequest[] }>('/api/gca/admin/redemptions', {
    headers: authHeaders(token),
  });
}

export function approveGcaRedemption(id: string, token: string) {
  return apiFetch<{ data: { id: string; status: string } }>(`/api/gca/admin/redemptions/${id}/approve`, {
    method: 'PATCH',
    headers: authHeaders(token),
  });
}

export function rejectGcaRedemption(id: string, token: string) {
  return apiFetch<{ data: GcaRedemptionRequest }>(`/api/gca/admin/redemptions/${id}/reject`, {
    method: 'PATCH',
    headers: authHeaders(token),
  });
}

export interface GcaPriceFloor {
  price_hnl: string;
  active: boolean;
  set_at?: string;
}

export function getGcaPriceFloor(token: string) {
  return apiFetch<{ data: GcaPriceFloor }>('/api/gca/admin/price-floor', {
    headers: authHeaders(token),
  });
}

export function setGcaPriceFloor(body: { price_hnl: number }, token: string) {
  return apiFetch<{ data: { price_hnl: number } }>('/api/gca/admin/price-floor', {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify(body),
  });
}

// --- Merchant Applications (admin) ---

export interface MerchantApplication {
  id: string;
  business_name: string;
  category: string;
  contact_name: string;
  contact_email: string;
  contact_phone: string;
  notes?: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  reviewed_at?: string;
  rejection_reason?: string;
  created_at: string;
}

export interface ApprovedMerchantCredentials {
  user_id: string;
  full_name: string;
  email: string;
  temp_password: string;
  wallet_address: string;
}

export function getAdminApplications(token: string, status?: string) {
  const params = status ? `?status=${status}` : '';
  return apiFetch<{ data: MerchantApplication[] }>(`/api/admin/merchant-applications${params}`, {
    headers: authHeaders(token),
  });
}

export function approveApplication(id: string, token: string) {
  return apiFetch<{ data: ApprovedMerchantCredentials }>(`/api/admin/merchant-applications/${id}/approve`, {
    method: 'POST',
    headers: authHeaders(token),
  });
}

export function rejectApplication(id: string, token: string, reason?: string) {
  return apiFetch<{ data: { ok: boolean } }>(`/api/admin/merchant-applications/${id}/reject`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({ reason }),
  });
}
