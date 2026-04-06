"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TransactionService = void 0;
const library_1 = require("@prisma/client/runtime/library");
class TransactionService {
    constructor(db, rewardService) {
        this.db = db;
        this.rewardService = rewardService;
    }
    async recordSpend(params) {
        const user = await this.db.user.findUnique({ where: { id: params.user_id } });
        if (!user)
            throw new Error('User not found');
        const merchant = await this.db.merchant.findUnique({ where: { id: params.merchant_id } });
        if (!merchant)
            throw new Error('Merchant not found');
        const commission = new library_1.Decimal(params.amount_catr).mul('0.0063');
        const transaction = await this.db.$transaction(async (tx) => {
            const txRecord = await tx.transaction.create({
                data: {
                    user_id: params.user_id,
                    merchant_id: params.merchant_id,
                    type: 'SPEND',
                    status: 'CONFIRMED',
                    amount_catr: new library_1.Decimal(params.amount_catr),
                    commission_catr: commission,
                },
            });
            await tx.merchantVisit.create({
                data: {
                    user_id: params.user_id,
                    merchant_id: params.merchant_id,
                },
            });
            return txRecord;
        });
        if (this.rewardService) {
            await this.rewardService.evaluateAfterSpend(params.user_id);
        }
        return transaction;
    }
    async getUserTransactions(user_id, page, limit) {
        const [transactions, total] = await Promise.all([
            this.db.transaction.findMany({
                where: { user_id },
                orderBy: { created_at: 'desc' },
                skip: (page - 1) * limit,
                take: limit,
            }),
            this.db.transaction.count({ where: { user_id } }),
        ]);
        return { transactions, total };
    }
}
exports.TransactionService = TransactionService;
