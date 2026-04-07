# Redeploy Required — BURNER_ROLE Addition (H1)

## What changed

`CATRToken.sol` now has a dedicated `BURNER_ROLE` separate from `MINTER_ROLE`.

- `burn()` is now restricted to `onlyRole(BURNER_ROLE)`.
- The constructor accepts a new `_burner` address parameter.
- The bridge minter wallet can no longer burn tokens.

## Why

The original contract granted burn capability to the MINTER_ROLE. This meant the bridge minter wallet — which runs as an automated process — could both mint and burn tokens. A compromised bridge key could destroy tokens from any address. Separating the roles limits the blast radius: a compromised minter can only mint (capped at 50M CATR), not burn.

## Current live deployment

| | Address |
|---|---|
| CATRToken (old) | `0xDbf22d63A084DA0B5af08e55B1644fFE75D130b5` |
| Network | Base Sepolia |

The live contract does NOT have BURNER_ROLE. It must be redeployed.

## Steps to redeploy

1. Decide on the burner address. Recommended: VaultOp Safe (`0x43E528d658dB911F8cbc77620Ed2A7c0F0226AB7`) — same 2-of-2 gate as high-value redemptions.
2. Add `BURNER_ADDRESS` to `packages/contracts/.env`.
3. Run:
   ```bash
   cd packages/contracts
   npx hardhat run scripts/deploy.ts --network base_sepolia
   ```
4. Update `packages/merlink/bridge/.env` with the new contract address.
5. Verify on BaseScan:
   ```bash
   npx hardhat verify --network base_sepolia <new_address> <treasury> <rewardPool> <admin> <minter> <burner>
   ```
6. Update CLAUDE.md with the new contract address.
