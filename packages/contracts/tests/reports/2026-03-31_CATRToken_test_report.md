# CATRToken.sol — Test Report

**Date:** 2026-03-31
**Contract:** `packages/contracts/contracts/CATRToken.sol`
**Framework:** Hardhat + ethers.js v6 + Chai
**Compiler:** Solidity 0.8.20, optimizer enabled (200 runs)
**Result:** 13/13 tests passing

---

## Test Suite Results

| # | Suite | Test | Result |
|---|---|---|---|
| 1 | Deployment | correct name ("CATR Token") and symbol ("CATR") | ✅ Pass |
| 2 | Deployment | correct cap (50,000,000 CATR) | ✅ Pass |
| 3 | Deployment | starts with zero supply | ✅ Pass |
| 4 | Mint | MINTER_ROLE can mint tokens | ✅ Pass |
| 5 | Mint | non-minter cannot mint (AccessControlUnauthorizedAccount) | ✅ Pass |
| 6 | Supply cap | minting beyond 50M reverts (ERC20ExceededCap) | ✅ Pass |
| 7 | Burn | MINTER_ROLE can burn from an address | ✅ Pass |
| 8 | Burn | non-minter cannot burn | ✅ Pass |
| 9 | Commission | 1.8% split correct on 10,000 CATR transfer | ✅ Pass |
| 10 | No commission on mint | treasury + rewardPool unchanged after mint | ✅ Pass |
| 11 | No commission on burn | treasury + rewardPool unchanged after burn | ✅ Pass |
| 12 | Admin role | DEFAULT_ADMIN_ROLE can grant MINTER_ROLE | ✅ Pass |
| 13 | Admin role | non-admin cannot grant MINTER_ROLE | ✅ Pass |

---

## Commission Math Verified (Test #9)

Transfer of 10,000 CATR:

| Destination | Calculation | Amount |
|---|---|---|
| Commission total | 10,000 × 180 / 10,000 | **180 CATR** |
| → Treasury (65%) | 180 × 65 / 100 | **117 CATR** |
| → RewardPool (35%) | 180 − 117 | **63 CATR** |
| → Recipient (net) | 10,000 − 180 | **9,820 CATR** |
| Total | 117 + 63 + 9,820 | **10,000 CATR** ✓ (no wei lost) |

---

## Non-Negotiable Invariants — Status

| Invariant | Enforced In | Tested |
|---|---|---|
| Supply cap: 50,000,000 CATR | `ERC20Capped` | ✅ Test #6 |
| 1.8% commission on every transfer | `_update()` override | ✅ Test #9 |
| 65% commission → treasury | `_update()` override | ✅ Test #9 |
| 35% commission → rewardPool | `_update()` override | ✅ Test #9 |
| No commission on mint | `from == address(0)` guard | ✅ Test #10 |
| No commission on burn | `to == address(0)` guard | ✅ Test #11 |
| MINTER_ROLE required to mint/burn | `onlyRole(MINTER_ROLE)` | ✅ Tests #5, #8 |
| DEFAULT_ADMIN_ROLE controls roles | `AccessControl` | ✅ Tests #12, #13 |

---

## Access Control Design Verified

- **MINTER_ROLE** — granted to bridge wallet at deploy time
- **DEFAULT_ADMIN_ROLE** — held by VaultOp (Gnosis Safe 2-of-2: Cristian + Víctor)
  - VaultOp is the manual gate for high-value redemptions (>500 CATR)
  - Named for what it operates, not what operates it

---

## Gas Summary (from gas reporter)

| Operation | Gas Used |
|---|---|
| Deployment | 928,938 |
| mint | 71,261 |
| burn | 29,499 |
| transfer (with commission) | 96,874 |
| grantRole | 51,498 |

Full gas analysis: `packages/contracts/Efficiency/2026-03-31_CATRToken_Gas_Analysis.md`

**Bottom line:** All operations are economically viable on Base L2. Transfer costs ~$0.0002 under normal conditions.

---

## What Requires Real Wallets to Complete

- Populate `packages/contracts/.env` with real addresses
- Run `npx hardhat run scripts/deploy.ts --network base_sepolia`
- Set up VaultOp (Gnosis Safe 2-of-2) on Base Sepolia with Cristian + Víctor wallets
- Wire deployed contract address into `packages/merlink/bridge/.env`
