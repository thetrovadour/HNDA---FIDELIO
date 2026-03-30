# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## Session Start — Always Do This First

At the start of every session, remind Cristian of:
1. **Current FIDELIO build phase** — which phase is active (A/B/C/D/E)
2. **What is complete** — checked-off phases and modules
3. **What is in progress** — current work
4. **What is next** — immediate next step

Continue doing this until FIDELIO is in complete production. Update this file when phase status changes.

**Current status (as of initial setup):**

| Phase | Deliverable | Status |
|---|---|---|
| A | CATRToken.sol on Base Sepolia + Gnosis Safe | ⬜ Not started |
| B | MerL1nk Etapa 1 (C++ Core + Node.js Bridge) | 🔄 In progress |
| C | Backend Core (Express API + PostgreSQL/Prisma) | ⬜ Not started |
| D | Web MVP (client + merchant + admin views) | ⬜ Not started |
| E | Integration — 5 end-to-end transactions | ⬜ Not started |

**Only the bloom filter (packages/merlink/core/src/bloom_filter.cpp + murmurhash3) is implemented.**

---

## How Cristian Thinks — Collaboration Style

Cristian is an electrical engineer who thinks in blocks of knowledge linked by metaphors and analogies. He wants:
- **Explanation before action** — justify every decision before coding it
- **Plan before code** — always show the plan first, get approval, then implement
- **ELI5 for complex topics** — explain like he's five when something is abstract
- **Decision reports** — after each decision, a concise record of what was done and why
- **Connections to the macro** — how does this piece connect to the full FIDELIO system?

---

## Build Commands

### Monorepo (Turborepo)
```bash
npm run build        # Build all packages in dependency order
npm run test         # Test all packages
npm run dev          # Run all dev servers concurrently
```

### MerL1nk C++ Core
```bash
cd packages/merlink/core
mkdir -p build && cd build
cmake ..
make
ctest                        # Run all C++ tests
./bloom_filter_test          # Run bloom filter test directly
```

### Individual packages (once implemented)
```bash
cd packages/contracts && npx hardhat test           # Smart contract tests
cd packages/contracts && npx hardhat run scripts/deploy.ts --network base-sepolia
```

---

## Architecture — The 8 Components

```
External World (bank emails, NFC, webhooks)
        │
        ▼
[ Component 8: MerL1nk ]
  C++ Core  ──IPC──►  Node.js Bridge
  (validation,         (ethers.js:
   bloom filter,        mint, burn,
   retry queue,         reward, heartbeat)
   vault monitor)
        │
        ▼
[ Off-Chain Layer ]
  Web App (Next.js) ◄──► Backend API (Express)
                               │
                         PostgreSQL (Prisma)
        │
        ▼
[ On-Chain Layer — Base (Ethereum L2) ]
  CATRToken.sol         Gnosis Safe 2/2
  rewardPool wallet     HNDA treasury wallet
```

---

## Non-Negotiable Invariants

These rules are **hardcoded in the smart contract** and must never be violated in any layer:

- **MINT-BEFORE-PAY**: payment confirmed → mint CATR → client receives → client pays merchant
- **BURN-BEFORE-REDEEM**: merchant requests redemption → burn CATR on-chain → HNDA transfers Lempiras
- **0.63% commission** on every CATR transfer: 75% → HNDA treasury, 25% → reward pool
- **Only merchants** redeem CATR → Lempiras. Clients spend CATR only within the network.
- **CATR supply cap: 50,000,000** — a circulation ceiling, not a countdown (burn.ts is justified because this is a closed-loop revolving system)

---

## MerL1nk — The Only Implemented Package

`packages/merlink/core/` is the only package with real code. The C++ modules are:

- **bloom_filter.cpp** — probabilistic duplicate check (O(1)) — contains `0xF1DE0001` project signature constant
- **murmurhash3.cpp** — hash function used by bloom filter
- **Remaining .cpp files** (email_parser, retry_queue, vault_monitor, nfc_reader, webhook_receiver) — **stubs, not yet implemented**

The Node.js bridge (`packages/merlink/bridge/`) and all other packages (`contracts/`, `backend/`, `web/`) have **empty src/ directories**.

---

## Payment Flow (Etapa 1 — Manual Bank Transfer)

1. Client enters amount → app generates reference code: `CATR-[wallet]-[timestamp]`
2. Client manually transfers Lempiras to HNDA's Atlántida account with reference in memo
3. Atlántida sends email notification to HNDA inbox
4. MerL1nk C++ email_parser reads notification (polling every 60 seconds)
5. bloom_filter checks if reference was seen before → if uncertain, confirm against `processed_references` table
6. MerL1nk Bridge calls `contract.mint(clientWallet, amount)` on Base Sepolia
7. Client sees CATR in wallet

*BAC Credomatic API replaces step 2–4 in Etapa 2.*

---

## Database Schema (Planned — Prisma, not yet created)

11 tables: `users`, `wallets`, `merchants`, `transactions`, `pending_mints`, `processed_references`, `redemption_requests`, `reward_milestones`, `merchant_visits`, `referrals`, `reward_payout_queue`

`pending_mints` is critical — it tracks the gap between "payment confirmed" and "mint executed." A daily reconciliation cron (`jobs/reconciliation.ts`) resolves unresolved entries.

---

## Reward System

| Pool | Commission Share | Trigger |
|---|---|---|
| Milestone Unlocks | 10% | Transaction #5, #10, #25 |
| Cross-Merchant Bonus | 10% | 3+ unique merchants in 30 days |
| Referral Pool | 5% | Referred user buys CATR |

Payout authorization tiers: <50 CATR → auto | 50–500 → admin approval | >500 → Gnosis Safe 2-of-2 (Cristian + Víctor the lawyer).

---

## Key Decisions to Know

- **Why C++ for MerL1nk Core?** Speed, determinism, no GC pauses, 24/7 operation. The email parser and bloom filter need to be reliable at the boundary between the physical world and the blockchain.
- **Why Node.js for the Bridge?** ethers.js ecosystem — best library for Ethereum interaction.
- **Why Base (L2)?** Low transaction costs for a Honduran loyalty network.
- **Why custodial wallets?** Most clients won't have MetaMask. Backend manages wallets for them.
- **Bloom filter false positives** (~1%) fall back to PostgreSQL `processed_references` for confirmation — never reject a valid payment.
