# FIDELIO

A closed-loop payment and loyalty network for Honduras, built on Base (Ethereum L2).

---

## What it is

FIDELIO is a loyalty and payment system designed for small Honduran merchants. Clients load Lempiras into the network, receive CATR tokens 1:1, spend them at participating merchants, and merchants redeem CATR back for Lempiras. Value circulates inside the Honduran economy instead of leaking out through foreign payment processors.

The CATR token is not a cryptocurrency to the end user. It is a loyalty point — a *punto* — that happens to live on a blockchain. The blockchain is the trust layer, not the product.

---

## The problem it solves

A small merchant in San Pedro Sula cannot afford a traditional POS terminal. The rental fees, the card processing percentages, the hardware contracts — all of that goes to foreign companies. What the merchant gets in return is a payment rail and nothing else. No loyalty system. No customer data. No recurring relationship.

FIDELIO replaces the POS terminal with the merchant's own Android phone. The merchant charges clients by tapping the phone. The commission stays inside the network and a fraction of it flows back to clients as cashback and to merchants as GCA (Guacacoin) loyalty equity. The money stays in Honduras.

---

## How it works

### The payment loop

```
Client loads HNL → HNDA mints CATR (1:1) → Client spends CATR at merchant
→ Merchant accumulates CATR → Merchant redeems CATR → HNDA burns CATR → HNDA sends HNL
```

This is a revolving closed loop. CATR is minted on deposit and burned on redemption. Supply never grows unbounded. The 1:1 peg is maintained by collateral — HNDA holds the Lempiras — the same structure USDC uses with Circle. HNDA is the counterparty.

### The commission

Every CATR transfer charges 3.6%:
- 65% → HNDA treasury (operations, reserve, sustainability)
- 35% → reward pool (client cashback)

The commission is hardcoded in the smart contract. It is not a configuration value.

### Cashback

Clients earn cashback as they build transaction history with the network. The rate is a milestone-based upgrade — the more you transact, the better your rate. Milestones stack. GOLD status (≥100 txns + ≥8,000 CATR spend in a 5-month window) locks in the best rate permanently and evaluates on Honduras's own labor calendar: June and December, the months workers already receive bonuses.

### GCA — Guacacoin

GCA is the merchant loyalty token. It is not a payment instrument. It is equity in the network itself.

HNDA mints GCA to merchants based on their processed volume and the diversity of their client base. Merchants redeem GCA for HNL at the current price floor. The floor is calculated dynamically: `GCA reserve balance ÷ total GCA in circulation`. The reserve grows with every CATR transaction (0.351% of amount, from the treasury slice). The floor only moves up over time.

GCA flows in two directions only: HNDA mints it, merchants redeem it with HNDA. No peer-to-peer market. No secondary speculation. HNDA controls the price floor and guarantees it.

---

## Architecture

```
External World (bank transfers, NFC, webhooks)
        │
        ▼
[ MerL1nk — Component 8 ]
  C++ Core  ──IPC──►  Node.js Bridge
  (bloom filter,        (ethers.js:
   retry queue,          mint, burn,
   email parser,         transfer,
   NFC reader,           heartbeat)
   vault monitor)
        │
        ▼
[ Off-Chain Layer ]
  Web App (Next.js) ◄──► Backend API (Express + PostgreSQL)
        │
        ▼
[ On-Chain Layer — Base (Ethereum L2) ]
  CATRToken.sol         GCAToken.sol
  VaultOp (Gnosis Safe 2-of-2)
  rewardPool wallet     HNDA treasury wallet
```

### Input adapter pattern

Every input source — bank email, NFC tap, webhook — produces the same internal `PaymentEvent` struct:

```
{ reference_code, amount_lempiras, client_wallet, source, received_at }
```

The downstream pipeline (bloom filter, retry queue, bridge, mint) never sees the raw format. Switching from email parsing to NFC is a one-module swap. Everything downstream is unchanged.

### MerL1nk (C++ Core)

The MerL1nk core is written in C++ for speed, determinism, and no garbage collection pauses. It runs 24/7. It is the validation and deduplication layer before anything touches the blockchain.

- **Bloom filter** — O(1) duplicate check. ~1% false positives fall back to the PostgreSQL `processed_references` table. The 99% that are clearly duplicates never touch the database.
- **Retry queue** — thread-safe FIFO. Parser pushes, bridge pops. In-memory; PostgreSQL `pending_mints` handles crash recovery.
- **Email parser** — polls Gmail via IMAP every 60 seconds, parses Atlántida bank notification emails.
- **NFC reader** — reads `PaymentEvent` from NFC hardware (HNDA terminal path).
- **Webhook receiver** — receives bank webhook callbacks (Etapa 2 path).
- **Vault monitor** — watches on-chain VaultOp events.

