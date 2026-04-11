const BASE = process.env.NEXT_PUBLIC_BACKEND_URL ?? process.env.BACKEND_URL ?? 'http://localhost:3001';
if (typeof window !== 'undefined') console.log('[FIDELIO] BACKEND_URL =', BASE);

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, options);
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`API ${res.status}: ${text}`);
  }
  return res.json() as Promise<T>;
}

function authHeaders(token: string): HeadersInit {
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
}

function jsonHeaders(): HeadersInit {
  return { 'Content-Type': 'application/json' };
}

// --- Auth ---

export function pilotLogin(body: { full_name: string; pin: string }) {
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

// --- User ---

export function getUser(id: string) {
  return apiFetch<{ data: UserRecord }>(`/api/users/${id}`);
}

export function getUserTransactions(id: string, page = 1, limit = 20) {
  return apiFetch<{ data: Transaction[]; total: number; page: number; limit: number }>(
    `/api/users/${id}/transactions?page=${page}&limit=${limit}`
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

export function getMerchants() {
  return apiFetch<{ data: Merchant[] }>('/api/merchants');
}

export function getMerchant(id: string) {
  return apiFetch<{ data: Merchant }>(`/api/merchants/${id}`);
}

export function createMerchant(
  body: { name: string; category: string; wallet_address: string; contact_email: string },
  token: string
) {
  return apiFetch<{ data: Merchant }>('/api/merchants', {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify(body),
  });
}

export function updateMerchant(
  id: string,
  body: { name?: string; category?: string; contact_email?: string; active?: boolean },
  token: string
) {
  return apiFetch<{ data: Merchant }>(`/api/merchants/${id}`, {
    method: 'PATCH',
    headers: authHeaders(token),
    body: JSON.stringify(body),
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

export function getRedemptions(token: string, filters?: { status?: string; tier?: string }) {
  const params = new URLSearchParams();
  if (filters?.status) params.set('status', filters.status);
  if (filters?.tier) params.set('tier', filters.tier);
  const qs = params.toString() ? `?${params.toString()}` : '';
  return apiFetch<{ data: RedemptionRequest[] }>(`/api/redemptions${qs}`, {
    headers: authHeaders(token),
  });
}

export function approveRedemption(id: string, token: string) {
  return apiFetch<{ data: RedemptionRequest }>(`/api/redemptions/${id}/approve`, {
    method: 'PATCH',
    headers: authHeaders(token),
  });
}

export function rejectRedemption(id: string, token: string) {
  return apiFetch<{ data: RedemptionRequest }>(`/api/redemptions/${id}/reject`, {
    method: 'PATCH',
    headers: authHeaders(token),
  });
}

// --- Reward queue ---

export function getRewardQueue(token: string) {
  return apiFetch<{ data: RewardPayout[] }>('/api/rewards/queue', {
    headers: authHeaders(token),
  });
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
  catr_balance: string;
  wallet_address?: string;
  created_at: string;
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
  active: boolean;
}

export interface RedemptionRequest {
  id: string;
  merchant_id: string;
  amount_catr: string;
  tier: string;
  status: string;
  created_at: string;
}

export interface RewardPayout {
  id: string;
  user_id: string;
  amount_catr: string;
  status: string;
  created_at: string;
}
