"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.HttpServer = void 0;
const http = __importStar(require("http"));
const BACKEND_URL = process.env.BACKEND_URL ?? 'http://localhost:3001';
const BRIDGE_SECRET = process.env.BRIDGE_SECRET ?? 'change_me_in_production';
async function confirmMint(reference_code, tx_hash) {
    await fetch(`${BACKEND_URL}/internal/bridge/mint-confirmed`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-bridge-secret': BRIDGE_SECRET },
        body: JSON.stringify({ reference_code, tx_hash }),
    });
}
async function confirmBurn(redemption_id, tx_hash) {
    await fetch(`${BACKEND_URL}/internal/bridge/burn-confirmed`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-bridge-secret': BRIDGE_SECRET },
        body: JSON.stringify({ redemption_id, tx_hash }),
    });
}
class HttpServer {
    constructor(minter, port = 3002) {
        this.minter = minter;
        this.port = port;
        this.server = http.createServer((req, res) => this.handleRequest(req, res));
    }
    handleRequest(req, res) {
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
            let event;
            try {
                event = JSON.parse(body);
            }
            catch {
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
                }
                else {
                    console.error(`[bridge:http] Mint failed for ${event.reference_code}: ${outcome.reason}`);
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ status: 'NACK', reference_code: event.reference_code, reason: outcome.reason }));
                }
            }).catch((err) => {
                const reason = err instanceof Error ? err.message : String(err);
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ status: 'NACK', reason }));
            });
        });
    }
    handleBurn(req, res) {
        let body = '';
        req.on('data', (chunk) => { body += chunk.toString(); });
        req.on('end', () => {
            let payload;
            try {
                payload = JSON.parse(body);
            }
            catch {
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
                }
                else {
                    console.error(`[bridge:http] Burn failed for ${payload.redemption_id}: ${outcome.reason}`);
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ status: 'NACK', redemption_id: payload.redemption_id, reason: outcome.reason }));
                }
            }).catch((err) => {
                const reason = err instanceof Error ? err.message : String(err);
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ status: 'NACK', reason }));
            });
        });
    }
    listen() {
        this.server.listen(this.port, () => {
            console.log(`[bridge] HTTP server listening on port ${this.port}`);
        });
    }
    close() {
        return new Promise((resolve) => {
            this.server.close(() => resolve());
        });
    }
}
exports.HttpServer = HttpServer;
