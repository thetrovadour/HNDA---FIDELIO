import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import { Decimal } from '@prisma/client/runtime/client';
import { evaluateGcaVesting, currentPriceFloor, approveGcaGift } from '../src/services/gca_service';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const db = new PrismaClient({ adapter } as any);

// ─── Helpers ──────────────────────────────────────────────────────────────────

function hr() { console.log('─'.repeat(60)); }

function fmt(label: string, value: string | number) {
  console.log(`  ${label.padEnd(28)} ${value}`);
}

async function resolveMerchant(idOrName: string) {
  const merchant = await db.merchant.findFirst({
    where: {
      OR: [{ id: idOrName }, { name: { contains: idOrName, mode: 'insensitive' } }],
    },
  });
  if (!merchant) {
    console.error(`✗ Merchant not found: "${idOrName}"`);
    process.exit(1);
  }
  return merchant;
}

// ─── Subcommands ──────────────────────────────────────────────────────────────

async function cmdStatus(arg?: string) {
  const priceFloor = await currentPriceFloor(db);

  if (!arg) {
    // All merchants
    const allocations = await db.merchantGcaAllocation.findMany({
      include: { merchant: { select: { id: true, name: true } } },
      orderBy: { gca_balance: 'desc' },
    });

    hr();
    console.log('  GCA NETWORK STATUS');
    hr();
    fmt('Price floor (active)', `L. ${priceFloor.toFixed(4)} / GCA`);
    fmt('Merchants with allocation', String(allocations.length));
    hr();

    for (const a of allocations) {
      const hnlValue = new Decimal(a.gca_balance).mul(priceFloor);
      console.log(`\n  ${a.merchant.name} (${a.merchant_id.slice(0, 8)}...)`);
      fmt('  GCA balance', `${new Decimal(a.gca_balance).toFixed(4)} GCA  (~L. ${hnlValue.toFixed(2)})`);
      fmt('  Milestones claimed', `${a.milestones_claimed} / 10`);
      fmt('  Lifetime effective CATR', new Decimal(a.lifetime_effective_catr).toFixed(2));
      const nextAt = (a.milestones_claimed + 1) * 25000;
      fmt('  Next milestone at', `${nextAt.toLocaleString()} effective CATR`);
    }
    console.log();
    hr();
    return;
  }

  // Single merchant
  const merchant = await resolveMerchant(arg);
  const alloc = await db.merchantGcaAllocation.findUnique({ where: { merchant_id: merchant.id } });

  if (!alloc) {
    console.log(`\n  No GCA allocation found for "${merchant.name}".`);
    return;
  }

  const hnlValue = new Decimal(alloc.gca_balance).mul(priceFloor);
  const nextAt   = (alloc.milestones_claimed + 1) * 25000;

  hr();
  console.log(`  GCA STATUS — ${merchant.name}`);
  hr();
  fmt('Merchant ID', merchant.id);
  fmt('GCA balance', `${new Decimal(alloc.gca_balance).toFixed(4)} GCA`);
  fmt('Estimated HNL value', `L. ${hnlValue.toFixed(2)}`);
  fmt('Milestones claimed', `${alloc.milestones_claimed} / 10`);
  fmt('Milestones remaining', String(10 - alloc.milestones_claimed));
  fmt('Lifetime effective CATR', new Decimal(alloc.lifetime_effective_catr).toFixed(2));
  fmt('Next milestone at', `${nextAt.toLocaleString()} effective CATR`);
  fmt('Price floor (active)', `L. ${priceFloor.toFixed(4)} / GCA`);
  console.log();

  const history = await db.gcaTransaction.findMany({
    where: { merchant_id: merchant.id },
    orderBy: { created_at: 'desc' },
    take: 10,
  });

  if (history.length) {
    console.log('  Recent GCA transactions (last 10):');
    for (const tx of history) {
      const date = tx.created_at.toLocaleDateString('es-HN');
      console.log(`    [${date}] ${tx.type.padEnd(10)} ${new Decimal(tx.amount_gca).toFixed(4)} GCA  ${tx.notes ?? ''}`);
    }
  }
  console.log();
  hr();
}

async function cmdVest(arg?: string) {
  if (!arg) {
    console.error('Usage: gca vest <merchant_id|name>');
    process.exit(1);
  }

  const merchant = await resolveMerchant(arg);
  const before   = await db.merchantGcaAllocation.findUnique({ where: { merchant_id: merchant.id } });

  if (!before) {
    console.error(`✗ No GCA allocation for "${merchant.name}".`);
    process.exit(1);
  }

  console.log(`\n  Evaluating GCA vesting for "${merchant.name}"...`);
  await evaluateGcaVesting(db, merchant.id);

  const after = await db.merchantGcaAllocation.findUnique({ where: { merchant_id: merchant.id } });

  hr();
  console.log('  VEST RESULT');
  hr();
  fmt('Merchant', merchant.name);
  fmt('GCA balance before', `${new Decimal(before.gca_balance).toFixed(4)} GCA`);
  fmt('GCA balance after', `${new Decimal(after!.gca_balance).toFixed(4)} GCA`);
  fmt('Milestones before', String(before.milestones_claimed));
  fmt('Milestones after', String(after!.milestones_claimed));

  const gained = new Decimal(after!.gca_balance).sub(new Decimal(before.gca_balance));
  if (gained.gt(0)) {
    fmt('GCA earned this run', `+${gained.toFixed(4)} GCA`);
    console.log('\n  ✓ Vesting applied.');
  } else {
    console.log('\n  — No new milestones reached. No GCA awarded.');
  }
  console.log();
  hr();
}

