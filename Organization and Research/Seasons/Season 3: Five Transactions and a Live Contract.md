# Season 3: Five Transactions and a Live Contract

**Project:** FIDELIO — Digital Loyalty Point System for Honduran Tourism
**Period:** 2026-04-06
**Phases covered:** E (Integration) · A (Deployment)
**Final check count:** 16/16 integration checks passing · Contract live on Base Sepolia

---

## The Starting Point

At the end of Season 2, FIDELIO was fully built and entirely theoretical. 131 tests passed. The web app rendered. The backend served routes. The contract compiled cleanly.

But nothing had ever actually moved.

Season 3 was the answer to a single question: does it all actually work together?

---

## What Was Built and Done

### Phase E — The Integration Harness

`packages/e2e/` — a standalone TypeScript package with one job: prove the backend's MintService pipeline end-to-end against real PostgreSQL, with no mocking, no shortcuts, and no test doubles except for the on-chain mint call (which is deferred to the live contract, already tested separately in Phase A).

**What the harness does:**

1. Seeds a timestamped test user (`e2e-<ts>@test.fidelio`) and a merchant
2. Submits 5 mint events to the backend via HTTP — the exact same path the bridge takes in production
3. Submits a 6th event with a duplicate reference code — expects rejection
4. Verifies: 5 confirmed transactions in PostgreSQL, 1 rejected duplicate, TX_5 milestone unlocked in `RewardMilestone`, `PendingMint` records showing CONFIRMED status

**Why HTTP, not the C++ core:**

The C++ core and Node.js bridge were already proven in Phase B (74/74 tests). Phase E targeted the layer that had never been exercised end-to-end: the backend's MintService pipeline against a real database. Testing the bridge again would have been redundancy, not integration testing.

**Mock transaction hashes are intentional.**

The bridge's `minter.mint()` is the on-chain call. It is the Phase A wire-up, done in the deployment step. Everything downstream of the mint — `PendingMint` creation, `CONFIRMED` update, reward evaluation — is fully real in Phase E and was proven by these tests.

**16/16 checks passing.** Phase E declared complete.

---

### Phase A — Live Deployment to Base Sepolia

The contract that had existed only in local Hardhat networks went to Base Sepolia with real wallets.

**The constructor bug and its fix:**

The original deploy script tried to call `grantRole(MINTER_ROLE, minterAddress)` after deployment. This failed: `DEFAULT_ADMIN_ROLE` had been granted to the VaultOp Safe — not the deployer. The deployer had no authority to call `grantRole` after the fact.

Fix: the constructor was updated to accept `_minter` as a parameter and call `_grantRole(MINTER_ROLE, _minter)` internally. Cleaner, cheaper (one less transaction), and atomic. The minter has its role from the moment the contract exists.

**Deployed addresses:**

| Role | Address |
|---|---|
| CATRToken contract | `0xDbf22d63A084DA0B5af08e55B1644fFE75D130b5` |
| Treasury | `0x10039B003AE9c0Ef55218D38f0c8Db088B35E2ED` |
| RewardPool | `0x9E6cF98F2412E4E959863C68a154d9a2f834ac9c` |
| VaultOp Safe (Admin) | `0x43E528d658dB911F8cbc77620Ed2A7c0F0226AB7` |
| Bridge Minter | `0x3A0bEC7F585Ce2A28e1ECe6f15389b15f4158290` |

**Source verified on BaseScan.**

Full Solidity source is publicly readable at `https://sepolia.basescan.org/address/0xDbf22d63A084DA0B5af08e55B1644fFE75D130b5#code`. Anyone auditing the contract can verify the commission logic, role assignments, and supply cap without trusting the bytecode alone.

**Etherscan V2 API note:**

The network-specific `apiKey` object format is deprecated. The correct format is a single string `apiKey: process.env.ETHERSCAN_API_KEY` with a custom chain config pointing to `https://api-sepolia.basescan.org/api`.

---

### Security Review v1.0

Before closing Season 3, a full security review was run on the deployed system.

**Findings and immediate fixes:**

| Severity | Finding | Resolution |
|---|---|---|
| Critical | C1 — 7 financial endpoints unauthenticated | `adminAuth` added to all 7 routes + L3 route ordering bug fixed |
| Critical | C2 — Next.js 14.2.3 with known CVEs | Upgraded to Next.js 16.2.2, 0 vulnerabilities |

**Deferred to Season 4 (pre-pilot):**
- H1 — BURNER_ROLE separation from MINTER_ROLE
- H2 — Timing-safe bridge secret comparison
- H3 — Rate limiting on all endpoints
- H4 — JWT algorithm pinned to HS256

---

## The Numbers

| Component | Result |
|---|---|
| Phase E integration harness | 16/16 checks |
| CATRToken.sol on Base Sepolia | Live — verified |
| Backend after C1 fix | 44/44 tests |
| Next.js after C2 fix | 0 vulnerabilities |

---

## Key Decisions Made in Season 3

| Decision | Reason |
|---|---|
| E2E hits HTTP layer directly — no C++ process | C++ + bridge already proven; this tests the untested layer (MintService ↔ PostgreSQL) |
| Mock tx hashes are correct and intentional | On-chain mint deferred to live deployment; downstream pipeline is fully real |
| Test data stays in fidelio_dev | Timestamped users are identifiable and harmless; available for post-run inspection |
| MINTER_ROLE moved into constructor | Deployer had no admin rights after deployment; atomic grant is cleaner and cheaper |
| BaseScan source verification | Public audit trail; anyone can verify commission logic without trusting bytecode |
| Etherscan V2 API single-key format | Network-specific apiKey object is deprecated; single string required |

---

## What Season 3 Proved

A system that passes every unit test and integration test still has a gap: the moment it first touches the real world. Season 3 closed that gap.

Five transactions ran through the full stack. A duplicate was rejected. A milestone unlocked. A contract went live on a public blockchain with real wallet addresses and publicly verifiable source code.

FIDELIO is no longer theoretical. It is deployed.

---

## Season 4 Preview

**Security hardening and the first correction.**

The remaining high-severity findings from the security review are addressed before the pilot with Reina:

- BURNER_ROLE separated from MINTER_ROLE — requires a contract redeploy
- Timing-safe bridge secret comparison
- Rate limiting across all endpoints
- JWT algorithm pinned to HS256

Additional findings surface in a second security review pass — unauthenticated wallet and merchant routes, missing CORS, error handler leaking internals, missing body size limit.

All are fixed. The system is hardened.

Then the contract is redeployed with BURNER_ROLE, and the boulder keeps rolling.

---

*Report written at end of Season 3 — 2026-04-06*
*Claude Code + oh-my-claudecode | FIDELIO v0.3.0*
