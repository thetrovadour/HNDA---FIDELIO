# FIDELIO — Technical Architecture Plan
**Version 1.1** | Honduras Nativa Digital Answers (HNDA)
*Updated from v1.0: Issue 1 (manual fallback), Issue 2 (MerL1nk scope), Issue 3 (reward pool security), Issue 4 (C++ maximized)*

---

## Context

HNDA (Honduras Nativa Digital Answers) is building **FIDELIO**: a digital loyalty point system for Honduran tourism businesses. The whitepaper defines two tokens — **CATR** (payment/loyalty points redeemable for 1 Lempira within the network) and **GCA** (growth participation token) — running on Base (Ethereum L2). This plan defines what discrete applications need to be built and how they connect, scoped to **Etapa 1** (testnet pilot, 5 real transactions).

**Key whitepaper update (page 20):** Clients can NO longer redeem CATR for Lempiras. They can only spend CATR at merchants within the network. Only merchants redeem CATR → Lempiras through HNDA.

**Legal status:** Confirmed by BCH Departamento de Sistema de Pagos — CATR does not qualify as dinero electrónico under Decreto Legislativo No. 83-2021. No INDEL authorization or EPSPE registration required. HNDA operates as a private voluntary loyalty network under commercial law.

---

## The System in Plain Language

Think of FIDELIO like an arcade. A customer walks in, exchanges real money (Lempiras) for tokens (CATR) at the front desk (payment gateway). They use tokens to pay at game stations (merchants). Merchants collect tokens and trade them back for real money at the front desk (HNDA). A tiny 0.63% slice of every token exchange goes to keeping the arcade running — and part of that slice fuels three reward engines that keep clients coming back. The blockchain is the transparent glass box where everyone can see the rules being followed — but no one needs to understand how the glass box works to play.

---

## Architecture Overview: 8 Components

