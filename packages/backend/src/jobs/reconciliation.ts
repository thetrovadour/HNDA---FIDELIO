import cron from 'node-cron';
import { PrismaClient } from '@prisma/client';

export interface ReconciliationResult {
  checked: number;
  retried: number;
  failed: number;
  already_minted: number;
}

export class ReconciliationJob {
  private staleMinutes: number;
  private maxAttempts: number;

  constructor(private db: PrismaClient, private bridgeUrl: string) {
    this.staleMinutes = parseInt(process.env.RECONCILIATION_STALE_MINUTES ?? '30');
    this.maxAttempts = parseInt(process.env.RECONCILIATION_MAX_ATTEMPTS ?? '3');
  }

  async run(): Promise<ReconciliationResult> {
    const cutoff = new Date(Date.now() - this.staleMinutes * 60 * 1000);

    const staleRows = await this.db.pendingMint.findMany({
      where: {
        status: { in: ['PENDING', 'SENT'] },
        updated_at: { lt: cutoff },
        attempts: { lt: this.maxAttempts },
      },
    });

    const result: ReconciliationResult = {
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
      } catch {
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

  schedule(): void {
    cron.schedule('0 8 * * *', async () => {
      console.log('[ReconciliationJob] Running daily reconciliation...');
      try {
        const result = await this.run();
        console.log('[ReconciliationJob] Result:', result);
      } catch (err) {
        console.error('[ReconciliationJob] Error:', err);
      }
    });
  }
}
