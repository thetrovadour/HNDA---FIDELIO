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

At the end of every session, remind Cristian to trigger a CLAUDE.md update by saying:
> "Before we close — do you want me to update CLAUDE.md with today's decisions?"

Then update this file with any key decisions, new modules, or status changes made during the session.

Take in consideration the file with name: Fidelio-Architecture-Planv1.1 as this is a markdown text file that has great context on the project. Review the file if context is missing. If more context is needed, search in folder Organization and Research.

**Current status (as of 2026-03-30):**

| Phase | Deliverable | Status |
|---|---|---|
| A | CATRToken.sol on Base Sepolia + Gnosis Safe | ⬜ Not started |
| B | MerL1nk Etapa 1 (C++ Core + Node.js Bridge) | 🔄 In progress |
| C | Backend Core (Express API + PostgreSQL/Prisma) | ⬜ Not started |
| D | Web MVP (client + merchant + admin views) | ⬜ Not started |
| E | Integration — 5 end-to-end transactions | ⬜ Not started |

**Phase B — C++ Core module status:**

| Module | Status |
|---|---|
| `bloom_filter.cpp` + `murmurhash3.cpp` | ✅ Complete — 10/10 tests passing |
| `payment_event.h` | ✅ Complete |
| `retry_queue.cpp` | ✅ Complete — 8/8 tests passing |
| `email_parser.cpp` | ✅ Complete — 12/12 tests passing |
| `vault_monitor.cpp` | ⬜ Next (pending Phase A contract — may stub first) |
| `nfc_reader.cpp` | ⬜ Pending |
| `webhook_receiver.cpp` | ⬜ Pending |
| Node.js Bridge (`packages/merlink/bridge/`) | ⬜ Pending |

**Total tests passing: 30/30**

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
cmake .. -DCMAKE_BUILD_TYPE=Release
make
ctest                        # Run all C++ tests
./bloom_filter_test          # Run bloom filter test directly
./retry_queue_test           # Run retry queue test directly
./email_parser_test          # Run email parser test directly
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

### Input Adapter Pattern (decided 2026-03-30)

All input sources (email, NFC, webhook) produce a common `PaymentEvent` struct. The downstream pipeline never sees the raw source format:

```
[ EmailParser  ]  ──┐
[ NFCReader    ]  ──┼──►  PaymentEvent  ──►  RetryQueue  ──►  Bridge  ──►  Mint
[ Webhook      ]  ──┘
```

This means switching from email to NFC in production is a one-module swap — the bloom filter, retry queue, and bridge are unchanged.

---

## Non-Negotiable Invariants

These rules are **hardcoded in the smart contract** and must never be violated in any layer:

- **MINT-BEFORE-PAY**: payment confirmed → mint CATR → client receives → client pays merchant
- **BURN-BEFORE-REDEEM**: merchant requests redemption → burn CATR on-chain → HNDA transfers Lempiras
- **3.6% commission** on every CATR transfer: 65% → HNDA treasury, 35% → reward pool
- **Only merchants** redeem CATR → Lempiras. Clients spend CATR only within the network.
- **CATR supply cap: 50,000,000** — a circulation ceiling, not a countdown (burn.ts is justified because this is a closed-loop revolving system)

---

## MerL1nk — Implemented Modules

`packages/merlink/core/` — C++ core. Implemented files:

- **bloom_filter.cpp** — probabilistic duplicate check (O(1)) — seed constant `0xF1DE0001`
- **murmurhash3.cpp** — hash function used by bloom filter (Kirsch-Mitzenmacher double-hashing)
- **payment_event.h** — shared `PaymentEvent` struct: `{reference_code, amount_lempiras, client_wallet, source, received_at}`
- **retry_queue.cpp** — thread-safe FIFO queue; parser pushes, bridge pops; in-memory only (PostgreSQL `pending_mints` is the crash recovery)
- **email_parser.cpp** — polls Gmail inbox via IMAP (libcurl, port 993, every 60s); parses Atlántida bank notification emails; pushes `PaymentEvent` to `RetryQueue`

Remaining stubs (not yet implemented): `vault_monitor`, `nfc_reader`, `webhook_receiver`

