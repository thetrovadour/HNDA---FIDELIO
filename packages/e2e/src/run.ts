import * as dotenv from 'dotenv';
dotenv.config();

// ─── Configuration ────────────────────────────────────────────────────────────

const BACKEND_URL = process.env.BACKEND_URL ?? 'http://localhost:3001';
const BRIDGE_SECRET = process.env.BRIDGE_SECRET ?? 'change_me_in_production';

// Unique identifiers for this test run — safe to leave in fidelio_dev for inspection
const RUN_TS = Date.now();
const TEST_WALLET = `0xE2E${RUN_TS.toString(16).toUpperCase()}`;
const TEST_EMAIL  = `e2e-${RUN_TS}@test.fidelio`;

// ─── Result tracking ──────────────────────────────────────────────────────────

interface CheckResult {
  name: string;
  passed: boolean;
  detail: string;
}

const results: CheckResult[] = [];

function pass(name: string, detail: string): void {
  results.push({ name, passed: true, detail });
  console.log(`  ✓  ${name}: ${detail}`);
}

function fail(name: string, detail: string): void {
  results.push({ name, passed: false, detail });
  console.error(`  ✗  ${name}: ${detail}`);
}

// ─── HTTP helpers ─────────────────────────────────────────────────────────────

async function apiGet(path: string): Promise<any> {
  const res = await fetch(`${BACKEND_URL}${path}`);
  return res.json();
}

