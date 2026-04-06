"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReconciliationJob = void 0;
const node_cron_1 = __importDefault(require("node-cron"));
class ReconciliationJob {
    constructor(db, bridgeUrl) {
        this.db = db;
        this.bridgeUrl = bridgeUrl;
        this.staleMinutes = parseInt(process.env.RECONCILIATION_STALE_MINUTES ?? '30');
        this.maxAttempts = parseInt(process.env.RECONCILIATION_MAX_ATTEMPTS ?? '3');
    }
    async run() {
        const cutoff = new Date(Date.now() - this.staleMinutes * 60 * 1000);
        const staleRows = await this.db.pendingMint.findMany({
            where: {
                status: { in: ['PENDING', 'SENT'] },
                updated_at: { lt: cutoff },
                attempts: { lt: this.maxAttempts },
            },
        });
        const result = {
            checked: staleRows.length,
            retried: 0,
            failed: 0,
            already_minted: 0,
        };
        for (const row of staleRows) {
            if (row.tx_hash) {
                await this.db.pendingMint.update({
                    where: { id: row.id },
                    data: { status: 'MINTED', resolved_at: new Date() },
                });
                result.already_minted++;
                continue;
            }
            const newAttempts = row.attempts + 1;
            if (newAttempts >= this.maxAttempts) {
                await this.db.pendingMint.update({
                    where: { id: row.id },
                    data: { status: 'FAILED', attempts: newAttempts, last_attempt_at: new Date() },
                });
                result.failed++;
                continue;
            }
            try {
                await fetch(`${this.bridgeUrl}/retry`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        reference_code: row.reference_code,
                        amount_lempiras: row.amount_lempiras.toString(),
                        client_wallet: row.client_wallet,
                        source: row.source,
                    }),
                });
            }
            catch {
                // Bridge unreachable — still increment attempts
            }
            await this.db.pendingMint.update({
                where: { id: row.id },
                data: { attempts: newAttempts, last_attempt_at: new Date() },
            });
            result.retried++;
        }
        return result;
    }
    schedule() {
        node_cron_1.default.schedule('0 8 * * *', async () => {
            console.log('[ReconciliationJob] Running daily reconciliation...');
            try {
                const result = await this.run();
                console.log('[ReconciliationJob] Result:', result);
            }
            catch (err) {
                console.error('[ReconciliationJob] Error:', err);
            }
        });
    }
}
exports.ReconciliationJob = ReconciliationJob;
