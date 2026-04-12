# HNDA---WALLETS

Part of the HNDA ecosystem. Lives inside the HNDA---FIDELIO monorepo.

---

## What This Is

HNDA Wallets is the sovereign wallet infrastructure for the HNDA network — the Honduran answer to MetaMask.

**Vision:** A self-custody wallet app backed by HNDA-operated nodes. No Infura. No ConsenSys. No foreign entity in the critical path of a Honduran financial transaction.

**Principle:** Honduran people's business is Honduran people's business.

---

## Relationship to FIDELIO

| Wallet type | Lives in | Custody | User |
|---|---|---|---|
| H-Wallet | FIDELIO backend | HNDA (custodial) | Most Hondurans — no crypto knowledge needed |
| HNWallet | HNDA Wallets app | User (self-custody) | Power users, merchants, crypto-native |

FIDELIO accepts HNWallets as external wallets — the same way it accepts MetaMask today, but sovereign.

---

## Components

```
HNDA---WALLETS/
  app/          # Wallet application (mobile-first, React Native or PWA — TBD)
  node/         # HNDA-operated Base node infrastructure
  keyvault/     # Key generation and management service (H-Wallet backend)
  docs/         # Architecture decisions and research
```

### app/
The user-facing wallet. Generates keypairs on the user's device. Signs transactions locally. Connects to HNDA's own node. No cloud wallet SDK.

### node/
Self-hosted Base L2 node. Replaces Infura as the RPC endpoint for both FIDELIO and the wallet app. Runs on Honduran hardware long-term.

### keyvault/
Key management service for H-Wallets (FIDELIO's custodial wallets). Generates, encrypts, and stores keypairs. Never exposes raw private keys to the backend. HSM-grade thinking required.

---

## Build Sequence (future)

| Phase | What | Status |
|---|---|---|
| W-A | Architecture and research | ⬜ Not started |
| W-B | Base node setup and sync | ⬜ Not started |
| W-C | KeyVault service (H-Wallet generation for FIDELIO) | ⬜ Not started |
| W-D | HNWallet app MVP | ⬜ Not started |
| W-E | FIDELIO integration — accept HNWallet as external wallet | ⬜ Not started |

---

## Key Decisions (to be made)

- **App platform:** React Native (iOS + Android) vs PWA vs both
- **Key storage on device:** Secure Enclave (iOS) / Keystore (Android) vs encrypted local store
- **Node hardware:** Dedicated server in Honduras vs cloud VPS in LatAm region
- **KeyVault security model:** Software encryption vs HSM hardware

---

*Started: 2026-04-11*
*Status: Vision phase — FIDELIO must reach production first.*