```
                         ┌──────────────────────────────────────┐
                         │           EXTERNAL WORLD              │
                         │  BAC Credomatic · Bank Transfers      │
                         │  NFC Card Taps  · User Devices        │
                         └────────────────┬─────────────────────┘
                                          │ webhooks / NFC / email notifications
                                          ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        MERLINK LAYER                                │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │              Component 8: MerL1nk Core (C++)                │   │
│  │                                                             │   │
│  │  NFC Reader → EMV Parser → Validator                        │   │
│  │  Email Parser → Reference Extractor (Etapa 1)              │   │
│  │  BAC Webhook Receiver → HMAC Verifier (Etapa 2)            │   │
│  │  Duplicate Engine → Bloom Filter                            │   │
│  │  Retry Queue → Persistence Layer                            │   │
│  │  Vault Monitor → Alert System                               │   │
│  │  AI Fraud Core → Anomaly Detector (future)                  │   │
│  └────────────────────────┬────────────────────────────────────┘   │
│                            │ Internal IPC / HTTP                    │
│  ┌─────────────────────────▼──────────────────────────────────┐    │
│  │           MerL1nk Bridge (Node.js/TypeScript)               │    │
│  │                                                             │    │
│  │  ethers.js → contract.mint()                                │    │
│  │  ethers.js → contract.burn()                                │    │
│  │  ethers.js → rewardPool.transfer()                          │    │
│  │  ethers.js → heartbeat ping                                 │    │
│  └────────────────────────┬────────────────────────────────────┘   │
└────────────────────────────┼────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                       OFF-CHAIN LAYER                               │
│                                                                     │
│  ┌──────────────┐    ┌────────────────────────────────────────┐    │
│  │  Component 3  │    │          Component 2                   │    │
│  │  WEB APP      │◄──►│          BACKEND API                   │    │
│  │  (Next.js)    │    │          (Express.js)                  │    │
│  │               │    │                                        │    │
│  │ • Client UI   │    │ • Payment handler (BAC + manual)       │    │
│  │ • Merchant UI │    │ • Mint/burn orchestrator               │    │
│  │ • Admin UI    │    │ • Redemption processor                 │    │
│  └──────────────┘    │ • Reward engine (3-pool hybrid)        │    │
│                       │ • Heartbeat cron (Dead Man's Switch)   │    │
│                       │ • User/merchant registry               │    │
│                       └──────────────┬─────────────────────────┘   │
│                                      │                              │
│                       ┌──────────────▼──────┐                      │
│                       │   Component 4        │                      │
│                       │   PostgreSQL DB      │                      │
│                       └─────────────────────┘                      │
└──────────────────────────────┬──────────────────────────────────────┘
                               │ ethers.js (mint, burn, transfer)
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    ON-CHAIN LAYER (Base Sepolia)                    │
│                                                                     │
│  ┌──────────────────┐   ┌──────────────┐  ┌─────────────────────┐  │
│  │  Component 1      │   │ Component 5  │  │  Component 6        │  │
│  │  CATRToken.sol    │   │ GCAToken.sol │  │  VaultRegistry      │  │
│  │  (ERC-20+)        │   │ (Etapa 2)    │  │  (Etapa 2)          │  │
│  └────────┬──────────┘   └──────────────┘  └─────────────────────┘  │
│           │ owner                                                    │
│  ┌────────▼──────────┐                                              │
│  │  Component 7       │                                             │
│  │  Gnosis Safe 2/2   │                                             │
│  └────────────────────┘                                             │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Component 8: MerL1nk (NEW — HYBRID C++ / Node.js)

**What it is:** The intelligence layer between the physical world and the blockchain. Every time something happens in the real world that FIDELIO needs to respond to, MerL1nk detects it, validates it, and decides what to tell the contract.

**Analogy:** Like a bilingual interpreter who speaks both "physical world" (cash, cards, bank notifications) and "blockchain world" (smart contract calls). The arcade cashier doesn't understand either language — MerL1nk does.

### MerL1nk Core (C++)

C++ owns everything that touches the physical world and requires speed, determinism, or continuous 24/7 operation.

| Module | What it does | Etapa |
|--------|-------------|-------|
| **Email Notification Parser** | Monitors HNDA inbox, parses Atlántida bank notifications, extracts amount + reference code | Etapa 1 |
| **Duplicate Prevention Engine** | Bloom filter — ultra-fast "have I processed this reference before?" | Etapa 1 |
| **Retry Queue Engine** | Failed mint transactions queued and retried with exponential backoff. Survives server restarts | Etapa 1 |
| **Vault Monitor** | Continuous polling of vault balance ratios (67/33 USDT/fiat split health). Alerts when below threshold | Etapa 1 |
| **BAC Webhook Receiver** | High-throughput HTTP server receiving BAC callbacks. HMAC signature verification before any processing | Etapa 2 |
| **NFC Reader Core** | Raw NFC hardware communication via Android NDK or Linux NFC libs. EMV data parsing from card tap. Encrypts card data before passing to processor | Etapa 2 |
| **AI Fraud Detection Core** | Local inference engine for anomaly detection. Fine-tuned model on FIDELIO transaction data. Runs without external API dependency | Future |

**Why C++ for these modules:**
- Hardware-level speed for NFC — no garbage collection pauses
- Bloom filters in C++ are orders of magnitude faster than PostgreSQL queries for duplicate detection
- Retry queues need deterministic timing and memory control
- 24/7 continuous operation requires predictable resource usage
- Local ML inference is only viable at C++ speed without external API cost

### MerL1nk Bridge (Node.js / TypeScript)

Node.js owns everything that touches the blockchain, using the most mature ecosystem available.

| Module | What it does |
|--------|-------------|
| **Mint Caller** | Receives validated payment signal from C++ Core → calls `contract.mint(wallet, amount)` |
| **Burn Caller** | Receives redemption approval → calls `contract.burn(wallet, amount)` |
| **Reward Payer** | Receives reward trigger from backend → calls `rewardPool.transfer(wallet, amount)` |
| **Heartbeat Pinger** | Sends 24h ping to Dead Man's Switch on contract |

**Communication between C++ Core and Node.js Bridge:** Internal HTTP interface or Unix socket. C++ Core sends a validated, signed instruction. Bridge executes it on-chain.

### MerL1nk Full Responsibility Map

```
MERLINK RESPONSIBILITIES

