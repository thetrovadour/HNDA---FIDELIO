import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';
import * as dotenv from 'dotenv';

dotenv.config();

const db = new PrismaClient();

async function main() {
  console.log('Seeding FIDELIO dev database...\n');

  // ── Admin JWT ────────────────────────────────────────────────────────────────
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) throw new Error('JWT_SECRET not set in .env');

  const adminToken = jwt.sign({ role: 'admin', sub: 'seed-admin' }, jwtSecret, {
    algorithm: 'HS256',
    expiresIn: '30d',
  });

  // ── Client ───────────────────────────────────────────────────────────────────
  const client = await db.user.create({
    data: {
      full_name: 'Alejandro Reyes',
      email: 'alejandro@fidelio.hn',
      phone: '+50499990001',
      pin: '1234',
      wallet: {
        create: {
          address: '0x000000000000000000000000000000000000dEaD',
          catr_balance: 0,
        },
      },
    },
    include: { wallet: true },
  });

  // ── Merchant ─────────────────────────────────────────────────────────────────
  const merchant = await db.merchant.create({
    data: {
      name: 'Pulpería Don Henry',
      category: 'Alimentación',
      wallet_address: '0x1234567890abcdef1234567890abcdef12345678',
      contact_email: 'henry@fidelio.hn',
      owner_user_id: client.id,
    },
  });

  // ── Summary ──────────────────────────────────────────────────────────────────
  console.log('=== ADMIN TOKEN (valid 30 days) ===');
  console.log(adminToken);
  console.log('\n=== CLIENT ===');
  console.log(`  ID:      ${client.id}`);
  console.log(`  Name:    ${client.full_name}`);
  console.log(`  PIN:     1234`);
  console.log(`  Wallet:  ${client.wallet?.address}`);
  console.log('\n=== MERCHANT ===');
  console.log(`  ID:      ${merchant.id}`);
  console.log(`  Name:    ${merchant.name}`);
  console.log(`  Wallet:  ${merchant.wallet_address}`);
  console.log('\nDone.');
}

main()
  .catch((e) => { console.error(e); process.exitCode = 1; })
  .finally(() => db.$disconnect());