async function cmdSetFloor(arg?: string) {
  if (!arg || isNaN(Number(arg)) || Number(arg) <= 0) {
    console.error('Usage: gca set-floor <price_hnl>  (must be a positive number)');
    process.exit(1);
  }

  const price = new Decimal(arg);
  const previous = await db.gcaPriceFloor.findFirst({ where: { active: true }, orderBy: { set_at: 'desc' } });

  await db.$transaction(async (tx) => {
    await tx.gcaPriceFloor.updateMany({ where: { active: true }, data: { active: false } });
    await tx.gcaPriceFloor.create({
      data: { price_hnl: price, set_by: 'gca-admin-script', active: true },
    });
  });

  hr();
  console.log('  PRICE FLOOR UPDATED');
  hr();
  fmt('Previous floor', previous ? `L. ${new Decimal(previous.price_hnl).toFixed(4)}` : 'None (default L. 1.0000)');
  fmt('New floor', `L. ${price.toFixed(4)} / GCA`);
  console.log('\n  ✓ All previous floors deactivated.');
  console.log();
  hr();
}

async function cmdGift(arg?: string, amountArg?: string) {
  if (!arg) {
    console.error('Usage: gca gift <merchant_id|name> [amount_gca]');
    process.exit(1);
  }

  let amountGca: number | undefined;
  if (amountArg !== undefined) {
    amountGca = Number(amountArg);
    if (isNaN(amountGca) || amountGca <= 0) {
      console.error('✗ amount_gca must be a positive number');
      process.exit(1);
    }
  }

  const merchant = await resolveMerchant(arg);

  try {
    const txHash = await approveGcaGift(db, merchant.id, amountGca);
    const alloc  = await db.merchantGcaAllocation.findUnique({ where: { merchant_id: merchant.id } });
    const awarded = amountGca ?? 1200;
    hr();
    console.log('  WELCOME GIFT APPROVED');
    hr();
    fmt('Merchant', merchant.name);
    fmt('GCA awarded', `${awarded.toLocaleString('en-US', { minimumFractionDigits: 4 })} GCA`);
    fmt('New GCA balance', `${new Decimal(alloc!.gca_balance).toFixed(4)} GCA`);
    if (txHash) fmt('On-chain tx', txHash);
    console.log('\n  ✓ Gift approved and minted on Base Sepolia.');
    console.log();
    hr();
  } catch (err: any) {
    console.error(`✗ ${err.message}`);
    process.exit(1);
  }
}

async function cmdListRedemptions(arg?: string) {
  const status = (arg?.toUpperCase() ?? 'PENDING') as 'PENDING' | 'APPROVED' | 'REJECTED';
  const valid  = ['PENDING', 'APPROVED', 'REJECTED'];

  if (!valid.includes(status)) {
    console.error(`✗ Invalid status "${arg}". Use: PENDING | APPROVED | REJECTED`);
    process.exit(1);
  }

  const requests = await db.gcaRedemptionRequest.findMany({
    where: { status },
    include: { merchant: { select: { name: true, wallet_address: true } } },
    orderBy: { created_at: 'asc' },
  });

  hr();
  console.log(`  GCA REDEMPTION REQUESTS — ${status} (${requests.length})`);
  hr();

  if (!requests.length) {
    console.log(`  No ${status.toLowerCase()} redemption requests.`);
  }

  for (const r of requests) {
    console.log(`\n  ID: ${r.id}`);
    fmt('  Merchant', r.merchant.name);
    fmt('  Wallet', r.merchant.wallet_address ?? '—');
    fmt('  Amount GCA', `${new Decimal(r.amount_gca).toFixed(4)} GCA`);
    fmt('  Price floor at request', `L. ${new Decimal(r.price_floor_hnl).toFixed(4)}`);
    fmt('  Estimated HNL', `L. ${new Decimal(r.amount_hnl_estimated).toFixed(2)}`);
    fmt('  Status', r.status);
    fmt('  Submitted', r.created_at.toLocaleString('es-HN'));
    if (r.approved_by) fmt('  Processed by', r.approved_by);
    if (r.notes) fmt('  Notes', r.notes);
  }

  console.log();
  hr();
}

// ─── Entry point ──────────────────────────────────────────────────────────────

async function main() {
  const [, , subcommand, arg, arg2] = process.argv;

  const usage = `
FIDELIO GCA Admin Script
Usage: npm run gca -- <subcommand> [arg]

Subcommands:
  status [merchant_id|name]       GCA balance and milestones (all or single merchant)
  gift <merchant_id|name> [amount] Approve evaluated GCA welcome gift (default: 1,200)
  vest <merchant_id|name>         Manually trigger vesting evaluation
  set-floor <price_hnl>           Set a new active GCA price floor
  list-redemptions [status]       List redemption requests (default: PENDING)
`;

  try {
    switch (subcommand) {
      case 'status':           await cmdStatus(arg); break;
      case 'gift':             await cmdGift(arg, arg2); break;
      case 'vest':             await cmdVest(arg); break;
      case 'set-floor':        await cmdSetFloor(arg); break;
      case 'list-redemptions': await cmdListRedemptions(arg); break;
      default:
        console.log(usage);
        process.exit(subcommand ? 1 : 0);
    }
  } finally {
    await db.$disconnect();
    await pool.end();
  }
}

main().catch((err) => {
  console.error('✗ Error:', err.message);
  process.exit(1);
});