The Node.js bridge (`packages/merlink/bridge/`) and all other packages (`contracts/`, `backend/`, `web/`) have **empty src/ directories**.

---

## Payment Flow (Etapa 1 — Manual Bank Transfer)

1. Client enters amount → app generates reference code: `CATR-[wallet]-[timestamp]`
2. Client manually transfers Lempiras to HNDA's Atlántida account with reference in memo
3. Atlántida sends email notification to HNDA inbox (dedicated Gmail account)
4. MerL1nk C++ `email_parser` polls inbox via IMAP every 60 seconds, parses notification
5. `bloom_filter` checks if reference was seen before → if uncertain, confirm against `processed_references` table
6. `retry_queue` receives `PaymentEvent`; MerL1nk Bridge pops and calls `contract.mint(clientWallet, amount)` on Base Sepolia
7. Client sees CATR in wallet

*BAC Credomatic API replaces steps 2–4 in Etapa 2.*
*NFC replaces steps 1–4 in the long-term client experience.*

---

## Email Parser — Mock Email Format

The parser expects Atlántida bank notifications in this format:

```
Estimado HNDA,

Banco Atlántida le informa que ha recibido la siguiente transferencia:

Monto recibido: L. 500.00
Referencia de pago: CATR-0xABCD1234-1711800000
Nombre del ordenante: Juan Carlos Pérez
Fecha: 30/03/2026 14:35:22

Este es un mensaje automático. No responda a este correo.
```

Key markers the parser searches for:
- `"Monto recibido: L. "` → extracts amount as double
- `"Referencia de pago: "` → extracts reference code token

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
Pending review after pilot tests. 

---

## Key Decisions to Know

- **Why C++ for MerL1nk Core?** Speed, determinism, no GC pauses, 24/7 operation.
- **Why Node.js for the Bridge?** ethers.js ecosystem — best library for Ethereum interaction.
- **Why Base (L2)?** Low transaction costs for a Honduran loyalty network.
- **Why custodial wallets?** Most clients won't have MetaMask. Backend manages wallets for them.
- **Bloom filter false positives** (~1%) fall back to PostgreSQL `processed_references` for confirmation — never reject a valid payment.
- **Why RetryQueue instead of direct callback?** If the bridge call fails (network/blockchain issue), the queue enables automatic retry. The callback approach would require bolting retry logic onto the parser — wrong layer.
- **Why IMAP for email?** Zero cost. Gmail supports IMAP natively on port 993 with an App Password. No API billing.
- **Why the input adapter pattern?** Cristian's long-term goal is NFC tap-to-pay. By normalizing all input sources to `PaymentEvent`, swapping email for NFC is a one-module change with zero downstream impact.
- **cmake -DCMAKE_BUILD_TYPE=Release** must be used — Debug builds with `-fsanitize=address` break the test binaries if the library and test are compiled with mismatched flags.

---

## Test Reports

For merlink:
Saved in `packages/merlink/core/tests/reports/`:
- `2026-03-30_bloom_filter_test_report.md`
- `2026-03-30_email_parser_retry_queue_test_report.md`

## AI Development Stack

- **Claude Code CLI** — autonomous agent in this repo
- **Ollama + Qwen3** — local AI on aiControl (pending hardware)
- **oh-my-claudecode** — multi-agent orchestration (Installed)
- **Hermes Agent** — persistent memory layer (pending aiControl)
```

---

/*
 * CLAUDE.md modification log
 *
 * 2026-03-30 — Initial session
 *   - Added session-end reminder to always prompt CLAUDE.md update
 *   - Updated Phase B module status table (bloom_filter, payment_event,
 *     retry_queue, email_parser all complete — 30/30 tests passing)
 *   - Added input adapter pattern (PaymentEvent) to architecture section
 *   - Added email parser mock format section
 *   - Added RetryQueue, IMAP, input adapter, and cmake build-type decisions
 *   - Added test reports registry
 *   - Updated build commands to include retry_queue_test and email_parser_test
 *   - Updated MerL1nk module list to reflect implemented vs pending
 */
