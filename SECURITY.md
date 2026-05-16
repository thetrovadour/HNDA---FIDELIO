# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability in FIDELIO, please report it privately to:

**contact@hnda.io**

Do not open a public GitHub issue for security vulnerabilities. We will respond within 72 hours and coordinate a fix before any public disclosure.

---

## Dependency Audit — 2026-05-16

Last audit: `npm audit` + TruffleHog git history scan.

### Production surface — clean

All runtime dependencies (Express backend, Next.js frontend, ethers.js bridge) passed audit with no known vulnerabilities as of this date.

### Accepted dev-tool risks

The following vulnerabilities exist in development-only tooling and have **zero production exposure**. They are consciously accepted until upstream fixes are available.

| Package | Vulnerability | Location | Why accepted |
|---|---|---|---|
| `hardhat` and its dependency tree (`undici`, `cookie`, `elliptic`, `serialize-javascript`, `lodash`, `tmp`) | Various (moderate/high) | `packages/contracts/` | Hardhat only runs locally when compiling or deploying Solidity contracts. It is never installed or executed on production servers. |
| `@hono/node-server` via `@prisma/dev` | Middleware bypass (moderate) | Prisma dev tooling | `@prisma/dev` is a development dependency of Prisma's CLI. It does not run in the production API server. |
| `postcss` | XSS via unescaped `</style>` (moderate) | `next` internals | Blocked on Next.js upstream fix (>16.2.6 not yet released). Will be resolved on the next Next.js release that bundles postcss ≥8.5.10. |

### TruffleHog scan

Full git history scanned with TruffleHog v3.95.3:

```
verified_secrets: 0
unverified_secrets: 0
chunks scanned: 3,652
```

No secrets were ever committed to this repository.

---

## Smart Contract Security

`CATRToken.sol` and `GCAToken.sol` are deployed on **Base Sepolia (testnet)**. Mainnet deployment has not occurred. Contract source is available in `packages/contracts/contracts/`.

Key invariants enforced at the contract level:
- `MINT_BEFORE_PAY` — tokens are minted only after confirmed payment
- `BURN_BEFORE_REDEEM` — tokens are burned on-chain before any fiat payout
- 50,000,000 CATR hard supply cap
- Separate `MINTER_ROLE` and `BURNER_ROLE` — compromised minter cannot burn tokens

---

## Custodial Wallet Encryption

H-Wallets (HNDA-generated client wallets) store private keys encrypted with AES-256-GCM. Each key is encrypted with a unique random IV. The encryption key is held in the server environment (`WALLET_ENCRYPTION_KEY`) and is never persisted in the database.