Payment Detection Layer
├── Email notification parser         (Etapa 1 — manual flow)
├── BAC Credomatic webhook receiver    (Etapa 2)
├── NFC tap reader interface           (Etapa 2 — Reina's phone)
└── Bank transfer API monitor          (Etapa 3 — if BAC grants API)

Validation Layer
├── Duplicate payment detection
├── Reference code verification
├── Amount reconciliation
├── Blacklist check before mint
└── Tier limit enforcement before transfer

Oracle Layer
├── Triggers contract.mint()   after payment confirmed
├── Triggers contract.burn()   after redemption approved
├── Triggers reward payouts    from pool
└── Sends heartbeat            to Dead Man's Switch every 24h

Monitoring Layer
├── Transaction status tracker
├── Failed mint retry queue
├── Unmatched payment reconciliation job (daily)
└── Vault balance monitor (alert if below threshold)

Future AI Layer (C++ + Python)
├── Fraud pattern detection
├── Anomalous transaction flagging
└── Network health analytics
```

### C++ Full Scope in FIDELIO

```
C++ OWNS IN FIDELIO

MerL1nk Core (all modules above)
├── NFC hardware interface
├── Email/webhook parser
├── Duplicate bloom filter
├── Retry queue engine
├── Vault monitor
└── AI fraud detection (future)

Future Extensions
├── High-performance transaction log (append-only binary format)
├── Real-time analytics engine feeding the admin dashboard
├── MerL1nk API Gateway (when multiple banks are supported)
└── Local ML model fine-tuning on FIDELIO transaction data

What C++ does NOT own (intentionally)
├── Blockchain calls     → Node.js + ethers.js (ecosystem maturity)
├── Web frontend         → Next.js / React (React ecosystem)
├── Database queries     → Prisma + PostgreSQL (SQL is the right tool)
└── Smart contracts      → Solidity (only option for EVM)
```

**The principle:** C++ owns the physical world interface and performance-critical infrastructure. Everything else uses the most mature ecosystem for that specific job.

---

## Issue 1 Resolution: Manual Transfer Fallback (Etapa 1)

BAC Credomatic API access requires HNDA's SA (Sociedad Anónima), which completes in August. The pilot with Guillermo and Reina does not depend on BAC. The manual transfer flow runs the full pilot independently.

### Manual Transfer Flow — Step by Step

```
Step 1 — Client opens FIDELIO web app
         Enters amount: "500 HNL"
         Selects: "Bank Transfer"

Step 2 — App displays payment instructions:
         "Transfer 500 HNL to:
          Bank: Atlántida
          Account: [HNDA account number]
          Reference: CATR-[wallet address]-[timestamp]
          You have 30 minutes to complete this transfer."

Step 3 — Client opens their banking app
         Makes the transfer manually
         Includes the reference code exactly as shown

Step 4 — Atlántida sends email/SMS notification to HNDA:
         "Received: 500 HNL — Ref: CATR-0x1234-1711234567"

Step 5 — MerL1nk C++ Email Parser monitors inbox every 60 seconds
         Parses notification
         Extracts: amount=500, wallet=0x1234
         Checks bloom filter: reference not duplicate ✓
         Validates: timestamp within 30-minute window ✓

Step 6 — MerL1nk Bridge calls contract.mint(0x1234, 500 CATR)
         Transaction confirmed on Base Sepolia

Step 7 — Client sees 500 CATR in their wallet
         Pays merchant with CATR
         Merchant receives CATR
         Merchant requests redemption
         Admin approves
         HNDA transfers lempiras to merchant bank account
```

**What this requires technically:**
- Atlántida account with email notifications enabled
- Email parser in MerL1nk C++ Core reading incoming notifications
- Reference code format: `CATR-[wallet]-[timestamp]`
- Duplicate prevention table in PostgreSQL storing processed references
- 30-minute expiry window enforced by MerL1nk

**BAC integration (Etapa 2):** When BAC API access is granted after SA constitution, the `manual-transfer.ts` service is replaced by the `bac-credomatic.ts` webhook handler. Same mint flow, automated trigger instead of email parsing.

### Backend Payment Handler Structure

```
backend/src/services/
├── manual-transfer.ts     ← Etapa 1: email-based bank transfer verification
├── bac-credomatic.ts      ← Etapa 2: BAC webhook (replaces manual)
└── payment-router.ts      ← Routes to whichever handler is active
```

---

## Component 1: Smart Contracts (ON-CHAIN)

**What it is:** The immutable rules of the game. No one can cheat because the rules ARE the transfer mechanism itself.

**Analogy:** Like the printed rules on a board game box — players interact with them, but nobody can change them mid-game.

### CATRToken.sol — Core Token

| Attribute | Value | Why |
|-----------|-------|-----|
| Standard | ERC-20 + Pausable + AccessControl (OpenZeppelin) | Battle-tested, audited base contracts |
| Max Supply | 50,000,000 CATR | Whitepaper spec |
| Commission | 0.63% per transfer, hardcoded | Immutable promise to merchants |
| Split | 75% → HNDA treasury, 25% → reward pool wallet | Hardcoded in contract |
| Roles | ADMIN (Gnosis Safe), MINTER (MerL1nk Bridge) | Separation of power |
| Safety | Pause, blacklist, tier limits, Dead Man's Switch (30 days) | Multiple protection layers |

**Key design decision:** The commission is calculated INSIDE the `transfer` function. Every time CATR moves from one wallet to another, the contract automatically slices 0.63% — 75% goes to HNDA, 25% to a reward pool wallet. This cannot be bypassed because it IS the transfer. Think of it like a toll bridge — you cannot cross without paying the toll, because the toll mechanism is the bridge itself.

**The 25% goes to a single on-chain reward pool wallet.** The contract does NOT decide how rewards are distributed — it only collects them. The backend manages the three reward engines and triggers payouts from the pool. This keeps the contract simple and the reward rules adjustable without redeployment.

### Hybrid Reward System (3-Pool, Off-Chain Logic)

The 25% reward pool is split into three engines managed by the backend:

| Pool | Share | Mechanism | Why |
|------|-------|-----------|-----|
| **Milestone Unlocks** | 10% of commission | Accumulates per client. Unlocked at tx #5, #10, #25 with growing bonus multipliers | Small transactions feel worthwhile because they count toward the next unlock |
| **Cross-Merchant Bonus** | 10% of commission | Clients visiting 3+ different merchants in 30 days get 2x-3x reward multiplier | Drives network effect — clients discover new merchants |
| **Referral Pool** | 5% of commission | Client refers new user who buys CATR → both get bonus. Cap: 10 referrals/month | Organic growth without paid advertising |

**How it flows:**
```
Contract: transfer() → 0.63% commission
  ├── 75% → HNDA treasury wallet (on-chain, automatic)
  └── 25% → Reward pool wallet (on-chain, automatic)
              │
              └── Backend reads pool balance, tracks per-client:
                  ├── Milestone progress (tx count)           → 10% budget
                  ├── Cross-merchant visits (unique/30d)      → 10% budget
                  └── Referral count                          → 5% budget

                  When condition met → backend calls:
                  rewardPool.transfer(clientWallet, rewardAmount)
```

**Why off-chain?** During Etapa 1 pilot, reward thresholds need to be tunable without redeploying the contract. The pool balance is always visible on-chain for transparency.

**Tier limits enforced on-chain:**
- Nivel 1: max 2,000 HNL/tx, 100,000 HNL/month
- Nivel 2: max 10,000 HNL/tx, 500,000 HNL/month
- Nivel 3: max 50,000 HNL/tx, 3,000,000 HNL/month

### What's deferred to Etapa 2+
- **GCAToken.sol** — No merchant will reach the 4-year vesting cliff during a testnet pilot
- **VaultRegistry.sol** — No real vault to prove on testnet
- **Supply expansion mechanism** — Years away from triggering the 80% threshold

### Tech Stack
| Tool | Why |
|------|-----|
| Solidity 0.8.x | Only option for EVM chains |
| Hardhat | Best docs, JS/TS tests |
| OpenZeppelin | Audited base contracts |
| ethers.js v6 | Standard JS library for blockchain interaction |

---

## Component 2: Backend API (OFF-CHAIN)

**What it is:** The bridge between MerL1nk and the web application. Orchestrates mint/burn operations, manages reward engine logic, and serves data to the frontend.

**Analogy:** The arcade's back office. MerL1nk tells it "someone paid." The backend decides what to do next — mint CATR, update the reward progress, notify the merchant.

### Core Services

| Service | What it does | Etapa 1? |
|---------|-------------|----------|
| **Payment Router** | Routes to manual-transfer handler (Etapa 1) or BAC webhook handler (Etapa 2) | YES |
| **Redemption Processor** | Merchant requests cashout → burns CATR → queues fiat transfer | YES |
| **Reward Engine** | Tracks milestone progress, cross-merchant visits, referrals. Triggers payouts when conditions met | YES |
| **Heartbeat Cron** | Pings contract every 24h so Dead Man's Switch doesn't trigger | YES |
| **User/Merchant Registry** | Manages accounts, wallet addresses, tier assignments | YES |
| **Custodial Wallet Manager** | Creates/manages wallets for users who don't have MetaMask | YES |
| **Transaction History API** | Serves data to web frontend | YES |
| **Error Reconciliation Job** | Daily job checking for unmatched payments (paid lempiras but no CATR minted) | YES |

### Error Handling — Mint Failure Recovery

**Critical:** If MerL1nk confirms a payment but the mint transaction fails on Base (gas, network), the client paid real lempiras but received no CATR. This must never go unresolved.

```
Payment confirmed by MerL1nk
    ↓
Backend creates pending_mint record in DB
    ↓
Bridge calls contract.mint()
    ↓ (success)              ↓ (failure)
Mark confirmed              MerL1nk Retry Queue (C++)
Update client wallet        Retry with exponential backoff
                            Alert admin after 3 failures
                            Daily reconciliation job checks all
                            unresolved pending_mints
```

### BAC Credomatic Integration

| Attribute | Value |
|-----------|-------|
| Portal (production) | `developers.baccredomatic.com` |
| Portal (sandbox) | `developer-test.baccredomatic.com` |
| Status | Requires SA (Sociedad Anónima) — available August 2025 |
| Etapa 1 replacement | Manual transfer via Atlántida + MerL1nk email parser |

### Tech Stack
| Tool | Why |
|------|-----|
| Node.js 20 LTS + Express.js | Same language (TypeScript) as frontend and Hardhat |
| TypeScript | Type safety catches bugs early |
| PostgreSQL | Industry-standard relational DB |
| Prisma ORM | Type-safe database queries |
| ethers.js v6 | Blockchain interaction from backend |

---

## Component 3: Web Application (OFF-CHAIN)

**What it is:** One Next.js application with three role-based interfaces — client, merchant, and admin.

### Client Views (mobile-first)
| Page | Function |
|------|----------|
| Buy CATR | Enter amount → payment flow (manual transfer Etapa 1 / BAC card Etapa 2) → confirmation |
| Pay Merchant | Scan QR code or enter merchant code → amount → confirm |
| Wallet | CATR balance, reward pool balance, transaction history |
| Rewards | Milestone progress (e.g., "3/5 tx to next unlock"), cross-merchant count, referral link |

### Merchant Views (desktop-friendly)
| Page | Function |
|------|----------|
| Receive | Display QR code for customers to scan |
| Dashboard | CATR balance, incoming payments, transaction history |
| Redeem | Request CATR → Lempiras conversion |

### Admin Views (HNDA operator)
| Page | Function |
|------|----------|
| Overview | Total CATR in circulation, active users, system health |
| Redemptions | Approve/reject merchant cashout requests |
| Merchants | Register new merchants, assign tiers |
| Reward Pool | Current pool balance, pending payouts, authorization queue |

### Tech Stack
| Tool | Why |
|------|-----|
| Next.js 14 (React) | SSR for mobile performance on slower connections |
| TypeScript | Same language everywhere |
| TailwindCSS | Fast prototyping, utility-first |

---

## Component 4: Database (OFF-CHAIN)

**What it is:** PostgreSQL storing all off-chain data.

### Core Tables
| Table | Purpose |
|-------|---------|
| `users` | Client accounts, auth, role (client/merchant/admin) |
| `wallets` | Custodial wallet addresses + encrypted keys per user |
| `merchants` | Business info, tier, registration date, bank account for redemptions |
| `transactions` | Full history: purchases, payments, rewards, redemptions |
| `pending_mints` | Payments confirmed but mint not yet executed — reconciliation target |
| `processed_references` | Reference codes already minted — duplicate prevention backup |
| `redemption_requests` | Merchant cashout queue with status (pending/approved/completed) |
| `reward_milestones` | Per-client milestone progress: tx count, accumulated pool, last unlock |
| `merchant_visits` | Per-client unique merchant visits within rolling 30-day windows |
| `referrals` | Referrer → referred mapping, status, bonus paid |
| `reward_payout_queue` | Pending reward payouts with authorization tier (auto/admin/gnosis) |

**What's NOT in the database:** Token balances, commission calculations, transfer rules — these live on-chain as the source of truth. The database caches them for display speed but the blockchain is authoritative.

---

## Issue 3 Resolution: Reward Pool Security

### The Problem

The reward pool wallet holds real CATR. Its private key must live somewhere. If compromised, the entire pool is drainable in one transaction.

### Tiered Authorization Model

```
Payout size          Authorization required
─────────────────────────────────────────────
< 50 CATR           Backend executes automatically
                    Rate limited: max 10/hour per client
                    Logged to DB + on-chain event

50–500 CATR         Backend queues the payout
                    Admin receives notification
                    Admin approves via Admin UI within 24h
                    Backend executes after approval

> 500 CATR          Requires Gnosis Safe 2-of-2 signature
                    Founder + Víctor both approve
                    Only then does transfer execute
```

### Private Key Security by Etapa

| Etapa | Storage | Acceptable? |
|-------|---------|-------------|
| Etapa 1 (testnet) | Environment variable on Railway | Yes — no real money |
| Etapa 2 (mainnet pilot) | AWS Secrets Manager or HashiCorp Vault | Yes — production standard |
| Etapa 3 (scaled network) | Hardware Security Module (HSM) | Target — bank-grade security |

**Rule:** The reward pool key is NEVER in the codebase. NEVER in version control. NEVER in logs. Treat it with the same discipline as the vault's private banking credentials.

### Additional Protections
- Rate limiting on auto-payouts prevents drain via many small transactions
- Daily reconciliation job audits pool balance against expected accumulation
- MerL1nk Vault Monitor (C++) alerts if pool balance drops unexpectedly
- All payouts emit on-chain events — publicly auditable in real time

---

## Components 5 & 6: GCAToken + VaultRegistry (DEFERRED)

**Status:** Not built in Etapa 1.

**Why:** GCA vesting starts at year 4. VaultRegistry needs real vault data. Both are Etapa 2+ when real money enters the system. Merchant GCA allocations tracked off-chain during pilot, migrated on-chain later.

---

## Component 7: Gnosis Safe (ON-CHAIN, no custom code)

**What it is:** A multi-signature wallet controlling the smart contract's admin functions. Etapa 1: 2-of-2 (founder + lawyer Víctor). Both must approve any admin action.

**What it controls:** Pausing/unpausing contract, granting MINTER role to MerL1nk Bridge, blacklisting addresses, setting merchant tiers, reward pool payouts above 500 CATR, supply expansion (future).

---

## Data Flow: One Complete Transaction Cycle

```
1. CLIENT BUYS CATR (Etapa 1 — Manual Transfer)
   Client opens app → enters "500 HNL"
   → App shows Atlántida account + reference code
   → Client transfers manually from their banking app
   → Atlántida sends email notification to HNDA inbox
   → MerL1nk C++ parser reads notification in ≤60 seconds
   → Validates reference, checks bloom filter (no duplicate)
   → MerL1nk Bridge calls contract.mint(clientWallet, 500 CATR)
   → Client sees 500 CATR in wallet

2. CLIENT PAYS MERCHANT
   Client scans merchant QR → enters "200 CATR" → confirms
   → contract.transfer() executes:
       200 CATR sent
       0.63% commission = 1.26 CATR deducted
       0.945 CATR (75%) → HNDA treasury
       0.315 CATR (25%) → reward pool wallet
       Merchant receives 198.74 CATR
   → Backend records tx, updates milestone count + merchant visit log
   → If milestone reached → backend pays reward from pool (tiered auth)
   → Both see updated balances

3. MERCHANT REDEEMS
   Merchant clicks "Redeem 198.74 CATR" → request goes to backend
   → Admin approves in Admin UI
   → Backend calls contract.burn(merchantWallet, 198.74)
   → HNDA manually transfers 198.74 Lempiras to merchant's bank account
   → Done

4. REWARD TRIGGERS (async, backend-driven)
   After each tx, backend checks:
   → Milestone: has client hit tx #5, #10, #25? → pay accumulated + bonus
   → Cross-merchant: 3+ unique merchants in 30 days? → apply multiplier
   → Referral: did this client's referrer earn a bonus? → pay both
   All payouts: tiered authorization → from on-chain reward pool wallet

5. MINT FAILURE RECOVERY
   If mint fails after payment confirmed:
   → pending_mints record created in DB
   → MerL1nk Retry Queue (C++) retries with exponential backoff
   → Admin alerted after 3 failures
   → Daily reconciliation job resolves all unmatched pending_mints
```

---

## Project Structure (Monorepo)

```
HNDA/
├── packages/
│   ├── contracts/                    # Component 1: Smart Contracts
│   │   ├── contracts/
│   │   │   └── CATRToken.sol
│   │   ├── test/
│   │   │   └── CATRToken.test.ts
│   │   ├── scripts/
│   │   │   ├── deploy.ts
│   │   │   └── heartbeat.ts
│   │   └── hardhat.config.ts
│   │
│   ├── merlink/                      # Component 8: MerL1nk
│   │   ├── core/                     # C++ Core
│   │   │   ├── src/
│   │   │   │   ├── email_parser.cpp      # Bank notification parser
│   │   │   │   ├── bloom_filter.cpp      # Duplicate prevention
│   │   │   │   ├── retry_queue.cpp       # Failed mint retry engine
│   │   │   │   ├── vault_monitor.cpp     # Vault balance watcher
│   │   │   │   ├── nfc_reader.cpp        # NFC hardware interface (Etapa 2)
│   │   │   │   └── webhook_receiver.cpp  # BAC webhook handler (Etapa 2)
│   │   │   ├── include/
│   │   │   └── CMakeLists.txt
│   │   └── bridge/                   # Node.js Bridge
│   │       ├── src/
│   │       │   ├── mint.ts               # contract.mint() caller
│   │       │   ├── burn.ts               # contract.burn() caller
│   │       │   ├── reward.ts             # rewardPool.transfer() caller
│   │       │   └── heartbeat.ts          # Dead Man's Switch ping
│   │       └── package.json
│   │
│   ├── backend/                      # Component 2: Backend API
│   │   ├── src/
│   │   │   ├── routes/
│   │   │   │   ├── payments.ts           # Payment router
│   │   │   │   ├── redemptions.ts        # Merchant cashout
│   │   │   │   ├── rewards.ts            # Reward status & history
│   │   │   │   ├── referrals.ts          # Referral link management
│   │   │   │   ├── users.ts
│   │   │   │   └── admin.ts
│   │   │   ├── services/
│   │   │   │   ├── manual-transfer.ts    # Etapa 1: email-based payment
│   │   │   │   ├── bac-credomatic.ts     # Etapa 2: BAC webhook handler
│   │   │   │   ├── payment-router.ts     # Routes to active handler
│   │   │   │   ├── rewards.ts            # 3-pool reward engine logic
│   │   │   │   └── wallet.ts             # Custodial wallet mgmt
│   │   │   └── jobs/
│   │   │       ├── heartbeat.ts          # Dead Man's Switch cron
│   │   │       └── reconciliation.ts     # Daily pending_mints checker
│   │   ├── prisma/
│   │   │   └── schema.prisma             # Component 4: DB schema
│   │   └── package.json
│   │
│   └── web/                          # Component 3: Web Application
│       ├── app/
│       │   ├── (client)/                 # Client views
│       │   ├── (commerce)/               # Merchant views
│       │   └── (admin)/                  # Admin views
│       └── package.json
│
├── docs/
│   └── decisions/                    # Decision log
├── package.json                      # Root workspace config
├── turbo.json                        # Monorepo orchestration
└── CLAUDE.md
```

---

## Technology Stack

| Layer | Technology | Owner |
|-------|-----------|-------|
| Smart Contracts | Solidity 0.8.x + Hardhat + OpenZeppelin | — |
| MerL1nk Core | C++ 17 + CMake | Physical world interface |
| MerL1nk Bridge | Node.js 20 + TypeScript + ethers.js v6 | Blockchain interface |
| Backend | Node.js 20 + Express.js + TypeScript | — |
| Database | PostgreSQL + Prisma ORM | — |
| Frontend | Next.js 14 + React + TailwindCSS + TypeScript | — |
| Multi-sig | Gnosis Safe (no custom code) | — |
| Payment Gateway (Etapa 1) | Manual transfer via Atlántida + email parser | — |
| Payment Gateway (Etapa 2) | BAC Credomatic Payment Execution API | — |
| Hosting (Etapa 1) | Vercel (web) + Railway (backend + DB) | — |
| Monorepo | Turborepo + npm workspaces | — |

**Why TypeScript everywhere (except MerL1nk Core):** One language across contracts testing, backend, and frontend. MerL1nk Core is the deliberate exception — C++ is the right tool for hardware interfaces, bloom filters, and retry queues. The C++ foundation also provides the mental model for understanding every other layer of the stack.

---

## Etapa 1 Build Sequence

| Phase | What | Deliverable |
|-------|------|-------------|
| **Phase A** | Smart Contract | CATRToken.sol deployed on Base Sepolia, 90%+ test coverage, Gnosis Safe 2-of-2 as owner |
| **Phase B** | MerL1nk Etapa 1 | C++ email parser + bloom filter + retry queue. Node.js bridge with mint/burn/heartbeat |
| **Phase C** | Backend Core | Express API: manual-transfer handler → mint, redemption → burn, reward engine, reconciliation job |
| **Phase D** | Web MVP | Client buys CATR via manual transfer. Merchant views balance and requests redemption. Admin approves |
| **Phase E** | Integration | 5 end-to-end transactions documented. All components talking to each other |

---

## Verification Plan

1. Deploy CATRToken to Base Sepolia → verify on Basescan
2. Configure Gnosis Safe 2-of-2 as contract owner → test pause/unpause
3. MerL1nk email parser: send test Atlántida notification → verify parser extracts correct reference + amount
4. MerL1nk bloom filter: send same reference twice → verify second is rejected
5. MerL1nk bridge: validated payment → CATR minted → visible on Basescan
6. Client UI: manual transfer 500 HNL → see 500 CATR in wallet
7. Client UI: pay merchant 200 CATR → verify commission split on Basescan (75% HNDA / 25% pool)
8. Merchant UI: request redemption → admin approves → CATR burned on Basescan
9. Repeat steps 6-8 for 5 complete cycles
10. Verify reward engine: 5 transactions → milestone unlock → reward CATR paid from pool
11. Verify cross-merchant: client pays 3 different merchants → multiplier applied
12. Verify Dead Man's Switch: stop heartbeat → after configured interval → contract pauses
13. Verify mint failure recovery: simulate failed mint → retry queue resolves → pending_mint cleared
14. Verify reward pool tiered auth: auto payout < 50 CATR, admin approval 50-500, Gnosis > 500
15. Run full smart contract test suite: `npx hardhat test` → 90%+ coverage

---

## MerL1nk Long-Term Vision

When FIDELIO scales, MerL1nk becomes a standalone product — a payments intelligence layer that any Central American fintech could license. The C++ core's architecture (hardware interface + validation + retry queue + monitoring) is generic enough to serve any payment network that needs a bridge between the physical world and a blockchain. That is a separate business line that emerges naturally from what is built for FIDELIO.
---

## Privacy & Sovereignty Vision

*Added 2026-04-11 — emerged from brainstorming session on network infrastructure independence.*

### Core Principle

**Honduran people's business is Honduran people's business.**

FIDELIO's long-term architectural goal is to minimize the number of foreign entities in the critical path of a Honduran financial transaction. Transparency and auditability are achieved through the blockchain — not through dependence on American infrastructure companies.

### Why CATR Must Be On-Chain

CATR is not a points balance in a database. It is a loyalty token that must be:
- **Auditable** — any participant can verify any balance at any time
- **Transparent** — every mint, burn, and transfer is permanently recorded
- **Honest** — no central party can silently inflate or erase balances

These properties only exist on a public blockchain. A Postgres table controlled by HNDA cannot provide them. The chain is not a technical choice — it is a trust guarantee.

### Wallet Strategy

H-Wallets are the default. External wallets are the opt-in.

When a client registers with FIDELIO:
- **Default path** → FIDELIO generates an H-Wallet. The client needs no crypto knowledge. They have an account.
- **Power user path** → Client connects their own EVM-compatible wallet (MetaMask or any other). FIDELIO accepts the address and uses it.

From the contract's perspective, both are just addresses. The chain does not care who generated the keypair.

| | H-Wallet (default) | External wallet (opt-in) |
|---|---|---|
| Key generation | HNDA infrastructure | User's device |
| Key custody | HNDA | User |
| User experience | Invisible — just an account | Requires external wallet app |
| Sovereignty | HNDA sovereign | User sovereign |
| Migration control | HNDA controls it | User must act |
| Target user | Most Hondurans | Crypto-native users |

**Current state:** Wallet address generation is not yet implemented. The `POST /api/wallets` endpoint accepts an externally-supplied address. Key generation is the next infrastructure decision.

### Infrastructure Sovereignty Roadmap

This is a long-term transformation, not a sprint. Each layer is independent.

| Layer | Current state | Sovereign target |
|---|---|---|
| RPC node | Infura (via MetaMask/ethers default) | Self-hosted Base node on Honduran hardware |
| Key generation | Not yet implemented | Dedicated H-Wallet key management service |
| Key custody | TBD | HNDA-controlled HSM or encrypted store |
| Frontend wallet SDK | RainbowKit + WalletConnect cloud | Custom wallet connector, no cloud dependency |

**Obstacles to be aware of:**
1. Running a Base node requires 1-2TB storage, stable power, and 24/7 uptime — real operational risk in Honduras
2. Self-custodying private keys makes HNDA the bank — requires HSM-grade security thinking
3. Base L2 is controlled by Coinbase — true chain sovereignty would require an HNDA L2 (long-term ceiling)
4. Regulatory surface: CNBS may view sovereign infrastructure as a licensing question

