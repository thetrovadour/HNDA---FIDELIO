# FIDELIO — Planned Upgrades

This file tracks deferred improvements that are intentional, reasoned decisions — not shortcuts. Each entry includes the rationale and the messaging angle when applicable.

---

## #12 — On-Chain Merchant Gate for Redemption

**What it is:**
Add a merchant registry to `CATRToken.sol`. The `burn()` function checks that the address being burned from is a registered merchant. If not, the transaction reverts on-chain.

**Current state:**
The "only merchants redeem CATR → HNL" rule is enforced off-chain by the backend and bridge. The contract itself does not verify merchant status — it trusts the bridge wallet (BURNER_ROLE).

**Why we deferred it:**
Etapa 1 is a pilot. The protection from a secure backend + secure bridge wallet is sufficient at this scale. The gas cost on Base L2 is negligible (~$0.001 per merchant registration, ~$0.00004 per redemption). The deferral is a scope decision, not a security compromise.

**Why it matters for production:**
If the bridge wallet were ever compromised, a client's CATR could be burned without consent. An on-chain merchant gate makes the invariant unbreakable at the blockchain level — independent of backend or wallet security.

**Gas cost estimate (Base L2):**
- Register merchant: ~50,000 gas ≈ $0.001
- Extra burn check (SLOAD): ~2,000 gas ≈ $0.00004 per redemption
- 100 merchants total registration: ~$0.10

**Implementation:**
- Add `mapping(address => bool) public registeredMerchants` to `CATRToken.sol`
- Add `registerMerchant(address)` / `deregisterMerchant(address)` functions gated by `DEFAULT_ADMIN_ROLE`
- Modify `burn()` to `require(registeredMerchants[from], "Not a registered merchant")`
- Wire merchant registration/deregistration into the backend merchant creation/deactivation flow

**Messaging (Cristian's words):**
> "Hemos decidido hacernos más seguros, transparentes y sólidos. Tus transferencias están respaldadas en la cadena de bloques haciendo más seguro tu trabajo. HNDA."

**Priority:** Pre-production (before real HNL enters the system).

---

## #13 — H-Wallet Signature Authentication

**What it is:**
Replace name + PIN login with cryptographic wallet signature authentication. Instead of typing a PIN, the user signs a challenge message with their H-Wallet private key. The backend verifies the signature against the user's registered wallet address and issues a JWT.

**Current state:**
Login uses `full_name + PIN → JWT`. The JWT is stored in localStorage and attached to every API call. This works for the pilot but is a traditional credential system — not sovereign.

**Why we deferred it:**
H-Wallet key generation infrastructure does not exist yet. FIDELIO reaches production first, H-Wallet is built second. The PIN system is a placeholder at the same auth boundary — the swap is one module on the auth route, nothing else changes.

**How it works when built:**
```
User opens app
→ H-Wallet signs a challenge: "Login to FIDELIO at timestamp 1234"
→ backend verifies: signature matches registered wallet address
→ JWT issued, session starts
→ no password, no PIN — cryptographic identity
```

**Why it matters:**
The blockchain already knows who owns each wallet address. This makes FIDELIO auth sovereign — identity is proven by cryptography, not by a string stored in a database. If the database is compromised, credentials cannot be stolen because there are no credentials — only keys.

**Implementation:**
- Backend: add `POST /api/auth/wallet-login` — accepts `{ wallet_address, signature, timestamp }`, verifies with `ethers.verifyMessage()`, issues JWT
- Frontend: H-Wallet generates the challenge, signs it, sends to backend
- Migration: existing PIN users get a one-time prompt to link their wallet address

**Priority:** After H-Wallet keyvault is built (post-production).
