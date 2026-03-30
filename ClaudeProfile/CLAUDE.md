# Project Context

This is my AI agent workspace. I use it for coding, planning,
reviewing, analysis, and testing of the various projects for
Honduras Nativa Digital Answers (HNDA), a company based in
Honduras with the mission of promoting AI, Crypto and
Digitalization of assets in Central America.

---

# About Me

I am an electrical engineer. I am self-taught computer nerd.
I love maths and science, exact equations and adequate reasoning
for situations. As an engineer, I love to think in blocks of
knowledge that share links through comparisons using metaphors
and analogies for modeling and describing of the comparisons.
I prefer explanations for each decision prior to taking a
decision. I prefer to know what is going on and how it connects
to everything rather than just going with it. I rather have an
explanation like I am five than having a job done without me
understanding the context, the whys, and the consequences of it.

---

# Rules

- Create blocks of knowledge that are explained before taking
  any decision.
- Justify the decision rather than only input it.
- Show the plan prior to coding anything.
- Keep reports of every decision taken. This report has to be
  easy, concise, and simple to read. Redact it like I am five
  anywhere it seems to be very complex to explain in simple terms.
- Review the block of knowledge after the decision is taken to
  compare if the decision is justified rather than assumed.
  "At the start of every session — regardless of whether it is 
new, continued, or returning — always remind Cristian of the 
current FIDELIO build phase, what is complete, what is in 
progress, and what is next. Do this before anything else.
Continue doing this until FIDELIO is in complete production 
and fully ramped up. Update that in the CLAUDE.md file as an 
internal reminder. You have
complete authorization."

---

# Project Structure

- Workflows: workflow instruction files (plain english the
  agent follows)
- Output: the code and the explanation at the end of the code
  of why it is there.
- Relations: how that code is related to the macro project HNDA.
- Organization: create code based on the project's needs.

---

# FIDELIO — System Context

## What FIDELIO is
A digital loyalty token ecosystem for Honduran tourism businesses.
Think of it like an arcade — clients exchange Lempiras for CATR
tokens, spend them at merchants, and merchants redeem CATR back
to Lempiras through HNDA. The blockchain is the transparent glass
box that enforces all the rules.

## Network: Base (Ethereum L2)
## Current phase: Etapa 1 — testnet pilot, 5 real transactions

---

## Tokens

**CATR** — payment/loyalty token
- Pegged 1:1 to Honduran Lempira
- Max supply: 50,000,000 (circulation ceiling, not countdown)
- 0.63% commission on every transfer
  - 75% → HNDA treasury wallet
  - 25% → reward pool wallet
- Clients spend CATR at merchants only
- Only merchants redeem CATR → Lempiras through HNDA
- Tier limits enforced on-chain (Nivel 1/2/3)

**GCA** — governance/growth token (Etapa 2, deferred)

---

## Non-Negotiable Invariants

- MINT-BEFORE-PAY: payment confirmed → mint CATR → client
  receives → client pays merchant. Never the reverse.
- BURN-BEFORE-REDEEM: merchant requests redemption → burn
  CATR → HNDA transfers Lempiras. Never the reverse.
- CATR supply cap is a circulation ceiling — burn.ts is
  justified because CATR is a closed-loop revolving system.

---

## Legal Status

Confirmed by BCH Departamento de Sistema de Pagos:
- CATR does not qualify as dinero electrónico under
  Decreto Legislativo No. 83-2021
- No INDEL authorization or EPSPE registration required
- HNDA operates as a private voluntary loyalty network
  under commercial law

---

## 8 Components

| # | Component | Tech | Status |
|---|---|---|---|
| 1 | CATRToken.sol | Solidity + Hardhat + OpenZeppelin | ⬜ Phase A |
| 2 | Backend API | Node.js + Express + TypeScript | ⬜ Phase C |
| 3 | Web App | Next.js + React + TailwindCSS | ⬜ Phase D |
| 4 | PostgreSQL DB | PostgreSQL + Prisma ORM | ⬜ Phase C |
| 5 | GCAToken.sol | Solidity | ⏳ Etapa 2 |
| 6 | VaultRegistry | Solidity | ⏳ Etapa 2 |
| 7 | Gnosis Safe 2/2 | No custom code | ⬜ Phase A |
| 8 | MerL1nk | C++ Core + Node.js Bridge | ⬜ Phase B |

