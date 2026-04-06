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

## Session End — Always Do This Last

Before closing, ask:
> "Before we close — do you want me to update CLAUDE.md with today's decisions?"

Then update this file with any key decisions, new modules, or status changes.

For additional project context, see `Organization and Research/Fidelio-Architecture-Planv1.1.md`.

---

**Current status (as of 2026-04-06):**

| Phase | Deliverable | Status |
|---|---|---|
| A | CATRToken.sol on Base Sepolia + VaultOp (Gnosis Safe 2-of-2) | 🔄 Contract complete — awaiting wallet deployment |
| B | MerL1nk Etapa 1 (C++ Core + Node.js Bridge) | ✅ Complete — 74/74 tests passing |
| C | Backend Core (Express API + PostgreSQL/Prisma) | ✅ Complete — 44/44 tests passing |
| D | Web MVP (client + merchant + admin views) | ✅ Complete — build passing |
| E | Integration — 5 end-to-end transactions | ⬜ Not started |

**Phase B — C++ Core module status:**

| Module | Status |
|---|---|
| `bloom_filter.cpp` + `murmurhash3.cpp` | ✅ Complete — 10/10 tests passing |
| `payment_event.h` | ✅ Complete |
| `retry_queue.cpp` | ✅ Complete — 8/8 tests passing |
| `email_parser.cpp` | ✅ Complete — 12/12 tests passing |
| `webhook_receiver.cpp` | ✅ Complete — 12/12 tests passing |
| `nfc_reader.cpp` | ✅ Complete — 14/14 tests passing |
| `vault_monitor.cpp` | ✅ Complete — 10/10 tests passing (stub backend, Phase A wires the real one) |
| Node.js Bridge (`packages/merlink/bridge/`) | ⬜ Next |

**Total tests passing: 87/87**

---

## How Cristian Thinks — Collaboration Style

Cristian is an electrical engineer who thinks in blocks of knowledge linked by metaphors and analogies. He wants:
- **Explanation before action** — justify every decision before coding it
- **Plan before code** — always show the plan first, get approval, then implement
- **ELI5 for complex topics** — explain like he's five when something is abstract
- **Decision reports** — after each decision, a concise record of what was done and why
- **Connections to the macro** — how does this piece connect to the full FIDELIO system?
- **Modularity as a core principle** — Cristian sees programming as modular construction: the more independently a component can be built, tested, replaced, and restarted, the better. Architecture decisions should always favor loose coupling and clear boundaries between components.

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
cmake .. -DCMAKE_BUILD_TYPE=Release   # Must use Release — Debug + fsanitize breaks binaries
make
ctest                        # Run all C++ tests
./bloom_filter_test          # Run individual test binaries
./retry_queue_test
./email_parser_test
```

### Smart Contracts (Phase A, not yet started)
```bash
cd packages/contracts && npx hardhat test
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
  CATRToken.sol         VaultOp (Gnosis Safe 2/2)  // manual gate for high-value redemptions (>500 CATR)
  rewardPool wallet     HNDA treasury wallet
```

### Input Adapter Pattern

All input sources produce a common `PaymentEvent` struct. Downstream pipeline never sees raw source format:

```
[ EmailParser  ]  ──┐
[ NFCReader    ]  ──┼──►  PaymentEvent  ──►  RetryQueue  ──►  Bridge  ──►  Mint
[ Webhook      ]  ──┘
```

Switching from email to NFC is a one-module swap — bloom filter, retry queue, and bridge are unchanged.

---

## Non-Negotiable Invariants

Hardcoded in the smart contract — must never be violated at any layer:

- **MINT-BEFORE-PAY**: payment confirmed → mint CATR → client receives → client pays merchant
- **BURN-BEFORE-REDEEM**: merchant requests redemption → burn CATR on-chain → HNDA transfers Lempiras
- **0.63% commission** on every CATR transfer: 75% → HNDA treasury, 25% → reward pool
- **Only merchants** redeem CATR → Lempiras. Clients spend CATR only within the network.
- **CATR supply cap: 50,000,000** — revolving closed-loop system (burn is justified)

---

## MerL1nk — Implemented Modules

`packages/merlink/core/` — C++ core:

- **bloom_filter.cpp** — probabilistic duplicate check (O(1)), seed `0xF1DE0001`, Kirsch-Mitzenmacher double-hashing with MurmurHash3
- **murmurhash3.cpp** — hash function used by bloom filter
- **payment_event.h** — shared `PaymentEvent` struct: `{reference_code, amount_lempiras, client_wallet, source, received_at}`
- **retry_queue.cpp** — thread-safe FIFO queue; parser pushes, bridge pops; in-memory only (PostgreSQL `pending_mints` handles crash recovery)
- **email_parser.cpp** — polls Gmail inbox via IMAP (libcurl, port 993, every 60s); parses Atlántida bank notification emails; pushes `PaymentEvent` to `RetryQueue`

Remaining stubs: `vault_monitor`, `nfc_reader`, `webhook_receiver`

Phase C backend scaffold is in `packages/backend/` — see Phase C section below.

---

## Payment Flow (Etapa 1 — Manual Bank Transfer)

1. Client enters amount → app generates reference code: `CATR-[wallet]-[timestamp]`
2. Client manually transfers Lempiras to HNDA's Atlántida account with reference in memo
3. Atlántida sends email notification to HNDA's dedicated Gmail inbox
4. `email_parser` polls inbox via IMAP every 60s, parses notification
5. `bloom_filter` checks for duplicate → false positives (~1%) fall back to `processed_references` table
6. `retry_queue` receives `PaymentEvent`; Bridge pops and calls `contract.mint(clientWallet, amount)` on Base
7. Client sees CATR in wallet

*BAC Credomatic API replaces steps 2–4 in Etapa 2. NFC replaces steps 1–4 long-term.*

---

## Email Parser — Expected Format

```
Estimado HNDA,