async function apiPost(path: string, body: object): Promise<any> {
  const res = await fetch(`${BACKEND_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return res.json();
}

async function bridgePost(endpoint: string, body: object): Promise<any> {
  const res = await fetch(`${BACKEND_URL}/internal/bridge/${endpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-bridge-secret': BRIDGE_SECRET,
    },
    body: JSON.stringify(body),
  });
  return res.json();
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  console.log('\n================================================================');
  console.log('  FIDELIO Phase E — End-to-End Integration Test');
  console.log('================================================================\n');

  // ── [0] Health check ───────────────────────────────────────────────────────
  console.log('[0] Health check');
  try {
    const res = await fetch(`${BACKEND_URL}/health`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    pass('Backend reachable', `${BACKEND_URL}/health → 200`);
  } catch (err: any) {
    fail('Backend reachable', `${err.message}`);
    console.error(
      '\n  Cannot continue — start the backend first:\n' +
      '  cd packages/backend && npm run dev\n'
    );
    process.exit(1);
  }

  // ── [SEED] Test user + wallet ──────────────────────────────────────────────
  console.log('\n[SEED] Creating test user and wallet');

  const userRes = await apiPost('/api/users', {
    full_name: 'E2E Integration Test User',
    email: TEST_EMAIL,
    phone: '+504-0000-0000',
  });

  const userId: string | undefined = userRes.data?.id;
  if (!userId) {
    fail('Seed — create user', JSON.stringify(userRes));
    process.exit(1);
  }
  pass('Seed — create user', `id=${userId}  email=${TEST_EMAIL}`);

  const walletRes = await apiPost('/api/wallets', {
    user_id: userId,
    address: TEST_WALLET,
  });

  if (!walletRes.data?.id) {
    fail('Seed — create wallet', JSON.stringify(walletRes));
    process.exit(1);
  }
  pass('Seed — create wallet', `address=${TEST_WALLET}`);

  // ── [TX 1–5] Five end-to-end mint transactions ────────────────────────────
  //
  // Flow per transaction:
  //   POST /internal/bridge/payment-received  → backend creates PendingMint (ACK)
  //   POST /internal/bridge/mint-confirmed    → backend marks CONFIRMED, evaluates rewards
  //
  // Mock tx hashes stand in for the real on-chain response.
  // When Phase A is deployed, the bridge will supply real hashes from Base Sepolia.

  const mints = [
    { label: 'TX-1', ref: `CATR-${TEST_WALLET}-${RUN_TS}1`, amount: 500 },
    { label: 'TX-2', ref: `CATR-${TEST_WALLET}-${RUN_TS}2`, amount: 200 },
    { label: 'TX-3', ref: `CATR-${TEST_WALLET}-${RUN_TS}3`, amount: 100 },
    { label: 'TX-4', ref: `CATR-${TEST_WALLET}-${RUN_TS}4`, amount: 150 },
    { label: 'TX-5', ref: `CATR-${TEST_WALLET}-${RUN_TS}5`, amount: 75  },
  ];

  for (let i = 0; i < mints.length; i++) {
    const { label, ref, amount } = mints[i];
    console.log(`\n[${label}] ${ref}  —  ${amount} L`);

    // Step 1: payment received by bridge → backend records PendingMint
    const ackRes = await bridgePost('payment-received', {
      reference_code: ref,
      amount_lempiras: amount,
      client_wallet: TEST_WALLET,
      source: 'WEBHOOK',
      received_at: Math.floor(Date.now() / 1000),
    });

    if (ackRes.status !== 'ACK') {
      fail(`${label} — payment-received`, `Expected ACK, got: ${JSON.stringify(ackRes)}`);
      continue;
    }
    pass(`${label} — payment-received`, 'ACK — PendingMint created');

    // Step 2: mint confirmed on-chain (mock hash) → backend marks CONFIRMED
    const mockTxHash = `0xMOCK${ref.replace(/[^a-zA-Z0-9]/g, '').toUpperCase()}`;
    const confirmRes = await bridgePost('mint-confirmed', {
      reference_code: ref,
      tx_hash: mockTxHash,
      block_number: 100_000 + i,
    });

    if (confirmRes.status !== 'ok') {
      fail(`${label} — mint-confirmed`, JSON.stringify(confirmRes));
      continue;
    }
    pass(`${label} — mint-confirmed`, `ok — tx_hash=${mockTxHash.slice(0, 20)}…`);
  }

  // ── [DUP] Duplicate reference_code must be rejected ───────────────────────
  console.log('\n[DUP] Duplicate reference_code rejection');
  const dupRes = await bridgePost('payment-received', {
    reference_code: mints[0].ref,   // same ref as TX-1
    amount_lempiras: 500,
    client_wallet: TEST_WALLET,
    source: 'WEBHOOK',
    received_at: Math.floor(Date.now() / 1000),
  });

  if (dupRes.status === 'NACK') {
    pass('Duplicate rejected', `NACK — reason: "${dupRes.reason}"`);
  } else {
    fail('Duplicate rejected', `Expected NACK, got: ${JSON.stringify(dupRes)}`);
  }

  // ── [VERIFY] Transaction count ─────────────────────────────────────────────
  console.log('\n[VERIFY] Transaction history');
  const txListRes = await apiGet(`/api/users/${userId}/transactions`);
  const txCount: number = txListRes.data?.length ?? 0;

  if (txCount === 5) {
    pass('Transaction count', '5 CONFIRMED transactions on record');
  } else {
    fail('Transaction count', `Expected 5, found ${txCount}`);
  }

  // ── [VERIFY] TX_5 reward milestone ────────────────────────────────────────
  console.log('\n[VERIFY] TX_5 reward milestone');
  const rewardsRes = await apiGet(`/api/rewards/${userId}`);
  const milestones: any[] = rewardsRes.data ?? [];
  const tx5Milestone = milestones.find((m: any) => m.type === 'TX_5');

  if (tx5Milestone) {
    pass('TX_5 milestone', `Unlocked — ${tx5Milestone.amount_catr} CATR queued for payout`);
  } else {
    fail('TX_5 milestone', `Not found. Milestones received: ${JSON.stringify(milestones)}`);
  }

  // ── Report ─────────────────────────────────────────────────────────────────
  const passed = results.filter(r => r.passed).length;
  const total  = results.length;

  console.log('\n================================================================');
  console.log(`  Phase E Result: ${passed}/${total} checks passed`);
  console.log('================================================================');
  console.log(`  Run ID  : ${RUN_TS}`);
  console.log(`  User    : ${TEST_EMAIL}  (id: ${userId})`);
  console.log(`  Wallet  : ${TEST_WALLET}`);
  console.log('  Note    : test data remains in fidelio_dev for inspection');
  console.log('================================================================\n');

  if (passed < total) {
    process.exit(1);
  }
}

main().catch((err: unknown) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
