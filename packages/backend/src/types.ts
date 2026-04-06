// ─── Payment source (mirrors bridge types.ts exactly) ────────────────────────

export type PaymentSource = 'EMAIL' | 'NFC' | 'WEBHOOK';

// ─── DTOs — what the bridge POSTs to the backend ─────────────────────────────

// Matches PaymentEvent in packages/merlink/bridge/src/types.ts
// Suffixed "DTO" to avoid confusion — this is the HTTP body shape, not the C++ struct
export interface PaymentEventDTO {
  reference_code: string;
  amount_lempiras: number;
  client_wallet: string;
  source: PaymentSource;
  received_at: number; // Unix timestamp
}

export interface MintConfirmedDTO {
  reference_code: string;
  tx_hash: string;
  block_number?: number;
}

// ─── Bridge ACK/NACK (mirrors bridge BridgeResponse) ─────────────────────────

export interface AckResponse {
  status: 'ACK';
  reference_code: string;
}

export interface NackResponse {
  status: 'NACK';
  reference_code: string;
  reason: string;
}

export type BridgeResponse = AckResponse | NackResponse;

// ─── Generic API response wrapper ────────────────────────────────────────────

export interface ApiResponse<T> {
  data: T;
}

export interface ApiError {
  error: string;
  code: string;
}

// ─── Pagination ───────────────────────────────────────────────────────────────

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}