Banco Atlántida le informa que ha recibido la siguiente transferencia:

Monto recibido: L. 500.00
Referencia de pago: CATR-0xABCD1234-1711800000
Nombre del ordenante: Juan Carlos Pérez
Fecha: 30/03/2026 14:35:22
```

Key markers: `"Monto recibido: L. "` → amount as double | `"Referencia de pago: "` → reference code token

---

## Database Schema (Phase C — Prisma, migrated ✅)

11 tables live in `fidelio_dev` PostgreSQL: `User`, `Wallet`, `Merchant`, `Transaction`, `PendingMint`, `ProcessedReference`, `RedemptionRequest`, `RewardMilestone`, `MerchantVisit`, `Referral`, `RewardPayoutQueue`

Schema: `packages/backend/prisma/schema.prisma` | Migration: `prisma/migrations/20260402041651_init/`

`PendingMint` is critical — tracks the gap between "payment confirmed" and "mint executed." Daily reconciliation cron (`jobs/reconciliation.ts`) resolves unresolved entries.

---

## Reward System

| Pool | Commission Share | Trigger |
|---|---|---|
| Milestone Unlocks | 10% | Transaction #5, #10, #25 |
| Cross-Merchant Bonus | 10% | 3+ unique merchants in 30 days |
| Referral Pool | 5% | Referred user buys CATR |

Payout authorization: <50 CATR → auto | 50–500 → admin approval | >500 → VaultOp 2-of-2 (Cristian + Víctor the lawyer) // VaultOp = Gnosis Safe; named for what it operates, not what operates it

---

## Key Decisions

- **Why C++ for MerL1nk Core?** Speed, determinism, no GC pauses, 24/7 operation.
- **Why Node.js for the Bridge?** ethers.js is the best Ethereum interaction library.
- **Why Base (L2)?** Low transaction costs for a Honduran loyalty network.
- **Why custodial wallets?** Most clients won't have MetaMask.
- **Why IMAP for email?** Zero cost — Gmail supports IMAP natively on port 993 with an App Password.
- **Why RetryQueue instead of direct callback?** Decouples retry logic from parsing layer. Bridge failures don't corrupt the parser.
- **Why input adapter pattern?** NFC tap-to-pay is the long-term goal. `PaymentEvent` makes that a one-module swap.
- **cmake Release flag** — `cmake -DCMAKE_BUILD_TYPE=Release` required. Debug builds with `-fsanitize=address` cause mismatched-flag failures in test binaries.

---

## Test Reports

Saved in `packages/merlink/core/tests/reports/`:
- `2026-03-30_bloom_filter_test_report.md`
- `2026-03-30_email_parser_retry_queue_test_report.md`
- `2026-03-30_webhook_receiver_test_report.md`
- `2026-03-30_nfc_reader_test_report.md`
- `2026-03-30_vault_monitor_test_report.md`

Saved in `packages/merlink/bridge/tests/reports/`:
- `2026-03-31_nodejs_bridge_test_report.md`

Saved in `packages/contracts/tests/reports/`:
- `2026-03-31_CATRToken_test_report.md`

Saved in `packages/contracts/Efficiency/`:
- `2026-03-31_CATRToken_Gas_Analysis.md`

---

## AI Development Stack

- **Claude Code CLI** — autonomous agent in this repo
- **oh-my-claudecode** — multi-agent orchestration (installed)
- **Ollama + Qwen3** — local AI on aiControl (pending hardware)
- **Hermes Agent** — persistent memory layer (pending aiControl)

---

## Session Log

---

### Session 1 — 2026-03-30
**Location:** San Pedro Sula, Honduras (CST, UTC-6)
**Start:** 14:10:05 CST | **End:** 21:46:43 CST | **Duration:** ~7h 36m

#### What happened
- Created root `CLAUDE.md` (moved from `ClaudeProfile/` to repo root for auto-load)
- Built and tested 3 new C++ modules: `webhook_receiver`, `nfc_reader`, `vault_monitor`
- **Phase B C++ Core declared complete** — 66/66 tests passing across 6 modules
- Wrote 4 test reports saved in `packages/merlink/core/tests/reports/`
- Created `Organization and Research/Seasons/` folder
- Wrote Season 1 report: *"Season 1: C++ and a new Journey ahead"*

#### Key insights from this session

**1. The input adapter pattern is the most valuable decision of Phase B.**
All three carriers (email, webhook, NFC) produce the same `PaymentEvent`. This was not obvious at the start — it emerged as the architecture took shape. The downstream pipeline never needed to change once, across three completely different input sources.

**2. Abstract interfaces over concrete implementations, always.**
`NfcHardware` and `VaultBackend` are both abstract because the real things don't exist yet. This wasn't a concession — it was deliberate. The tests are complete, the interfaces are correct, and the real implementations slot in without touching anything else.

**3. Static parse methods are the right pattern for testability.**
`EmailParser::parse_body`, `WebhookReceiver::parse_body`, `NfcReader::parse_payload` — all static. 52 of 66 tests run with no threads, no queues, no hardware, no network. Fast, deterministic, impossible to flake.

**4. The bloom filter false positive rate (~1%) is a feature, not a bug.**
The 1% that slip through get confirmed against PostgreSQL. The 99% that are clearly duplicates never touch the database. This is the correct tradeoff for a 24/7 payment system.

**5. cmake -DCMAKE_BUILD_TYPE=Release is non-negotiable.**
Debug builds with `-fsanitize=address` cause mismatched-flag failures when the library and test binaries are compiled with different sanitizer settings. Always Release for this project.

**6. cpp-httplib is the right choice for the webhook receiver.**
Single header file, zero new CMake dependencies, sufficient for one endpoint. Bringing in Boost.Beast for a single POST route would have been engineering for its own sake.

**7. The Node.js Bridge is the most consequential piece left in Phase B.**
Everything built so far moves data around in memory. The bridge is the first piece that writes to the blockchain. It is also the first piece where a bug has real financial consequences. It deserves the same rigor — and a slower, more deliberate design session.

#### Next session agenda
1. Design and build the Node.js Bridge (`packages/merlink/bridge/`)
2. IPC mechanism between C++ core and Node.js (stdin/stdout pipe or Unix socket)
3. ethers.js `contract.mint()` call on Base Sepolia
4. Begin Phase A planning (CATRToken.sol)

---

### Session 2 — 2026-03-31
**Location:** San Pedro Sula, Honduras (CST, UTC-6)

#### What happened
- Built and tested **Node.js Bridge** (`packages/merlink/bridge/`) — 8/8 tests passing
- Built and tested **CATRToken.sol** (`packages/contracts/`) — 13/13 tests passing
- Ran full gas efficiency analysis on CATRToken.sol — report saved in `packages/contracts/Efficiency/`
- **Phase B declared complete** — 74/74 tests (66 C++ core + 8 Node.js Bridge)
- **Phase A contract declared complete** — pending real wallet deployment
- **Total tests across all modules: 87/87 passing**

#### Key decisions from this session

**1. Unix domain socket chosen as IPC mechanism (rejected stdin/stdout pipe).**
C++ core and Node.js bridge run as independent processes. Each restarts without killing the other. The socket reinforces the modularity boundary — which is the core design principle of FIDELIO.

**2. Modularity is Cristian's core engineering principle.**
Explicitly documented in "How Cristian Thinks." The more independently a component can be built, tested, replaced, and restarted, the better. Every architecture decision must favor loose coupling and clear boundaries.

**3. "VaultOp" replaces "Gnosis Safe" as the name for the 2-of-2 multisig.**
Named for what it *operates* (the vault / high-value redemptions), not what *operates it* (Gnosis Safe). All references in CLAUDE.md updated. Comment added: `// manual gate for high-value redemptions (>500 CATR)`.

