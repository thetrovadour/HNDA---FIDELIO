# Season 2: The Bridge, the Backend, and the Web

**Project:** FIDELIO — Digital Loyalty Point System for Honduran Tourism
**Period:** 2026-03-31 → 2026-04-06
**Phases covered:** A (contract) · B (Node.js Bridge) · C (Backend) · D (Web MVP)
**Final test count:** 131/131 passing (+ build passing for Phase D)

---

## The Starting Point

Season 1 ended with a fully tested C++ engine and no destination to send events to. Six modules, 66 tests, and a `PaymentEvent` struct that unified three completely different input sources. The engine was running in a sealed room.

Season 2 opened the door.

Four phases in three sessions. Each one extending the stack one layer further — from the blockchain, through the database, up to the browser. At the end of Season 2, FIDELIO had a face.

---

## What Was Built

### Phase B — The Node.js Bridge

The bridge is the only component in the system that crosses the boundary between software and money. Everything before it is computation. Everything after it is on-chain and irreversible.

**IPC mechanism: Unix domain socket**

The C++ core and the Node.js bridge run as independent operating system processes. When the bridge goes down for a deployment, the C++ parser keeps running. When the parser restarts after a crash, the bridge is already waiting. The socket is the handshake between two processes that do not know or care about each other's internals. This is the modularity principle made concrete.

Rejected alternative: stdin/stdout pipe. A pipe creates a parent-child dependency — if one dies, the other becomes orphaned. The socket makes both equals.

**`minter.ts`**

The bridge pops a `PaymentEvent` from the socket, converts the Lempira amount to CATR (1:1 for Etapa 1), and calls `contract.mint(clientWallet, amountCATR)` via ethers.js on Base Sepolia. This is the line of code where a bank transfer becomes a blockchain token. Twelve characters of Solidity — `_mint(to, amount)` — and a client's CATR balance increases.

**8 tests. 8 passing.** Phase B declared complete: 74/74 (66 C++ + 8 bridge).

---

### Phase A — CATRToken.sol

The smart contract is the final authority. It does not trust the bridge. It does not trust the admin. It trusts the roles it was given at deployment and nothing else.

**The invariants, encoded in Solidity:**

- `ERC20Capped(50_000_000 * 10**18)` — 50 million CATR hard cap, enforced by OpenZeppelin at the EVM level. The cap cannot be changed after deployment.
- `_update()` override — every non-mint, non-burn transfer deducts 3.6% commission before execution. Three sub-transfers per transfer: recipient, treasury, reward pool. The math is transparent and verifiable on-chain.
- `MINTER_ROLE` — only the bridge minter wallet can call `mint()`. Granted atomically in the constructor. No post-deploy `grantRole` call required.
- `DEFAULT_ADMIN_ROLE` — assigned to VaultOp Safe (Gnosis Safe 2-of-2: Cristian + Víctor). The admin cannot mint. The minter cannot administrate.

**Gas analysis:** Three `_update()` calls per transfer costs ~96,874 gas vs ~51,000 for a standard ERC-20. On Base L2, this is approximately $0.0002 per transfer. Moving commission off-chain would save fractions of a cent at the cost of on-chain transparency and correctness. Not worth it.

**13 tests. 13 passing.** Phase A declared complete — pending wallet deployment.

---

### Phase C — The Backend

The backend is the system's memory and its referee. The blockchain records what happened. The backend records why, with whom, at what tier, and whether it needs to be retried.

**`packages/backend/` — Express + PostgreSQL/Prisma**

Eleven tables. Five services. Eight route groups. One reconciliation cron job.

The central invariant of Phase C: `MintService.$transaction()`. When a mint event arrives from the bridge, three writes happen atomically — `PendingMint`, `ProcessedReference`, and `Transaction`. Either all three succeed or none do. This is the database-level enforcement of MINT-BEFORE-PAY integrity. If the application crashes between writes, the `ReconciliationJob` (runs at 02:00 CST / 08:00 UTC) finds the unresolved `PendingMint` and retries.

**Key decisions:**

