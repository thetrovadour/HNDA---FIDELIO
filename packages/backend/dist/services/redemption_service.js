"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RedemptionService = void 0;
const library_1 = require("@prisma/client/runtime/library");
class RedemptionService {
    constructor(db) {
        this.db = db;
    }
    async createRequest(merchant_id, amount_catr) {
        const merchant = await this.db.merchant.findUnique({ where: { id: merchant_id } });
        if (!merchant)
            throw new Error('Merchant not found');
        if (!merchant.active)
            throw new Error('Merchant is not active');
        const adminMin = parseFloat(process.env.REDEMPTION_TIER_ADMIN_MIN ?? '50');
        const vaultMin = parseFloat(process.env.REDEMPTION_TIER_VAULT_MIN ?? '500');
        const amount = parseFloat(amount_catr);
        let tier;
        if (amount < adminMin) {
            tier = 'AUTO';
        }
        else if (amount <= vaultMin) {
            tier = 'ADMIN_APPROVAL';
        }
        else {
            tier = 'VAULT_OP';
        }
        return this.db.redemptionRequest.create({
            data: {
                merchant_id,
                amount_catr: new library_1.Decimal(amount_catr),
                tier,
                status: 'PENDING_BURN',
            },
        });
    }
    async approveRequest(id, approved_by) {
        const request = await this.db.redemptionRequest.findUnique({ where: { id } });
        if (!request)
            throw new Error('Redemption request not found');
        if (request.status !== 'PENDING_BURN')
            throw new Error('Request is not in PENDING_BURN status');
        return this.db.redemptionRequest.update({
            where: { id },
            data: { status: 'BURN_SUBMITTED', approved_by },
        });
    }
    async confirmBurn(id, burn_tx_hash) {
        const request = await this.db.redemptionRequest.findUnique({ where: { id } });
        if (!request)
            throw new Error('Redemption request not found');
        if (request.status !== 'BURN_SUBMITTED')
            throw new Error('Request is not in BURN_SUBMITTED status');
        return this.db.redemptionRequest.update({
            where: { id },
            data: { status: 'BURNED', burn_tx_hash },
        });
    }
    async confirmLempirasSent(id) {
        const request = await this.db.redemptionRequest.findUnique({ where: { id } });
        if (!request)
            throw new Error('Redemption request not found');
        if (request.status !== 'BURNED')
            throw new Error('Request is not in BURNED status');
        return this.db.redemptionRequest.update({
            where: { id },
            data: { status: 'LEMPIRAS_SENT' },
        });
    }
}
exports.RedemptionService = RedemptionService;