**4. Payout thresholds are backend configuration, not contract logic.**
The contract does not enforce the <50 / 50–500 / >500 CATR tiers. The `redemption_requests` table and admin UI handle this. Changing thresholds after the pilot with Reina requires no contract redeploy.

**5. VaultOp operator automation is a future phase.**
Gnosis Safe supports modules that allow designated operators to approve mid-tier redemptions (50–500 CATR) without requiring both primary signers. Top tier (>500 CATR) stays 2-of-2 forever. Planned for after pilot data is collected.

**6. Pilot thresholds should be calibrated from Reina's real transaction data.**
Do not set thresholds by intuition. Run the pilot, observe the distribution (median, 95th percentile), then set admin threshold at ~3–5x median and VaultOp threshold where only genuine outliers trigger it.

**7. CATRToken.sol transfer overhead (~90% vs standard ERC-20) is acceptable.**
Three `_update` calls per transfer (recipient + treasury + rewardPool) costs 96,874 gas vs ~51,000 for a standard ERC-20. On Base L2, this is ~$0.0002 per transfer. Moving commission off-chain would save fractions of a cent at the cost of transparency and correctness. Not worth it.

**8. Contract is ready to deploy — waiting on wallets.**
`npx hardhat run scripts/deploy.ts --network base_sepolia` once `.env` is populated with real addresses (treasury, rewardPool, VaultOp Safe, bridge minter wallet).

