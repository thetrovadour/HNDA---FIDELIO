# FIDELIO — Project Organization Explanation

## Root Level

```
HNDA---FIDELIO/
├── package.json          Root workspace config — defines monorepo workspaces
├── turbo.json            Turborepo config — orchestrates builds across packages
├── ClaudeProfile/        AI workspace guidelines
├── Organization and Research/   Documentation, plans, and research
└── packages/             All application code lives here
```

- **package.json** — Declares the npm workspaces (contracts, bridge, backend, web) so all packages share dependencies and can reference each other
- **turbo.json** — Defines the build/test/dev pipeline so Turborepo runs tasks in the correct dependency order

---

## ClaudeProfile/

```
ClaudeProfile/
└── CLAUDE.md             AI agent workspace rules and project context
```

- Contains instructions and context for AI-assisted development

---

## Organization and Research/

```
Organization and Research/
├── CLAUDE.md                          Working rules for AI within this folder
├── Fidelio-Architecture-Planv1.1.md   Main technical blueprint — all 8 components
├── FIDELIO-Learning-Plan.md           Learning resources and background
├── learning-plan.md                   Education and study plan
├── sources-and-resources.md           External references and materials
├── organization-explanation.md        This file — explains project structure
└── Merlink/                           MerL1nk-specific plans and documentation
    └── bloom-filter-plan.md           Bloom filter implementation plan
```

- All documentation, research, and plans live here — separate from code
- **Merlink/** subfolder holds component-specific technical plans

---

## packages/contracts/ — Component 1: Smart Contracts

```
packages/contracts/
├── contracts/
│   └── CATRToken.sol         ERC-20 token with commission, tiers, Dead Man's Switch
├── test/
│   └── CATRToken.test.ts     Contract unit tests (target: 90%+ coverage)
├── scripts/
│   ├── deploy.ts             Deployment script for Base Sepolia
│   └── heartbeat.ts          Dead Man's Switch ping script
└── hardhat.config.ts         Hardhat configuration
```

- **Technology:** Solidity 0.8.x, Hardhat, OpenZeppelin, ethers.js v6
- **Purpose:** Immutable on-chain rules — token transfers, commission split (3.6%), tier limits, pause/blacklist
- Currently empty — awaiting Phase A implementation

---

## packages/merlink/ — Component 8: MerL1nk (Hybrid C++ / Node.js)

### packages/merlink/core/ — MerL1nk Core (C++)

```
packages/merlink/core/
├── CMakeLists.txt            CMake build configuration
├── include/
│   └── bloom_filter.h        Bloom filter class declaration
├── src/
│   ├── email_parser.cpp      Monitors HNDA inbox, parses Atlantida bank notifications
│   ├── bloom_filter.cpp      Duplicate prevention — "have I processed this reference?"
│   ├── retry_queue.cpp       Failed mint retry with exponential backoff
│   ├── vault_monitor.cpp     Polls vault balance ratios, alerts on threshold breach
│   ├── murmurhash3.h         MurmurHash3 header (used by bloom filter)
│   ├── murmurhash3.cpp       MurmurHash3 implementation
│   ├── nfc_reader.cpp        NFC hardware interface (Etapa 2)
│   └── webhook_receiver.cpp  BAC webhook handler (Etapa 2)
└── tests/
    └── bloom_filter_test.cpp Unit tests for bloom filter
```

- **Technology:** C++17, CMake
- **Purpose:** Physical world interface — speed, determinism, 24/7 operation
- **Etapa 1 modules (4):**
  - **email_parser** — Reads bank email notifications every 60 seconds, extracts amount + reference code
  - **bloom_filter** — Ultra-fast probabilistic duplicate check using bit array + hash functions
  - **retry_queue** — Queues failed blockchain transactions, retries with exponential backoff, persists to disk
  - **vault_monitor** — Continuously checks vault balance health (67/33 USDT/fiat split)
- **Etapa 2 modules:** nfc_reader, webhook_receiver

### packages/merlink/bridge/ — MerL1nk Bridge (Node.js)

```
packages/merlink/bridge/
├── src/
│   ├── mint.ts               Calls contract.mint() after C++ Core validates payment
│   ├── burn.ts               Calls contract.burn() after redemption approved
│   ├── reward.ts             Calls rewardPool.transfer() for reward payouts
│   └── heartbeat.ts          Sends 24h ping to Dead Man's Switch
└── package.json
```

- **Technology:** Node.js 20, TypeScript, ethers.js v6
- **Purpose:** Blockchain interface — receives validated instructions from C++ Core, executes on-chain
- **Communication:** Internal HTTP or Unix socket between Core and Bridge

---

## packages/backend/ — Component 2: Backend API

```
packages/backend/
├── src/
│   ├── routes/
│   │   ├── payments.ts           Payment router (manual transfer / BAC webhook)
│   │   ├── redemptions.ts        Merchant cashout requests
│   │   ├── rewards.ts            Reward status and history
│   │   ├── referrals.ts          Referral link management
│   │   ├── users.ts              User registration and auth
│   │   └── admin.ts              Admin operations
│   ├── services/
│   │   ├── manual-transfer.ts    Etapa 1: email-based bank transfer verification
│   │   ├── bac-credomatic.ts     Etapa 2: BAC webhook handler
│   │   ├── payment-router.ts     Routes to whichever payment handler is active
│   │   ├── rewards.ts            3-pool reward engine logic
│   │   └── wallet.ts             Custodial wallet management
│   └── jobs/
│       ├── heartbeat.ts          Dead Man's Switch cron (24h ping)
│       └── reconciliation.ts     Daily pending_mints checker
├── prisma/
│   └── schema.prisma             Component 4: Database schema definition
└── package.json
```

- **Technology:** Node.js 20, Express.js, TypeScript, Prisma ORM, ethers.js v6
- **Purpose:** Orchestration layer — connects MerL1nk to the web app, manages rewards, handles mint/burn logic
- **Component 4 (PostgreSQL)** schema lives inside backend's prisma/ folder

---

## packages/web/ — Component 3: Web Application

```
packages/web/
├── app/
│   ├── (client)/                 Client views (mobile-first)
│   │   ├── buy/                  Buy CATR — payment flow
│   │   ├── pay/                  Pay merchant — QR scan
│   │   ├── wallet/               Balance + transaction history
│   │   └── rewards/              Milestone progress, referral link
│   ├── (commerce)/               Merchant views (desktop-friendly)
│   │   ├── receive/              QR code for customers
│   │   ├── dashboard/            Balance + incoming payments
│   │   └── redeem/               CATR to Lempiras conversion
│   └── (admin)/                  Admin views (HNDA operator)
│       ├── overview/             System health, circulation stats
│       ├── redemptions/          Approve/reject merchant cashouts
│       ├── merchants/            Register merchants, assign tiers
│       └── reward-pool/          Pool balance, pending payouts
└── package.json
```

- **Technology:** Next.js 14, React, TailwindCSS, TypeScript
- **Purpose:** Single app with 3 role-based interfaces — client, merchant, admin

---

## Components Not in packages/ (No Custom Code)

- **Component 5: GCAToken.sol** — Deferred to Etapa 2 (4-year vesting, not needed for pilot)
- **Component 6: VaultRegistry.sol** — Deferred to Etapa 2 (needs real vault data)
- **Component 7: Gnosis Safe** — 2-of-2 multi-sig wallet, configured via gnosis-safe.global (no custom code)
