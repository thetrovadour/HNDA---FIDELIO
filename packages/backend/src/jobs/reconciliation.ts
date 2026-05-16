import cron from 'node-cron';
import { PrismaClient } from '@prisma/client';

export interface ReconciliationResult {
  checked: number;
  retried: number;
  failed: number;
  already_minted: number;
  transfers_checked: number;
  transfers_retried: number;
  transfers_failed: number;
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
      transfers_checked: 0,
      transfers_retried: 0,
      transfers_failed: 0,
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

    // ── PendingTransfer retry loop ─────────────────────────────────────────────
    const staleTransfers = await this.db.pendingTransfer.findMany({
      where: {
        status: 'PENDING',
        updated_at: { lt: cutoff },
        attempts: { lt: this.maxAttempts },
      },
    });

    result.transfers_checked = staleTransfers.length;

    for (const pt of staleTransfers) {
      const newAttempts = pt.attempts + 1;

      if (newAttempts >= this.maxAttempts) {
        await this.db.pendingTransfer.update({
          where: { id: pt.id },
          data: { status: 'FAILED', attempts: newAttempts, last_attempt_at: new Date() },
        });
        result.transfers_failed++;
        continue;
      }

      try {
        const res = await fetch(`${this.bridgeUrl}/transfer`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            from_wallet: pt.from_wallet,
            to_wallet: pt.to_wallet,
            amount_catr: pt.amount_catr.toString(),
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok && data.tx_hash) {
          await this.db.pendingTransfer.update({
            where: { id: pt.id },
            data: { status: 'CONFIRMED', tx_hash: data.tx_hash, resolved_at: new Date(), attempts: newAttempts },
          });
        } else {
          await this.db.pendingTransfer.update({
            where: { id: pt.id },
            data: { attempts: newAttempts, last_attempt_at: new Date() },
          });
        }
      } catch {
        await this.db.pendingTransfer.update({
          where: { id: pt.id },
          data: { attempts: newAttempts, last_attempt_at: new Date() },
        });
      }
      result.transfers_retried++;
    }

    return result;
  }

  schedule(): void {
    cron.schedule('0 8 * * *', async () => {
      console.log('[ReconciliationJob] Running daily reconciliation...');
      try {
        const result = await this.run();
        console.log('[ReconciliationJob] Result:', result);

        if (result.failed > 0 || result.transfers_failed > 0) {
          console.error(`\n[ALERT] ⚠️  Reconciliation found FAILED rows:`);
          if (result.failed > 0) {
            const failedMints = await this.db.pendingMint.findMany({
              where: { status: 'FAILED' },
              select: { id: true, reference_code: true, client_wallet: true, amount_lempiras: true, attempts: true, last_attempt_at: true },
              orderBy: { updated_at: 'desc' },
              take: 20,
            });
            console.error(`  PendingMint FAILED (${result.failed} new this run, ${failedMints.length} total):`);
            for (const m of failedMints) {
              console.error(`    - ${m.reference_code} | wallet: ${m.client_wallet} | L.${m.amount_lempiras} | attempts: ${m.attempts} | last: ${m.last_attempt_at?.toISOString() ?? '—'}`);
            }
          }
          if (result.transfers_failed > 0) {
            const failedTransfers = await this.db.pendingTransfer.findMany({
              where: { status: 'FAILED' },
              select: { id: true, transaction_id: true, from_wallet: true, to_wallet: true, amount_catr: true, attempts: true, last_attempt_at: true },
              orderBy: { updated_at: 'desc' },
              take: 20,
            });
            console.error(`  PendingTransfer FAILED (${result.transfers_failed} new this run, ${failedTransfers.length} total):`);
            for (const t of failedTransfers) {
              console.error(`    - tx:${t.transaction_id.slice(0, 8)}… | ${t.from_wallet.slice(0, 8)}…→${t.to_wallet.slice(0, 8)}… | ${t.amount_catr} CATR | attempts: ${t.attempts}`);
            }
          }
          console.error(`[ALERT] Manual review required — use admin panel health tab.\n`);
        }
      } catch (err) {
        console.error('[ReconciliationJob] Error:', err);
      }
    });
  }
}
