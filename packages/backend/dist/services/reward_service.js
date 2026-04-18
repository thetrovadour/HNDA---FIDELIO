"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RewardService = void 0;
const library_1 = require("@prisma/client/runtime/library");
const MIN_QUALIFYING_CATR = new library_1.Decimal('100'); // L.100 floor (1 CATR = 1 HNL)
const MAX_DAILY_PER_MERCHANT = 3;
const NINETY_DAYS_MS = 90 * 24 * 60 * 60 * 1000;
const CASHBACK_RATES = {
    TX_5: '0.005', // 0.5%
    TX_10: '0.008', // 0.8%
    TX_25: '0.011', // 1.1%
    GOLD: '0.011', // 1.1% — same rate, but paid hourly via GoldCashbackJob
};
const GOLD_MIN_TXNS = 100;
const GOLD_MIN_SPEND = new library_1.Decimal('8000'); // L.8,000 per evaluation period
class RewardService {
    constructor(db) {
        this.db = db;
    }
    async evaluateAfterMint(user_id) {
        await this.checkMilestones(user_id);
        await this.checkReferralTrigger(user_id);
    }
    async evaluateAfterSpend(user_id) {
        await this.checkMilestones(user_id);
        await this.checkCrossMerchantBonus(user_id);
    }
    // ─── Private helpers ────────────────────────────────────────────────────────
    // Velocity-capped qualifying SPEND count. since = optional 90-day or period cutoff.
    async countQualifyingSpends(user_id, since, until, excludeMerchantIds) {
        const where = {
            user_id,
            type: 'SPEND',
            status: 'CONFIRMED',
            amount_catr: { gte: MIN_QUALIFYING_CATR },
        };
        if (since || until) {
            where.created_at = {
                ...(since ? { gte: since } : {}),
                ...(until ? { lte: until } : {}),
            };
        }
        const spends = await this.db.transaction.findMany({
            where: where,
            select: { merchant_id: true, amount_catr: true, created_at: true },
        });
        const dailyBuckets = new Map();
        let count = 0;
        let totalSpent = new library_1.Decimal(0);
        for (const tx of spends) {
            if (excludeMerchantIds && tx.merchant_id && excludeMerchantIds.has(tx.merchant_id))
                continue;
            const day = tx.created_at.toISOString().slice(0, 10);
            const key = `${tx.merchant_id}::${day}`;
            const soFar = dailyBuckets.get(key) ?? 0;
            if (soFar < MAX_DAILY_PER_MERCHANT) {
                dailyBuckets.set(key, soFar + 1);
                count++;
                totalSpent = totalSpent.plus(new library_1.Decimal(tx.amount_catr));
            }
        }
        return { count, totalSpent };
    }
    // Returns the 5-month lookback window for June/December evaluation months.
    // June  → Jan 1 – May 31 | December → Jul 1 – Nov 30
    getCurrentLookbackWindow() {
        const now = new Date();
        const month = now.getMonth() + 1; // 1-12
        const year = now.getFullYear();
        if (month === 6) {
            return {
                start: new Date(`${year}-01-01T00:00:00Z`),
                end: new Date(`${year}-05-31T23:59:59Z`),
            };
        }
        if (month === 12) {
            return {
                start: new Date(`${year}-07-01T00:00:00Z`),
                end: new Date(`${year}-11-30T23:59:59Z`),
            };
        }
        return null;
    }
    // ─── Tier resolution ────────────────────────────────────────────────────────
    async isGoldActive(user_id) {
        const now = new Date();
        const record = await this.db.userGoldStatus.findFirst({
            where: {
                user_id,
                active_from: { lte: now },
                active_until: { gte: now },
            },
        });
        return record !== null;
    }
    async getActiveTier(user_id) {
        if (await this.isGoldActive(user_id))
            return 'GOLD';
        const since = new Date(Date.now() - NINETY_DAYS_MS);
        const { count } = await this.countQualifyingSpends(user_id, since);
        if (count >= 25)
            return 'TX_25';
        if (count >= 10)
            return 'TX_10';
        if (count >= 5)
            return 'TX_5';
        return null;
    }
    // ─── GOLD evaluation (runs June / December) ─────────────────────────────────
    // Called by admin or a scheduled job during June/December.
    // Evaluates whether user qualifies for GOLD and creates a UserGoldStatus record.
    async evaluateGoldQualification(user_id) {
        const window = this.getCurrentLookbackWindow();
        if (!window)
            return false;
        // Exclude self-dealing: transactions at merchants the user owns
        const ownedMerchants = await this.db.merchant.findMany({
            where: { owner_user_id: user_id },
            select: { id: true },
        });
        const ownedIds = new Set(ownedMerchants.map(m => m.id));
        const { count, totalSpent } = await this.countQualifyingSpends(user_id, window.start, window.end, ownedIds);
        const qualifies = count >= GOLD_MIN_TXNS && totalSpent.gte(GOLD_MIN_SPEND);
        if (!qualifies)
            return false;
        const now = new Date();
        const month = now.getMonth() + 1;
        const year = now.getFullYear();
        // June evaluation → GOLD active July 1 – December 31
        // December evaluation → GOLD active January 1 – June 30 (next year)
        const active_from = month === 6
            ? new Date(`${year}-07-01T00:00:00Z`)
            : new Date(`${year + 1}-01-01T00:00:00Z`);
        const active_until = month === 6
            ? new Date(`${year}-12-31T23:59:59Z`)
            : new Date(`${year + 1}-06-30T23:59:59Z`);
        await this.db.userGoldStatus.create({
            data: { user_id, active_from, active_until },
        });
        return true;
    }
    // ─── Milestone checks ───────────────────────────────────────────────────────
    async checkMilestones(user_id) {
        const { count, totalSpent } = await this.countQualifyingSpends(user_id);
        // Pool contribution = qualifying spend × 3.6% commission × 35% pool share = × 0.0126
        const poolContribution = totalSpent.mul('0.0126');
        const milestones = [
            { type: 'TX_5', threshold: 5, rate: '0.10' },
            { type: 'TX_10', threshold: 10, rate: '0.15' },
            { type: 'TX_25', threshold: 25, rate: '0.20' },
        ];
        for (const m of milestones) {
            if (count >= m.threshold) {
                const existing = await this.db.rewardMilestone.findUnique({
                    where: { user_id_type: { user_id, type: m.type } },
                });
                if (!existing) {
                    const wallet = await this.db.wallet.findUnique({ where: { user_id } });
                    if (wallet) {
                        const rewardAmount = poolContribution.mul(m.rate).toDecimalPlaces(18);
                        const milestone = await this.db.rewardMilestone.create({
                            data: { user_id, type: m.type, amount_catr: rewardAmount },
                        });
                        await this.queuePayout({
                            recipient_wallet: wallet.address,
                            amount_catr: rewardAmount.toString(),
                            source_type: 'MILESTONE',
                            source_id: milestone.id,
                        });
                    }
                }
            }
        }
    }
    // ─── Cashback batches ───────────────────────────────────────────────────────
    // Runs every 12 hours. Processes non-GOLD users only (GOLD handled by GoldCashbackJob).
    async processCashbackBatch() {
        const unprocessed = await this.db.transaction.findMany({
            where: { type: 'SPEND', status: 'CONFIRMED', cashback_processed: false },
            select: { id: true, user_id: true, amount_catr: true },
        });
        if (unprocessed.length === 0)
            return { processed: 0, payouts: 0 };
        const byUser = new Map();
        for (const tx of unprocessed) {
            if (!byUser.has(tx.user_id))
                byUser.set(tx.user_id, []);
            byUser.get(tx.user_id).push({ id: tx.id, amount_catr: tx.amount_catr });
        }
        let processed = 0;
        let payouts = 0;
        for (const [user_id, txns] of byUser) {
            if (await this.isGoldActive(user_id))
                continue; // GOLD users handled hourly
            await this.db.transaction.updateMany({
                where: { id: { in: txns.map(t => t.id) } },
                data: { cashback_processed: true },
            });
            processed += txns.length;
            const tier = await this.getActiveTier(user_id);
            if (!tier)
                continue;
            const totalSpend = txns.reduce((sum, t) => sum.plus(new library_1.Decimal(t.amount_catr)), new library_1.Decimal(0));
            const cashbackAmount = totalSpend.mul(CASHBACK_RATES[tier]).toDecimalPlaces(18);
            if (cashbackAmount.lte(0))
                continue;
            const wallet = await this.db.wallet.findUnique({ where: { user_id } });
            if (!wallet)
                continue;
            await this.queuePayout({
                recipient_wallet: wallet.address,
                amount_catr: cashbackAmount.toString(),
                source_type: 'CASHBACK',
                source_id: user_id,
            });
            payouts++;
        }
        return { processed, payouts };
    }
    // Runs every hour. Processes GOLD users only.
    async processGoldCashbackBatch() {
        const unprocessed = await this.db.transaction.findMany({
            where: { type: 'SPEND', status: 'CONFIRMED', cashback_processed: false },
            select: { id: true, user_id: true, amount_catr: true },
        });
        if (unprocessed.length === 0)
            return { processed: 0, payouts: 0 };
        const byUser = new Map();
        for (const tx of unprocessed) {
            if (!byUser.has(tx.user_id))
                byUser.set(tx.user_id, []);
            byUser.get(tx.user_id).push({ id: tx.id, amount_catr: tx.amount_catr });
        }
        let processed = 0;
        let payouts = 0;
        for (const [user_id, txns] of byUser) {
            if (!await this.isGoldActive(user_id))
                continue; // only GOLD users
            await this.db.transaction.updateMany({
                where: { id: { in: txns.map(t => t.id) } },
                data: { cashback_processed: true },
            });
            processed += txns.length;
            const totalSpend = txns.reduce((sum, t) => sum.plus(new library_1.Decimal(t.amount_catr)), new library_1.Decimal(0));
            const cashbackAmount = totalSpend.mul(CASHBACK_RATES['GOLD']).toDecimalPlaces(18);
            if (cashbackAmount.lte(0))
                continue;
            const wallet = await this.db.wallet.findUnique({ where: { user_id } });
            if (!wallet)
                continue;
            await this.queuePayout({
                recipient_wallet: wallet.address,
                amount_catr: cashbackAmount.toString(),
                source_type: 'CASHBACK_GOLD',
                source_id: user_id,
            });
            payouts++;
        }
        return { processed, payouts };
    }
    // ─── Cross-merchant bonus ───────────────────────────────────────────────────
    async checkCrossMerchantBonus(user_id) {
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const visits = await this.db.merchantVisit.groupBy({
            by: ['merchant_id'],
            where: { user_id, visited_at: { gte: thirtyDaysAgo } },
        });
        if (visits.length >= 3) {
            const existing = await this.db.rewardMilestone.findUnique({
                where: { user_id_type: { user_id, type: 'CROSS_MERCHANT' } },
            });
            if (!existing) {
                const wallet = await this.db.wallet.findUnique({ where: { user_id } });
                if (wallet) {
                    const milestone = await this.db.rewardMilestone.create({
                        data: { user_id, type: 'CROSS_MERCHANT', amount_catr: new library_1.Decimal('10') },
                    });
                    await this.queuePayout({
                        recipient_wallet: wallet.address,
                        amount_catr: '10',
                        source_type: 'CROSS_MERCHANT',
                        source_id: milestone.id,
                    });
                }
            }
        }
    }
    // ─── Referral trigger ───────────────────────────────────────────────────────
    async checkReferralTrigger(user_id) {
        const referral = await this.db.referral.findFirst({
            where: { referred_id: user_id, status: 'PENDING' },
        });
        if (!referral)
            return;
        await this.db.referral.update({
            where: { id: referral.id },
            data: { status: 'TRIGGERED', triggered_at: new Date() },
        });
        const referrerWallet = await this.db.wallet.findUnique({
            where: { user_id: referral.referrer_id },
        });
        if (referrerWallet) {
            await this.queuePayout({
                recipient_wallet: referrerWallet.address,
                amount_catr: '5',
                source_type: 'REFERRAL',
                source_id: referral.id,
            });
        }
    }
    // ─── Payout queue ───────────────────────────────────────────────────────────
    async queuePayout(params) {
        const amount = parseFloat(params.amount_catr);
        let tier;
        if (amount < 50) {
            tier = 'AUTO';
        }
        else if (amount <= 500) {
            tier = 'ADMIN_APPROVAL';
        }
        else {
            tier = 'VAULT_OP';
        }
        await this.db.rewardPayoutQueue.create({
            data: {
                recipient_wallet: params.recipient_wallet,
                amount_catr: new library_1.Decimal(params.amount_catr),
                tier,
                status: 'QUEUED',
                source_type: params.source_type,
                source_id: params.source_id,
            },
        });
    }
}
exports.RewardService = RewardService;
