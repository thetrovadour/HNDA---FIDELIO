import { PrismaClient, RedemptionRequest } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/client';

export class RedemptionService {
  constructor(private db: PrismaClient) {}

  async createRequest(merchant_id: string, amount_catr: string): Promise<RedemptionRequest> {
    const merchant = await this.db.merchant.findUnique({ where: { id: merchant_id } });
    if (!merchant) throw new Error('Merchant not found');
    if (!merchant.active) throw new Error('Merchant is not active');

    const adminMin = parseFloat(process.env.REDEMPTION_TIER_ADMIN_MIN ?? '50');
    const vaultMin = parseFloat(process.env.REDEMPTION_TIER_VAULT_MIN ?? '500');
    const amount = parseFloat(amount_catr);

    let tier: 'AUTO' | 'ADMIN_APPROVAL' | 'VAULT_OP';
    if (amount < adminMin) {
      tier = 'AUTO';
    } else if (amount <= vaultMin) {
      tier = 'ADMIN_APPROVAL';
    } else {
      tier = 'VAULT_OP';
    }

    return this.db.redemptionRequest.create({
      data: {
        merchant_id,
        amount_catr: new Decimal(amount_catr),
        tier,
        status: 'PENDING_BURN',
      },
    });
  }

  async approveRequest(id: string, approved_by: string): Promise<RedemptionRequest> {
    const request = await this.db.redemptionRequest.findUnique({ where: { id } });
    if (!request) throw new Error('Redemption request not found');
    if (request.status !== 'PENDING_BURN') throw new Error('Request is not in PENDING_BURN status');

    return this.db.redemptionRequest.update({
      where: { id },
      data: { status: 'BURN_SUBMITTED', approved_by },
    });
  }

  async confirmBurn(id: string, burn_tx_hash: string): Promise<RedemptionRequest> {
    const request = await this.db.redemptionRequest.findUnique({ where: { id } });
    if (!request) throw new Error('Redemption request not found');
    if (request.status !== 'BURN_SUBMITTED') throw new Error('Request is not in BURN_SUBMITTED status');

    return this.db.redemptionRequest.update({
      where: { id },
      data: { status: 'BURNED', burn_tx_hash },
    });
  }

  async confirmLempirasSent(id: string): Promise<RedemptionRequest> {
    const request = await this.db.redemptionRequest.findUnique({ where: { id } });
    if (!request) throw new Error('Redemption request not found');
    if (request.status !== 'BURNED') throw new Error('Request is not in BURNED status');

    return this.db.redemptionRequest.update({
      where: { id },
      data: { status: 'LEMPIRAS_SENT' },
    });
  }
}