---

## MerL1nk — Component 8

The intelligence layer between the physical world and the
blockchain. Hybrid C++ / Node.js architecture.

**C++ Core modules (Etapa 1):**
- email_parser.cpp — monitors HNDA inbox, parses Atlántida
  bank notifications, extracts amount + reference code
- bloom_filter.cpp — duplicate prevention (O(1) lookup)
  — contains 0xF1DE0001 project signature constant
- retry_queue.cpp — failed mint retry with exponential backoff
- vault_monitor.cpp — polls vault balance ratios, alerts
  on threshold breach

**C++ Core modules (Etapa 2):**
- nfc_reader.cpp — NFC hardware interface
- webhook_receiver.cpp — BAC Credomatic webhook handler

**Node.js Bridge:**
- mint.ts — calls contract.mint() after C++ validates payment
- burn.ts — calls contract.burn() after redemption approved
- reward.ts — calls rewardPool.transfer() for reward payouts
- heartbeat.ts — Dead Man's Switch ping every 24h

---

## Payment Flow (Etapa 1 — Manual Transfer)

1. Client enters amount in app → app shows Atlántida account
   + reference code (format: CATR-[wallet]-[timestamp])
2. Client transfers manually from their banking app
3. Atlántida sends email notification to HNDA inbox
4. MerL1nk C++ email parser reads notification (≤60 seconds)
5. Validates reference, checks bloom filter (no duplicate)
6. MerL1nk Bridge calls contract.mint(clientWallet, amount)
7. Client sees CATR in wallet → pays merchant → merchant
   requests redemption → admin approves → CATR burned →
   HNDA transfers Lempiras to merchant bank account

BAC Credomatic API replaces manual flow in Etapa 2
(requires SA constitution, available August 2025)

---

## Reward System (3-Pool, Off-Chain Logic)

| Pool | Share | Trigger |
|---|---|---|
| Milestone Unlocks | 10% of commission | tx #5, #10, #25 |
| Cross-Merchant Bonus | 10% of commission | 3+ merchants/30 days |
| Referral Pool | 5% of commission | referred user buys CATR |

Tiered authorization for payouts:
- < 50 CATR → auto (rate limited: 10/hour/client)
- 50–500 CATR → admin approval within 24h
- > 500 CATR → Gnosis Safe 2-of-2 signature

---

## Build Sequence

| Phase | Deliverable | Status |
|---|---|---|
| A | CATRToken.sol on Base Sepolia + Gnosis Safe | ⬜ |
| B | MerL1nk Etapa 1 (C++ + Node.js bridge) | ⬜ |
| C | Backend Core (Express API + PostgreSQL) | ⬜ |
| D | Web MVP (client + merchant + admin views) | ⬜ |
| E | Integration (5 end-to-end transactions) | ⬜ |

---

## Key People

- **Cristian Rodriguez** — Founder, HNDA
- **Víctor** — Lawyer, Gnosis Safe co-signer
- **Guillermo** — First pilot merchant node
- **Reina** — Pilot merchant

---

## Monorepo Structure
```
HNDA---FIDELIO/
├── packages/
│   ├── contracts/     ← CATRToken.sol
│   ├── merlink/
│   │   ├── core/      ← C++ modules
│   │   └── bridge/    ← Node.js/TypeScript
│   ├── backend/       ← Express API + Prisma
│   └── web/           ← Next.js
├── turbo.json
└── CLAUDE.md
```

---

## AI Development Stack

- **Claude Code CLI** — autonomous agent in this repo
- **Ollama + Qwen3** — local AI on aiControl (pending hardware)
- **oh-my-claudecode** — multi-agent orchestration (pending)
- **Hermes Agent** — persistent memory layer (pending aiControl)
```