### The Bridge (Node.js)

ethers.js is the best Ethereum interaction library. The bridge is a thin Node.js process that pops `PaymentEvent` from the C++ core via Unix socket and calls `contract.mint()`, `contract.burn()`, or `minter.transfer()` on Base. It communicates with the backend via HTTP with a shared `BRIDGE_SECRET` header.

The C++ core and the bridge are independent processes. Either can restart without killing the other. The Unix socket is the boundary.

### Backend (Express + PostgreSQL)

The backend is the source of truth for off-chain state. It handles authentication, transaction recording, reward evaluation, GCA vesting, merchant lifecycle, and reconciliation. PostgreSQL is the crash recovery layer — every on-chain operation starts as a DB record before the chain call fires (DB-first pattern).

`PendingMint` and `PendingTransfer` tables track the gap between "confirmed in DB" and "confirmed on-chain". A daily reconciliation job retries stale rows up to 3 times, then marks them FAILED and alerts.

### Web App (Next.js)

Three views: client dashboard, merchant POS, admin console. Dark design system, Oxanium font, mobile-first. The merchant's phone is the terminal — NFC charging is built into the merchant dashboard via the Web NFC API.

---

## Non-negotiable invariants

These are hardcoded in `CATRToken.sol`. They cannot be changed without a contract redeployment.

- **MINT-BEFORE-PAY** — payment confirmed → CATR minted → client receives → client pays merchant. The token always precedes the spend.
- **BURN-BEFORE-REDEEM** — merchant requests redemption → CATR burned on-chain → HNDA transfers Lempiras. No HNL leaves without a corresponding burn.
- **3.6% commission** on every CATR transfer: 65% treasury, 35% reward pool.
- **Only merchants redeem** CATR → Lempiras. Clients spend CATR within the network only.
- **50,000,000 CATR supply cap** — revolving. Burn justifies the cap.

High-value redemptions (>500 CATR) require VaultOp 2-of-2 authorization (Gnosis Safe: Cristian + Víctor). This is the last line of defense against unauthorized large outflows.

---

## Tech stack

| Layer | Technology | Why |
|---|---|---|
| Smart contracts | Solidity + Hardhat | Industry standard for EVM |
| Blockchain | Base (Ethereum L2) | Low transaction costs for a Honduran loyalty network |
| C++ core | C++17 + CMake | Speed, determinism, no GC pauses, 24/7 uptime |
| Node.js bridge | ethers.js v6 | Best Ethereum interaction library |
| Backend | Express 5 + Prisma 7 + PostgreSQL | Mature, testable, reliable |
| Web app | Next.js 16 + Tailwind 4 | App Router, fast builds, React 19 |
| Auth | bcrypt + HttpOnly cookies | Standard; passkey (WebAuthn) lands with `hnda.io` |
| Wallet custody | ethers.js keypair generation | H-Wallets: FIDELIO-generated, invisible to users |

---

## Status

All five development phases are complete.

| Phase | Deliverable | Status |
|---|---|---|
| A | CATRToken.sol + GCAToken.sol on Base Sepolia | ✅ Live |
| B | MerL1nk C++ Core + Node.js Bridge | ✅ 87/87 tests passing |
| C | Backend API + PostgreSQL | ✅ 73/73 tests passing |
| D | Web MVP (client + merchant + admin) | ✅ Build passing |
| E | End-to-end integration | ✅ Full mint → spend → redeem cycle confirmed |

Security audits completed: TruffleHog (0 secrets), Slither (1 finding fixed), Nuclei OWASP (0 findings), npm audit (3 remaining — all dev-tool upstream noise, documented in `SECURITY.md`).

---

## Sovereignty

*Honduran people's business is Honduran people's business.*

FIDELIO's long-term goal is to minimize foreign entities in the critical path of a Honduran financial transaction. This is not a threat response. It is a sovereignty stance.

CATR is on-chain because a loyalty token must be auditable, transparent, and honest. Those guarantees only exist on a public blockchain. The chain is a trust guarantee, not just a technical choice.

The infrastructure roadmap: VPS for early production → self-hosted Base node on Honduran hardware → HNDA L2. Each step reduces the number of foreign entities between a Honduran client and their money.

---

## Organization

```
packages/
  backend/        Express API, Prisma schema, jobs, services
  contracts/      CATRToken.sol, GCAToken.sol, Hardhat config
  merlink/
    core/         C++ modules (bloom filter, parser, NFC, etc.)
    bridge/       Node.js bridge (ethers.js, IPC, HTTP server)
  web/            Next.js app (client, merchant, admin, landing)
  e2e/            Integration test harness
```

---

HNDA — Honduras Digital Assets  
San Pedro Sula, Honduras
