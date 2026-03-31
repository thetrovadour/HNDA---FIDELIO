export type PaymentSource = 'EMAIL' | 'NFC' | 'WEBHOOK';

export interface PaymentEvent {
  reference_code: string;
  amount_lempiras: number;
  client_wallet: string;
  source: PaymentSource;
  received_at: number;
}

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
