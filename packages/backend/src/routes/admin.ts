import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { Decimal } from '@prisma/client/runtime/library';
import { validate } from '../middleware/validate';
import { adminAuth } from '../middleware/auth';
import { MintService } from '../services/mint_service';
import db from '../db';

const POOL_SHARE    = new Decimal('0.35');
const COMMISSION_RATE = new Decimal('0.036');
// Avg CATR per transaction assuming L.500 avg spend × 3.6% commission × 35% pool share
const BREAKEVEN_MONTHLY_FIXED_COSTS = new Decimal('0'); // no fixed costs yet

const BRIDGE_HTTP_URL = process.env.BRIDGE_HTTP_URL ?? 'http://localhost:3002';

const AdminMintSchema = z.object({
  user_id: z.string().uuid(),
  amount: z.number().positive().max(10000),
});

export function adminRouter(mintService: MintService): Router {
  const router = Router();

  // List all users with their wallets — so admin can find user IDs by name
  router.get('/users', adminAuth, async (_req: Request, res: Response) => {
    const users = await db.user.findMany({
      include: { wallet: true },
      orderBy: { created_at: 'desc' },
    });
    res.status(200).json({ data: users });
  });

  // Award CATR to a user by user_id
  router.post('/mint', adminAuth, validate(AdminMintSchema), async (req: Request, res: Response) => {
    const { user_id, amount } = req.body as { user_id: string; amount: number };

    const wallet = await db.wallet.findUnique({ where: { user_id } });
    if (!wallet) {
      res.status(404).json({ error: 'User has no wallet', code: 'NO_WALLET' });
      return;
    }

    const reference_code = `ADMIN-${user_id}-${Date.now()}`;

    const result = await mintService.receivePaymentEvent({
      reference_code,
      amount_lempiras: amount,
      client_wallet: wallet.address,
      source: 'ADMIN',
      received_at: Math.floor(Date.now() / 1000),
    });

    if (result.status === 'NACK') {
      res.status(409).json(result);
      return;
    }

    // Tell the bridge to execute the mint immediately
    try {
      const bridgeRes = await fetch(`${BRIDGE_HTTP_URL}/mint`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reference_code,
          amount_lempiras: amount,
          client_wallet: wallet.address,
          source: 'ADMIN',
          received_at: Math.floor(Date.now() / 1000),
        }),
      });
      if (!bridgeRes.ok) {
        const err = await bridgeRes.text();
        console.error('[admin/mint] Bridge returned error:', err);
      }
    } catch (err) {
      console.error('[admin/mint] Could not reach bridge:', err);
    }

    res.status(200).json({
      data: { reference_code, wallet_address: wallet.address, amount },
    });
  });

  router.get('/runway', adminAuth, async (_req: Request, res: Response) => {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [inflowAgg, paidAgg, merchantCount, recentInflowAgg, recentPaidAgg] = await Promise.all([
      db.transaction.aggregate({
        where: { type: 'SPEND', status: 'CONFIRMED' },
        _sum: { commission_catr: true },
        _count: { id: true },
      }),
      db.rewardPayoutQueue.aggregate({
        where: { status: 'PAID' },
        _sum: { amount_catr: true },
      }),
      db.merchant.count(),
      db.transaction.aggregate({
        where: { type: 'SPEND', status: 'CONFIRMED', created_at: { gte: thirtyDaysAgo } },
        _sum: { commission_catr: true },
      }),
      db.rewardPayoutQueue.aggregate({
        where: { status: 'PAID', created_at: { gte: thirtyDaysAgo } },
        _sum: { amount_catr: true },
      }),
    ]);

    const poolBalance = new Decimal(inflowAgg._sum.commission_catr ?? 0)
      .mul(POOL_SHARE)
      .minus(new Decimal(paidAgg._sum.amount_catr ?? 0));

    const monthlyInflow  = new Decimal(recentInflowAgg._sum.commission_catr ?? 0).mul(POOL_SHARE);
    const monthlyOutflow = new Decimal(recentPaidAgg._sum.amount_catr ?? 0);
    const monthlyNet     = monthlyInflow.minus(monthlyOutflow);

    // Runway: how many months until pool hits zero (only meaningful if outflow > inflow)
    let projected_runway_months: string;
    if (monthlyNet.gte(0)) {
      projected_runway_months = 'sustainable';
    } else {
      const months = poolBalance.div(monthlyNet.abs());
      projected_runway_months = months.toFixed(1);
    }

    // Breakeven: merchants needed so monthly inflow >= monthly outflow
    // Assumes avg 20 txns/merchant/month at L.500 avg → 10,000 CATR/merchant/month gross
    // Pool inflow per merchant: 10000 × 3.6% × 35% = 126 CATR/month
    // Monthly cashback per merchant (avg TX_5 rate 0.5%): 10000 × 0.5% = 50 CATR/month
    // Net per merchant: 76 CATR/month surplus → breakeven is 0 if per-merchant is always surplus
    // The ~83 number comes from covering fixed operational CATR costs (admin mints etc.)
    const totalAdminMinted = await db.pendingMint.aggregate({
      where: { source: 'ADMIN', status: 'MINTED' },
      _sum: { amount_lempiras: true },
    });
    const adminCost = new Decimal(totalAdminMinted._sum?.amount_lempiras ?? 0);
    const poolInflowPerMerchant = new Decimal('126'); // CATR/month per merchant (see above)
    const breakeven_merchants = adminCost.gt(0)
      ? adminCost.div(poolInflowPerMerchant).toFixed(0)
      : 'N/A';

    res.status(200).json({
      data: {
        pool_balance: poolBalance.toFixed(4),
        active_merchants: merchantCount,
        monthly_pool_inflow: monthlyInflow.toFixed(4),
        monthly_cashback_outflow: monthlyOutflow.toFixed(4),
        monthly_net: monthlyNet.toFixed(4),
        projected_runway_months,
        breakeven_merchants,
        total_transactions: inflowAgg._count.id,
      },
    });
  });

  return router;
}