The `createApp()` factory pattern — the Express app is created by a function that returns a configured app without ever calling `.listen()`. Tests import `createApp` and wrap it in `supertest`. No port is ever bound during testing. The same principle as the C++ static parse methods: fast, deterministic, impossible to flake.

`RewardMilestone @@unique([user_id, type])` — the race-condition guard for milestone unlocks. TX_5 can only be inserted once per user at the database level. No application-level locking. Prisma throws a unique constraint error on a duplicate attempt; the service catches and ignores it.

Redemption tier thresholds live in environment variables — `REDEMPTION_TIER_ADMIN_MIN=50`, `REDEMPTION_TIER_VAULT_MIN=500`. After the pilot with Reina, these will be calibrated from real transaction data and adjusted without redeploying.

**44 tests. 44 passing.** Phase C declared complete.

---

### Phase D — The Web MVP

The web app is not production software. It is a window into the system — three views, each one showing exactly what its user needs to see.

**`packages/web/` — Next.js (App Router) + Tailwind CSS**

Three dashboards:

**Client view** — CATR balance, transaction history, reward milestones, spend form. The client arrives via a pre-configured URL: `/client?userId=<uuid>`. No login flow. This is intentional for the pilot with Reina. The URL is the credential.

**Merchant view** — Merchant information and a redemption request form. Same URL-based identity. The merchant presses a button, a redemption request is created in the database, and the admin queue lights up.

**Admin view** — Three tabs: merchant management, redemption queue (with approve/reject), reward payout queue (with approve). Admin identity comes from a JWT pasted manually into an input field. Two people use this view: Cristian and Víctor. Session management would be engineering for its own sake.

`lib/api.ts` — typed fetch wrappers for every `/api/*` route. The components never construct URLs or handle HTTP directly. Every external call goes through this file.

**Build passing.** Phase D declared complete.

---

## The Numbers

| Phase | Component | Tests |
|---|---|---|
| B | Node.js Bridge | 8/8 |
| A | CATRToken.sol | 13/13 |
| C | Backend (Express + Prisma) | 44/44 |
| D | Web MVP | Build passing |
| **Total** | | **131/131** |

---

## Key Decisions Made in Season 2

| Decision | Reason |
|---|---|
| Unix socket for C++↔Bridge IPC | Independent process lifecycles; either can restart without killing the other |
| `$transaction()` wraps all mint writes | Atomic PendingMint + ProcessedReference + Transaction; crash recovery via ReconciliationJob |
| `createApp()` factory pattern | Express app testable without binding a port; same principle as C++ static parse methods |
| Commission math stays on-chain | $0.0002/tx cost on Base; transparency outweighs marginal gas savings |
| Constructor grants MINTER_ROLE atomically | No post-deploy `grantRole` call; deployer never needs admin rights |
| VaultOp named for what it operates | Named for the vault it guards (high-value redemptions), not for Gnosis Safe |
| Pilot tiers from real data | Thresholds (50/500 CATR) are env vars, set after Reina's pilot, not guessed in advance |
| All three views are client components | Internal MVP used by two people; server-side data fetching is engineering for its own sake |

---

## What Season 2 Proved

A loyalty token system is not one thing. It is eight independent components that each do exactly one job, connected by well-defined interfaces. The C++ parser does not know about PostgreSQL. The bridge does not know about the web app. The smart contract does not know about anything.

Season 2 proved that this design is buildable. Not just as an architecture diagram — as working, tested software.

The engine has somewhere to go. The money has somewhere to land. The admin has something to approve.

---

## Season 3 Preview

**Five real transactions. One live deployment.**

The contract goes to Base Sepolia with real wallet addresses. VaultOp Safe is configured with two signers. The bridge `.env` gets populated with the live contract address.

Then five end-to-end transactions run against the full stack — real PostgreSQL, real backend, real mint flow. Duplicate rejection. TX_5 milestone unlock. The integration test harness in `packages/e2e/` proves the entire pipeline from HTTP request to confirmed database state.

**The system goes live.**

---

*Report written at end of Season 2 — 2026-04-06*
*Claude Code + oh-my-claudecode | FIDELIO v0.2.0*