#### Test reports written
- `packages/merlink/bridge/tests/reports/2026-03-31_nodejs_bridge_test_report.md`
- `packages/contracts/tests/reports/2026-03-31_CATRToken_test_report.md`
- `packages/contracts/Efficiency/2026-03-31_CATRToken_Gas_Analysis.md`

#### Next session agenda
1. Phase C — Express backend + PostgreSQL/Prisma
2. OR: aiControl workstation setup (Ollama + Qwen3 + Hermes Agent)
3. When wallets are ready: deploy CATRToken.sol to Base Sepolia + set up VaultOp Safe

---

### Session 3 — 2026-04-02
**Location:** San Pedro Sula, Honduras (CST, UTC-6)

#### What happened
- Installed PostgreSQL 16 server (only client was present — server package was missing)
- Created `fidelio_dev` database and `fidelio` user with CREATEDB permission
- **Phase C Steps 1–2:** Scaffold (`package.json`, `tsconfig.json`, `.env.example`) + Prisma schema + migration
- **Phase C Steps 3–12:** Full backend implementation — all 12 steps completed in one session
- **Phase C declared complete** — 44/44 tests passing
- **Project total: 131/131 tests passing** (87 Phase A+B + 44 Phase C)

#### What was built in Phase C

| Layer | Files |
|---|---|
| Services | `MintService`, `RedemptionService`, `TransactionService`, `UserService`, `RewardService` |
| Routes | `bridge_events`, `users`, `wallets`, `merchants`, `transactions`, `redemptions`, `rewards`, `health` |
| Middleware | `auth` (bridge secret + JWT), `validate` (Zod), `error_handler` |
| Jobs | `ReconciliationJob` (cron 02:00 CST / 08:00 UTC) |
| Tests | 44 tests across 7 suites |

#### Key decisions from this session

**1. PostgreSQL only had the client package installed — server was missing.**
`pg_isready` reported no response. `psql --version` showed 16.13. `initdb` and `pg_ctl` were absent. Required `sudo apt install postgresql-16`. Good to know for aiControl setup.

**2. `app.ts` factory pattern enforces testability at the route level.**
`createApp()` returns a configured Express app without calling `.listen()`. Route tests import `createApp` + `supertest` — no port is ever bound. Same principle as C++ static parse methods and bridge's SocketServer separation.

**3. `PaymentEventDTO` is a local copy, not imported from the bridge package.**
The backend and bridge are independent services. If the bridge type ever changes, the DTO is the deliberate translation layer. No cross-package coupling.

**4. `$transaction()` wraps all multi-table writes in MintService.**
`PendingMint + ProcessedReference + Transaction` are written atomically. If any write fails, none are committed. This is the DB-level enforcement of MINT-BEFORE-PAY integrity.

**5. Redemption tier thresholds live in env vars, not hardcoded.**
`REDEMPTION_TIER_ADMIN_MIN=50`, `REDEMPTION_TIER_VAULT_MIN=500` — calibrated from Reina's pilot data after launch, no redeploy needed.

