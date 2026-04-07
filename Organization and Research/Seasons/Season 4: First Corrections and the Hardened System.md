# Season 4: First Corrections and the Hardened System

**Project:** FIDELIO — Digital Loyalty Point System for Honduran Tourism
**Period:** 2026-04-06
**Work covered:** Security hardening · Hook repairs · Contract redeploy (BURNER_ROLE)
**Final state:** All security findings resolved · Contract redeployed with separated roles

---

## The Starting Point

Season 3 ended with a live contract, a passing integration harness, and a security review that found two critical issues already fixed — and four high-severity issues deferred. Season 4's job was to close every open finding before Reina's pilot, then redeploy the contract with the role separation that Season 3 couldn't deliver without restarting from scratch.

There was also a quieter task: the development environment itself needed repair.

---

## What Was Fixed

### Hook System Repair

Before any code work, the Claude Code hook system was broken. Two missing files caused every hook event to fail with `ERR_MODULE_NOT_FOUND`:

- `~/.claude/hooks/lib/stdin.mjs` — shared stdin reader imported by all 7 hooks
- `~/.claude/hooks/lib/atomic-write.mjs` — atomic file write utility imported by `keyword-detector.mjs`

Both files were recreated from the import signatures of the hooks that depended on them. `readStdin()` reads all stdin as JSON (the standard hook input format). `atomicWriteFileSync()` writes to a temp file then renames — preventing partial reads during concurrent hook execution.

The hooks system returned to full operation. `UserPromptSubmit` errors gone.

---

### H1-H4 Security Fixes (Ralph-driven, PRD-verified)

Four high-severity findings from the v1.0 security review were implemented as a Ralph session with explicit acceptance criteria per story:

**H2 — Timing-safe bridge secret comparison**

`auth.ts` now uses `crypto.timingSafeEqual` instead of `!==`. The fix is careful about buffer lengths: `providedBuf` is allocated at `secretBuf.length` before copying the provided value in. Both buffers are always the same byte length when passed to `timingSafeEqual`. This prevents the `buffers must have equal length` throw that would itself leak length information via a different timing channel.

**H4 — JWT algorithm pinned to HS256**

`jwt.verify(token, jwtSecret, { algorithms: ['HS256'] })`. Without this, `jsonwebtoken` accepts whatever algorithm the token header declares — including `alg: none`. An attacker who can forge the header can forge the token. The verifier is now authoritative over algorithm selection.

**H3 — Rate limiting**

Two limiters added to `app.ts`:
- `globalLimiter` — 100 requests / 15 minutes, applied to all routes
- `sensitiveLimiter` — 20 requests / 15 minutes, applied to `/internal/bridge/*`, `/api/redemptions`, and `/api/rewards`

Sensitive routes hit both limiters in sequence — they reach the 20 req/15min cap before the global 100 cap becomes relevant. This is correct behavior, not a defect.

**H1 — BURNER_ROLE separated from MINTER_ROLE**

The original contract granted burn capability to `MINTER_ROLE`. A compromised bridge minter key could both mint (capped at 50M CATR) and burn any address's entire balance — two very different blast radii. The fix:

- `BURNER_ROLE = keccak256("BURNER_ROLE")` defined as a public constant
- `burn()` restricted to `onlyRole(BURNER_ROLE)`
- Constructor accepts `_burner` with a zero-address guard and grants `BURNER_ROLE` atomically
- New test: `"minter cannot burn (BURNER_ROLE required)"` — the regression guard
- `REDEPLOY_REQUIRED.md` written with the full 6-step redeploy procedure

**Result:** 44/44 backend tests · 14/14 contract tests · Architect-verified · APPROVED

---

### Security Review v2.0 and Remaining Fixes

A second full security review was run after H1-H4, targeting what the first review missed.

**False alarm — C1 (minter key in git):**
Git history confirmed no private keys were ever committed. The committed `.env` (from Phase C session) contained only `change_me_in_production` placeholder values. The actual minter key `.env` files were already gitignored before they were created.

