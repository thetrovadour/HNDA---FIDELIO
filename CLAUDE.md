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
> "Before we close — do you want me to log this session?"

Then append a new entry to `Organization and Research/Seasons/Session-Log-Archive.md` with what happened and key decisions.

Only update **this file** (CLAUDE.md) if something structural changed: a phase completed, a new invariant was added, deployed addresses changed, or a new module was built. Do not write session narratives here.

For additional project context, see `Organization and Research/Fidelio-Architecture-Planv1.1.md`.

---

**Current status (as of 2026-04-08):**

| Phase | Deliverable | Status |
|---|---|---|
| A | CATRToken.sol on Base Sepolia + VaultOp (Gnosis Safe 2-of-2) | ✅ Complete — redeployed with BURNER_ROLE `0xee6d5E14dc3EB458990fB1C3fe591A2081bcb215` |
| B | MerL1nk Etapa 1 (C++ Core + Node.js Bridge) | ✅ Complete — 74/74 tests passing |
| C | Backend Core (Express API + PostgreSQL/Prisma) | ✅ Complete — 44/44 tests passing |
| D | Web MVP (client + merchant + admin views) | ✅ Complete — build passing |
| E | Integration — 5 end-to-end transactions | ✅ Complete — 16/16 checks passing |

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

## Privacy & Sovereignty Principles

*Established 2026-04-11.*

**Core principle: Honduran people's business is Honduran people's business.**

FIDELIO's long-term goal is to minimize foreign entities in the critical path of a Honduran financial transaction. This is not a threat response — it is a sovereignty stance.

### Why CATR must be on-chain
CATR is a loyalty token, not a database row. It must be auditable, transparent, and honest. Those guarantees only exist on a public blockchain. The chain is a trust guarantee, not just a technical choice.

### Wallet strategy
- **H-Wallets are the default** — FIDELIO generates a wallet for every new client. No crypto knowledge required.
- **External wallets are the opt-in** — clients with MetaMask or any EVM wallet can connect their own address instead.
- From the contract's perspective, both are just addresses. The chain does not care who generated the keypair.
- **Current state:** Wallet generation is not yet implemented. `POST /api/wallets` accepts an externally-supplied address. Key generation is the next infrastructure decision.

### Long-term infrastructure sovereignty (roadmap, not sprint)
1. Swap Infura RPC for a self-hosted Base node on Honduran hardware
2. Build H-Wallet key management service — HNDA generates and custodies keypairs
3. Replace RainbowKit/WalletConnect cloud with a custom wallet connector
4. Long-term ceiling: HNDA L2 — Base is controlled by Coinbase

Full analysis in `Organization and Research/Fidelio-Architecture-Planv1.1.md` → *Privacy & Sovereignty Vision* section.

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

## HNDA---WALLETS

Sovereign wallet infrastructure — the Honduran answer to MetaMask. Lives in `HNDA---WALLETS/`.

**Status:** Vision phase. FIDELIO reaches production first.

| Component | Purpose |
|---|---|
| `app/` | Self-custody wallet app (HNWallet) |
| `node/` | HNDA-operated Base node — replaces Infura |
| `keyvault/` | Key generation service for H-Wallets (FIDELIO custodial wallets) |

See `HNDA---WALLETS/CLAUDE.md` for full context.

---

## AI Development Stack

- **Claude Code CLI** — autonomous agent in this repo
- **oh-my-claudecode** — multi-agent orchestration (installed)
- **ecc (everything-claude-code)** — extended skill library (installed 2026-04-06): security-review, cpp-review, cpp-testing, e2e-testing, tdd, defi-amm-security, evm-token-decimals, and 80+ others
- **superpowers** — parallel agent execution and planning skills (installed 2026-04-06)
- **claude-md-management** — CLAUDE.md revision and improvement (installed 2026-04-06)
- **clangd-lsp** — C++ LSP server for MerL1nk core analysis (installed 2026-04-06)
- **Playwright MCP** — browser automation for web UI testing
- **GitHub MCP** — direct GitHub operations from Claude Code
- **Ollama + Qwen3** — local AI on aiControl (pending hardware)
- **Hermes Agent** — persistent memory layer (pending aiControl)