**6. ReconciliationJob.run() is extracted from schedule() for testability.**
The cron scheduler is never instantiated in tests. `run()` is called directly with mock data. Same principle as static parse methods in Phase B.

**7. RewardMilestone @@unique([user_id, type]) is the race-condition guard.**
TX_5 can only be inserted once per user at the DB level. No application-level locking needed. Prisma will throw a unique constraint error on a duplicate attempt — service catches and ignores it.

**8. Bridge → Backend connection is HTTP, not Unix socket.**
The bridge already speaks HTTP out. Adding a second Unix socket to the backend would couple two unrelated concerns. The internal routes (`/internal/bridge/*`) use a shared `BRIDGE_SECRET` header — static secret is the right complexity level for localhost process-to-process communication.

#### Test report written
- `packages/backend/tests/reports/2026-04-02_backend_test_report.md`

#### Next session agenda
1. Phase D — Web MVP (Next.js: client, merchant, admin views) talking to `/api/*` routes
2. OR: Phase A wallet deployment — populate `.env` with real addresses → deploy CATRToken.sol to Base Sepolia + set up VaultOp Safe
3. OR: aiControl workstation setup (Ollama + Qwen3 + Hermes Agent)

---

### Session 4 — 2026-04-06
**Location:** San Pedro Sula, Honduras (CST, UTC-6)

#### What happened
- **Phase D declared complete** — Web MVP built and build passing
- Created `packages/web/` from scratch — Next.js 14 (App Router), Tailwind CSS
- Built three views: client dashboard, merchant dashboard, admin dashboard
- Built 6 reusable components and a full `lib/api.ts` wrapping every `/api/*` route
- Fixed `next.config.mjs` — removed TypeScript syntax from `.mjs` file (ESM doesn't support `import type`)
- **Project total: 131/131 tests passing** (Phase D has no automated tests — build passing is the verification)

#### What was built in Phase D

| File | Purpose |
|---|---|
| `src/lib/api.ts` | Typed fetch wrappers for all backend routes |
| `src/app/client/page.tsx` | Client dashboard — CATR balance, transaction history, reward milestones, spend form |
| `src/app/merchant/page.tsx` | Merchant dashboard — info display + redemption request form |
| `src/app/admin/page.tsx` | Admin dashboard — merchants, redemptions, reward payouts with approve/reject |
| `src/components/TransactionList.tsx` | Transaction history table |
| `src/components/RedemptionForm.tsx` | Merchant redemption request form |
| `src/components/RewardStatus.tsx` | Unlocked milestone list |
| `src/components/MerchantList.tsx` | Admin merchant management table + add form |
| `src/components/RedemptionQueue.tsx` | Admin redemption queue with filter + approve/reject |
| `src/components/RewardPayoutQueue.tsx` | Admin reward payout queue with approve |

#### Key decisions from this session

**1. All three views are client components — no server-side data fetching for MVP.**
Admin JWT is pasted manually into an input field and stored in component state. No session management, no cookies. This is intentional — it's an internal tool used by Cristian and Víctor only. Phase E will wire real authentication.

**2. User and merchant identity via query param for MVP.**
`/client?userId=<uuid>` and `/merchant?merchantId=<uuid>`. No login flow. The pilot with Reina will use pre-configured URLs. Real wallet-based identity comes in Phase E.

**3. Admin tab pattern chosen over separate routes.**
Three tabs (Merchants / Redemptions / Reward Payouts) in one page, toggled with component state. Simpler than three separate admin routes for a two-person operation.

**4. `next.config.mjs` requires plain JS, not TypeScript.**
`.mjs` is an ESM module — `import type` is TypeScript syntax and not valid in a plain ESM file. Switched to JSDoc type annotation (`/** @type {import('next').NextConfig} */`). Note for future: use `next.config.ts` only if the project uses `ts-node` or `tsx` to run config.

#### To run the full stack
```bash
# Terminal 1
cd packages/backend && npm run dev   # Express on :3001

# Terminal 2
cd packages/web && npm run dev       # Next.js on :3000
```

#### Next session agenda
1. Phase E — 5 end-to-end integration transactions (full stack: MerL1nk → Backend → Contract → Web)
2. OR: Phase A wallet deployment — populate `.env` → deploy CATRToken.sol to Base Sepolia + set up VaultOp Safe
3. OR: aiControl workstation setup (Ollama + Qwen3 + Hermes Agent)
