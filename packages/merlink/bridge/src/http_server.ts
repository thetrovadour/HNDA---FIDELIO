import * as http from 'http';
import { PaymentEvent } from './types';
import { Minter } from './minter';

const BACKEND_URL = process.env.BACKEND_URL ?? 'http://localhost:3001';
const BRIDGE_SECRET = process.env.BRIDGE_SECRET ?? 'change_me_in_production';

async function confirmMint(reference_code: string, tx_hash: string): Promise<void> {
  await fetch(`${BACKEND_URL}/internal/bridge/mint-confirmed`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-bridge-secret': BRIDGE_SECRET },
    body: JSON.stringify({ reference_code, tx_hash }),
  });
}

async function confirmBurn(redemption_id: string, tx_hash: string): Promise<void> {
  await fetch(`${BACKEND_URL}/internal/bridge/burn-confirmed`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-bridge-secret': BRIDGE_SECRET },
    body: JSON.stringify({ redemption_id, tx_hash }),
  });
}

export class HttpServer {
  private server: http.Server;
  private minter: Minter;
  private port: number;

  constructor(minter: Minter, port = 3002) {
    this.minter = minter;
    this.port = port;
    this.server = http.createServer((req, res) => this.handleRequest(req, res));
  }

  private handleRequest(req: http.IncomingMessage, res: http.ServerResponse): void {
    if (req.method !== 'POST' || (req.url !== '/mint' && req.url !== '/burn')) {
      res.writeHead(404);
      res.end(JSON.stringify({ error: 'Not found' }));
      return;
    }

    if (req.url === '/burn') {
      this.handleBurn(req, res);
      return;
    }

    let body = '';
    req.on('data', (chunk) => { body += chunk.toString(); });
    req.on('end', () => {
      let event: PaymentEvent;
      try {
        event = JSON.parse(body) as PaymentEvent;
      } catch {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'NACK', reason: 'Invalid JSON' }));
        return;
      }

      this.minter.mint(event).then(async (outcome) => {
        if (outcome.success) {
          console.log(`[bridge:http] Minted ${event.reference_code} → tx ${outcome.tx_hash}`);
          await confirmMint(event.reference_code, outcome.tx_hash).catch((err) => {
            console.error('[bridge:http] Failed to confirm mint to backend:', err);
          });
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ status: 'ACK', reference_code: event.reference_code, tx_hash: outcome.tx_hash }));
        } else {
          console.error(`[bridge:http] Mint failed for ${event.reference_code}: ${outcome.reason}`);
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ status: 'NACK', reference_code: event.reference_code, reason: outcome.reason }));
        }
      }).catch((err: unknown) => {
        const reason = err instanceof Error ? err.message : String(err);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'NACK', reason }));
      });
    });
  }

  private handleBurn(req: http.IncomingMessage, res: http.ServerResponse): void {
    let body = '';
    req.on('data', (chunk) => { body += chunk.toString(); });
    req.on('end', () => {
      let payload: { redemption_id: string; wallet_address: string; amount_catr: number };
      try {
        payload = JSON.parse(body);
      } catch {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'NACK', reason: 'Invalid JSON' }));
        return;
      }

      this.minter.burn(payload.wallet_address, payload.amount_catr).then(async (outcome) => {
        if (outcome.success) {
          console.log(`[bridge:http] Burned ${payload.amount_catr} CATR from ${payload.wallet_address} → tx ${outcome.tx_hash}`);
          await confirmBurn(payload.redemption_id, outcome.tx_hash).catch((err) => {
            console.error('[bridge:http] Failed to confirm burn to backend:', err);
          });
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ status: 'ACK', redemption_id: payload.redemption_id, tx_hash: outcome.tx_hash }));
        } else {
          console.error(`[bridge:http] Burn failed for ${payload.redemption_id}: ${outcome.reason}`);
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ status: 'NACK', redemption_id: payload.redemption_id, reason: outcome.reason }));
        }
      }).catch((err: unknown) => {
        const reason = err instanceof Error ? err.message : String(err);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'NACK', reason }));
      });
    });
  }

  listen(): void {
    this.server.listen(this.port, () => {
      console.log(`[bridge] HTTP server listening on port ${this.port}`);
    });
  }

  close(): Promise<void> {
    return new Promise((resolve) => {
      this.server.close(() => resolve());
    });
  }
}