**True findings and fixes:**

| Finding | Fix |
|---|---|
| C2v2 — Wallet routes unauthenticated (`POST /api/wallets`, `GET /api/wallets/:address`) | `adminAuth` added to both |
| H — `GET /api/transactions/:id` unauthenticated (IDOR) | `adminAuth` added |
| H — `GET /api/merchants` and `GET /api/merchants/:id` leaking wallet/email data without auth | `adminAuth` added to both |
| H — `/api/rewards` approval route not rate-limited | `sensitiveLimiter` added |
| M — No body size limit | `express.json({ limit: '100kb' })` |
| M — `error_handler.ts` returning raw `err.message` to clients | Generic `'Internal server error'` returned; details logged server-side only |
| L — No CORS middleware | `cors({ origin: process.env.ALLOWED_ORIGIN })` — defaults to `http://localhost:3000` |

**Result:** 44/44 backend tests passing across all fixes.

---

### Contract Redeploy — BURNER_ROLE

The updated `CATRToken.sol` was deployed to Base Sepolia with the VaultOp Safe (`0x43E528d658dB911F8cbc77620Ed2A7c0F0226AB7`) as the burner address.

Rationale: burn operations (merchant redemptions) are high-value, irreversible events. Requiring the same 2-of-2 gate as high-value Lempira redemptions is not bureaucracy — it is the correct threat model. A legitimate burn should require deliberate human authorization.

*(New contract address recorded in CLAUDE.md after deployment confirmation.)*

---

## The Numbers

| Layer | Before Season 4 | After Season 4 |
|---|---|---|
| Security findings open | 4 high + 7 medium/low | 0 open |
| Backend tests | 44/44 | 44/44 |
| Contract tests | 13/13 | 14/14 (+minter-cannot-burn) |
| Auth coverage | Partial | Complete — all routes protected |
| Rate limiting | None | Global + per-route sensitive |
| CORS | None | Configured |
| Error leakage | Raw messages | Generic responses |

---

## Key Decisions Made in Season 4

| Decision | Reason |
|---|---|
| VaultOp Safe as BURNER_ROLE | Burn is irreversible — same 2-of-2 gate as VaultOp redemptions is the right threat model |
| `Buffer.alloc(secretBuf.length)` for timing-safe comparison | Pre-sizing to known length prevents a secondary timing channel from the `timingSafeEqual` length guard |
| `sensitiveLimiter` after `globalLimiter` in middleware chain | Intentional layering — sensitive routes hit the tighter cap first |
| Generic error message in `errorHandler` | Prisma errors expose table names and query structure; clients get no internal details |
| CORS via `ALLOWED_ORIGIN` env var | Origin will differ between dev (`localhost:3000`) and production domain |
| Wallet routes require `adminAuth` | Wallet registration is an admin operation — no caller other than admin needs these routes |

---

## What Season 4 Proved

A system can be built correctly and still not be secure. The architecture was sound from Season 1. The invariants were correct. The tests were green. And yet — timing leaks, algorithm confusion, missing auth, no rate limits.

Security is not a phase. It is a pass you run on every phase, with fresh eyes, after the code is done.

Season 4 also proved that the hook system and tooling matter as much as the application code. A broken development environment is a hidden tax on every session. Two missing files cost friction across every prompt. They were created and the tax was removed.

---

## Season 5 Preview

**The pilot with Reina.**

The system is hardened. The contract is redeployed with correct role separation. The web views are live. The next step is a human using FIDELIO for the first time.

Reina's pilot will generate real transaction data. That data will calibrate the redemption tiers (currently set at 50/500 CATR by intuition). After the pilot:
- Admin and VaultOp thresholds set from median and 95th percentile
- VaultOp Safe module evaluated for mid-tier automation
- NFC tap-to-pay roadmap scoped from merchant feedback

The boulder never stops.

---

*Report written at end of Season 4 — 2026-04-06*
*Claude Code + oh-my-claudecode | FIDELIO v0.4.0*
