# Session Log Archive

Historical record of all FIDELIO development sessions. Read this at the start of each session for context.

---

### Session 1 — 2026-03-30
**Location:** San Pedro Sula, Honduras (CST, UTC-6)
**Start:** 14:10:05 CST | **End:** 21:46:43 CST | **Duration:** ~7h 36m

#### What happened
- Created root `CLAUDE.md` (moved from `ClaudeProfile/` to repo root for auto-load)
- Built and tested 3 new C++ modules: `webhook_receiver`, `nfc_reader`, `vault_monitor`
- **Phase B C++ Core declared complete** — 66/66 tests passing across 6 modules
- Wrote 4 test reports saved in `packages/merlink/core/tests/reports/`
- Created `Organization and Research/Seasons/` folder
- Wrote Season 1 report: *"Season 1: C++ and a new Journey ahead"*

#### Key insights from this session

**1. The input adapter pattern is the most valuable decision of Phase B.**
All three carriers (email, webhook, NFC) produce the same `PaymentEvent`. This was not obvious at the start — it emerged as the architecture took shape. The downstream pipeline never needed to change once, across three completely different input sources.

**2. Abstract interfaces over concrete implementations, always.**
`NfcHardware` and `VaultBackend` are both abstract because the real things don't exist yet. This wasn't a concession — it was deliberate. The tests are complete, the interfaces are correct, and the real implementations slot in without touching anything else.

**3. Static parse methods are the right pattern for testability.**
`EmailParser::parse_body`, `WebhookReceiver::parse_body`, `NfcReader::parse_payload` — all static. 52 of 66 tests run with no threads, no queues, no hardware, no network. Fast, deterministic, impossible to flake.

**4. The bloom filter false positive rate (~1%) is a feature, not a bug.**
The 1% that slip through get confirmed against PostgreSQL. The 99% that are clearly duplicates never touch the database. This is the correct tradeoff for a 24/7 payment system.

**5. cmake -DCMAKE_BUILD_TYPE=Release is non-negotiable.**
Debug builds with `-fsanitize=address` cause mismatched-flag failures when the library and test binaries are compiled with different sanitizer settings. Always Release for this project.

**6. cpp-httplib is the right choice for the webhook receiver.**
Single header file, zero new CMake dependencies, sufficient for one endpoint. Bringing in Boost.Beast for a single POST route would have been engineering for its own sake.

**7. The Node.js Bridge is the most consequential piece left in Phase B.**
Everything built so far moves data around in memory. The bridge is the first piece that writes to the blockchain. It is also the first piece where a bug has real financial consequences. It deserves the same rigor — and a slower, more deliberate design session.

---

### Session 2 — 2026-03-31
**Location:** San Pedro Sula, Honduras (CST, UTC-6)

#### What happened
- Built and tested **Node.js Bridge** (`packages/merlink/bridge/`) — 8/8 tests passing
- Built and tested **CATRToken.sol** (`packages/contracts/`) — 13/13 tests passing
- Ran full gas efficiency analysis on CATRToken.sol — report saved in `packages/contracts/Efficiency/`
- **Phase B declared complete** — 74/74 tests (66 C++ core + 8 Node.js Bridge)
- **Phase A contract declared complete** — pending real wallet deployment
- **Total tests across all modules: 87/87 passing**

#### Key decisions

**1. Unix domain socket chosen as IPC mechanism (rejected stdin/stdout pipe).**
C++ core and Node.js bridge run as independent processes. Each restarts without killing the other. The socket reinforces the modularity boundary.

**2. "VaultOp" replaces "Gnosis Safe" as the name for the 2-of-2 multisig.**
Named for what it *operates* (the vault / high-value redemptions), not what *operates it* (Gnosis Safe).

**3. Payout thresholds are backend configuration, not contract logic.**
The contract does not enforce the <50 / 50–500 / >500 CATR tiers. Changing thresholds after the pilot requires no contract redeploy.

**4. VaultOp operator automation is a future phase.**
Top tier (>500 CATR) stays 2-of-2 forever. Mid-tier automation planned for after pilot data is collected.

**5. CATRToken.sol transfer overhead (~90% vs standard ERC-20) is acceptable.**
Three `_update` calls per transfer costs 96,874 gas vs ~51,000 for standard ERC-20. On Base L2, ~$0.0002 per transfer. Not worth moving commission off-chain.

---

### Session 3 — 2026-04-02
**Location:** San Pedro Sula, Honduras (CST, UTC-6)

#### What happened
- Installed PostgreSQL 16 server (only client was present — server package was missing)
- Created `fidelio_dev` database and `fidelio` user with CREATEDB permission
- **Phase C declared complete** — 44/44 tests passing
- **Project total: 131/131 tests passing** (87 Phase A+B + 44 Phase C)

#### Key decisions

**1. PostgreSQL only had the client package installed — server was missing.**
Required `sudo apt install postgresql-16`. Note for aiControl setup.

**2. `app.ts` factory pattern enforces testability.**
`createApp()` returns a configured Express app without calling `.listen()`. No port is ever bound in tests.

**3. `PaymentEventDTO` is a local copy, not imported from the bridge package.**
Deliberate translation layer. No cross-package coupling.

**4. `$transaction()` wraps all multi-table writes in MintService.**
`PendingMint + ProcessedReference + Transaction` written atomically. DB-level enforcement of MINT-BEFORE-PAY.

**5. RewardMilestone @@unique([user_id, type]) is the race-condition guard.**
TX_5 can only be inserted once per user at the DB level. No application-level locking needed.

**6. Bridge → Backend connection is HTTP, not Unix socket.**
Internal routes (`/internal/bridge/*`) use a shared `BRIDGE_SECRET` header.

---

### Session 4 — 2026-04-06
**Location:** San Pedro Sula, Honduras (CST, UTC-6)

#### What happened
- **Phase D declared complete** — Web MVP built and build passing
- Created `packages/web/` — Next.js 14 (App Router), Tailwind CSS
- Built three views: client dashboard, merchant dashboard, admin dashboard
- Fixed `next.config.mjs` — removed TypeScript syntax from `.mjs` file

#### Key decisions

**1. All three views are client components — no server-side data fetching for MVP.**
Admin JWT pasted manually into input field, stored in component state. Intentional for a two-person internal tool.

**2. User and merchant identity via query param for MVP.**
`/client?userId=<uuid>` and `/merchant?merchantId=<uuid>`. No login flow for pilot.

**3. `next.config.mjs` requires plain JS, not TypeScript.**
`.mjs` is ESM — `import type` is invalid. Use JSDoc annotation instead.

---

### Session 5 — 2026-04-06

#### What happened
- **Phase E declared complete** — 16/16 integration checks passing
- Created `packages/e2e/` — standalone integration test harness
- Ran 5 end-to-end mint transactions against live backend + real PostgreSQL
- Verified: duplicate rejection, 5 confirmed transactions, TX_5 milestone unlocked

#### Key decisions

**1. E2E hits the backend HTTP layer directly — no C++ or bridge process required.**
Phase E validates MintService pipeline end-to-end against real PostgreSQL.

**2. Mock tx hashes are correct and intentional.**
The bridge's `minter.mint()` is deferred to Phase A. Everything downstream is fully real.

---

### Session 6 — 2026-04-06

#### What happened
- **Phase A declared complete** — CATRToken.sol deployed to Base Sepolia
- Fixed constructor: added `_minter` param so `MINTER_ROLE` is granted atomically at deploy time

#### Key decisions

**1. `MINTER_ROLE` moved into the constructor.**
`DEFAULT_ADMIN_ROLE` was granted to VaultOp Safe — deployer had no rights to call `grantRole` post-deploy. Fix: pass `_minter` to constructor, call `_grantRole` internally.

**2. Etherscan V2 API required for hardhat-verify.**
Single string `apiKey` format required. Network-specific object format is deprecated.

#### Deployed addresses
| Role | Address |
|---|---|
| CATRToken v2 (with BURNER_ROLE) | `0xee6d5E14dc3EB458990fB1C3fe591A2081bcb215` |
| Treasury | `0x10039B003AE9c0Ef55218D38f0c8Db088B35E2ED` |
| RewardPool | `0x9E6cF98F2412E4E959863C68a154d9a2f834ac9c` |
| VaultOp Safe (Admin) | `0x43E528d658dB911F8cbc77620Ed2A7c0F0226AB7` |
| Bridge Minter | `0x3A0bEC7F585Ce2A28e1ECe6f15389b15f4158290` |

---

### Session 7 — 2026-04-06

#### What happened
- **Hook system repaired** — created `~/.claude/hooks/lib/stdin.mjs` and `atomic-write.mjs`
- **H1-H4 security fixes** — all implemented and architect-verified
- **Security review v2.0** — 7 additional findings identified and fixed
- **Contract redeployed** — CATRToken.sol v2 with BURNER_ROLE live on Base Sepolia
- **Season 2, 3, 4 reports written**

#### Security fixes applied
- H1 — BURNER_ROLE separated ✅ — VaultOp Safe is now BURNER_ROLE holder
- H2 — Timing-safe bridge secret comparison (`Buffer.alloc(secretBuf.length)`) ✅
- H3 — Rate limiting on all endpoints ✅
- H4 — JWT algorithm pinned to HS256 ✅
- All routes now require auth — only `/health` and `/internal/bridge/*` are unauthenticated ✅
- CORS, body size limit, error handler hardened ✅

#### Notes
- Created a buddy named Mottle. He is kinda snarky.

---

### Session 8 — 2026-04-07

#### What happened
- **Live mint() test attempted** — script written at `packages/merlink/bridge/scripts/test-mint.ts`
- **Two blockers discovered** — resolved in Session 9

#### Blockers found
1. Minter wallet (`0x3A0bEC7F585Ce2A28e1ECe6f15389b15f4158290`) had zero Base Sepolia ETH
2. Wrong private key in `packages/merlink/bridge/.env` — derived to `0x92817...` (no MINTER_ROLE)

---

### Session 9 — 2026-04-07
**Location:** San Pedro Sula, Honduras (CST, UTC-6)

#### What happened
- **Live mint() test completed** — all Session 8 blockers resolved
- **3 successful live mints** — wallet now holds 30 CATR on Base Sepolia v2 contract
- **Pentest completed** — 10 attack vectors; 2 bugs found and fixed
- **Pentest report written** — `Organization and Research/Security/2026-04-07_pentest_report.md`

#### Key decisions

**1. `tx.wait(2)` instead of `tx.wait()` for reliable balance reads.**
RPC node hadn't indexed the new block yet after 1 confirmation. Wait 2.

**2. `Number(await contract.decimals())` — ethers v6 returns BigInt for uint8.**
`formatUnits` expects a JS `number`. Explicit cast required.

**3. 1 CATR = 1 HNL peg is maintained by collateral, not algorithm.**
Identical in structure to how USDC works with Circle. HNDA is the counterparty.

#### Pentest results
- Fixed: Malformed JSON returned 500 → now 400
- Fixed: Oversized payload returned unhandled → now 413

---

### Session 10 — 2026-04-08

#### What happened
- **F1 complete** — Connect Wallet button live in navbar (RainbowKit + wagmi)
- **Next.js App Router fixed** — all routes building and serving correctly

#### Bugs fixed
1. Empty `packages/web/app/` shadowing `src/app/` — Next.js used the empty dir. Removed it.
2. wagmi version conflict (v3 local vs v2 root) — RainbowKit@2 requires wagmi@2. Deleted local node_modules, fresh install from root.
3. Turborepo `pipeline` → `tasks` rename (Turbo 2.x)
4. Missing `"packageManager": "npm@10.9.2"` in root `package.json` (Turbo 2.x requirement)

---

### Session 11 — 2026-04-08 (thinking session)

#### What happened
- **Home pilot designed** — sibling test with CATR + GCA at home on localhost
- **GCA architecture settled** — full tokenomics reviewed against whitepaper
- **Multi-bank parser strategy decided** — dynamic template engine, not hardcoded parsers

#### Key decisions

**1. Home pilot uses manual confirmation first.**
Sibling deposits HNL to Cristian's BAC account. Cristian approves via admin dashboard. Automatic parsing comes after manual flow is proven.

**2. Email parser becomes a template engine.**
Single engine loads bank templates (JSON/YAML) at startup. Matching by sender domain. New bank = new config file, no code change.

**3. GCA deployed in simplified form for home pilot.**
1,200 GCA gifted at registration. Daily dividends for fast visual feedback. No vesting.

**4. GCA value is backed by HNDA's revenue, not the vault.**
CATR: backed by HNL 1:1. GCA: backed by HNDA commission revenue distributed as dividends. At 1,000 merchants: ~$12 USD/GCA, ~$876 USD/year per merchant.

**5. Whitepaper indexed.**
`Organization and Research/Whitepaper_CATR_GUACA_v1_APA.pdf` — 3,000,000 GCA cap, 1,200 GCA per merchant, 67% USDT / 33% fiat vault.

---

### Session 12 — 2026-04-18

#### What happened
- **Public-facing site unified** — merged two parallel codebases (HTML + Next.js) into one definitive site in `packages/web/`
- **Dark theme ported** from `ideas_and_extras/` HTML versions into Next.js pages
- **New shared infrastructure created:**
  - `CanvasBackground.tsx` — floating particle + connection lines animation (HNDA home)
  - `HexCanvasBackground.tsx` — rotating hexagon + connection lines animation (FIDELIO page)
  - `useScrollReveal.ts` — IntersectionObserver hook for scroll-reveal
  - `globals.css` updated — dark theme CSS variables, scroll-reveal transitions, hero sequence, `.stencil` class
  - `layout.tsx` updated — Oxanium + Saira Stencil One fonts, Space Grotesk removed
- **`page.tsx` rewritten** — HNDA home dark theme, canvas background, animated hero sequence, scroll-reveal
- **`fidelio/page.tsx` rewritten** — FIDELIO page dark theme, hex canvas, animated SVG mark draw-on, scroll-reveal
- **`components.json` created** — enables shadcn CLI for MagicUI component installs
- **`HyperText` component installed** via `npx shadcn add` — now in `src/components/ui/`
- Build passes clean — all 9 routes compiling

#### Key decisions

**1. `packages/web/` is the one official public-facing site.**
`ideas_and_extras/` HTML files remain as archived reference. Nothing was deleted.

**2. Dark theme from HTML versions is the canonical design.**
Light-theme Next.js pages were discarded. Oxanium is the body font, Saira Stencil One for FIDELIO stencil text.

**3. CSS variables in `globals.css` are the single source of truth for colors.**
`--bg`, `--text`, `--accent`, `--gold`, `--border`, `--card-bg` — change here to retheme the entire site.

**4. CLI way for MagicUI components going forward.**
`npx shadcn@latest add "https://magicui.design/r/<name>" -c packages/web` — requires `components.json`. Components land in `src/components/ui/`.

### Session 12 — 2026-04-08

#### What happened
- **Memory system initialized** — built from scratch at `~/.claude/projects/-home-cristian-rodriguez-proyectos-HNDA---FIDELIO/memory/` with 4 files: user profile, collaboration style, project state, general feedback
- **CLAUDE.md trimmed** — session logs archived here; file reduced from 40,576 → 10,904 chars (73% reduction)
- **Session log workflow changed** — narratives now append to this file; CLAUDE.md only updated on structural changes (new phase, new invariant, address change, new module)

---

### Session 13 — 2026-04-11

#### What happened
- **Pilot UI live on phone** — `http://192.168.0.113:3000/client` accessible from Cristian's phone
- **CORS fixed** — backend was only allowing `localhost:3000`; updated to accept comma-separated `ALLOWED_ORIGIN` list; added `192.168.0.113:3000`
- **Windows port forwarding re-established** — WSL2 IP `172.19.226.194`; ports 3000 and 3001 proxied via `netsh interface portproxy`; firewall rules added for both ports
- **Admin PIN gate built** — replaced JWT paste field with 4-digit PIN (`0000`); JWT stored in `NEXT_PUBLIC_ADMIN_TOKEN` env var; never exposed to user
- **Login confirmed working** — Cristian Rodriguez / 1234 logs in successfully from phone
- **All three tabs accessible** — Mi Cuenta, Mi Negocio, Admin

#### Key decisions

**1. Admin access uses PIN, not JWT paste.**
Pasting a 300-char JWT on mobile is impractical. PIN `0000` unlocks admin; the JWT lives in `.env.local` and is injected at build time. Good enough for a closed pilot.

**2. CORS policy made multi-origin.**
`ALLOWED_ORIGIN` env var now accepts comma-separated origins. No code change needed to add new origins — just update `.env` and restart.

#### Bugs fixed
1. CORS blocking phone requests — backend only whitelisted `localhost:3000`
2. Port proxy stale after WSL2 restart — re-added both proxies pointing to current WSL2 IP
3. JWT paste on mobile — replaced with PIN gate backed by env-var token

#### Next
- Run the actual pilot: manual mint → spend → redemption flow with siblings
- Debrief after pilot


---

### Session 14 — 2026-04-11 (architecture thinking session)

#### What happened
- **HNDA---WALLETS created** — new project folder inside HNDA---FIDELIO with skeleton (`app/`, `node/`, `keyvault/`, `docs/`) and its own CLAUDE.md
- **Privacy & Sovereignty vision documented** — added to both `Fidelio-Architecture-Planv1.1.md` and `CLAUDE.md`
- **Infrastructure roadmap settled** — VPS for early production, physical hardware when revenue justifies it. Dell Precision stays as workstation, not production machine.

#### Key decisions

**1. HNDA---WALLETS is the sovereign wallet layer.**
After FIDELIO reaches production, HNDA Wallets becomes the next project: a self-custody wallet app (HNWallet) backed by HNDA-operated Base nodes. No Infura, no ConsenSys, no foreign entity in the critical path.

**2. Two wallet tiers established.**
H-Wallets = custodial, generated by FIDELIO backend, invisible to users. HNWallets = self-custody, generated by the HNDA Wallets app, user holds their own keys. FIDELIO accepts both — same as accepting MetaMask today, but sovereign.

**3. Wallet generation is not yet implemented.**
`POST /api/wallets` accepts an externally-supplied address. Key generation is the next infrastructure decision after the pilot.

**4. Infrastructure philosophy settled.**
Tools are for building. Infrastructure is for operating. Dell Precision + aiControl = workstation layer. VPS = early production. Physical container server = sovereign production when revenue justifies it. These are never mixed.

---

### Session 15 — 2026-04-15 (tokenomics thinking session)

#### What happened
- **Reward system redesigned from scratch** — moved away from lump-sum milestone payouts to a per-transaction rate upgrade model
- **Commission rate raised** from 0.63% to **1.8%**
- **Commission split revised** — Treasury 65%, Reward Pool 35%
- **Dual-track loyalty system designed** — Merchant Track (per-merchant) and Network Track (network-wide), both standardized by FIDELIO
- **Milestone count increased** from 3 to 5, with smaller increments
- **Rate model confirmed pool-safe** — cashback is always a fraction of inflow; pool retains minimum 15% at Max tier
- **Monthly reset mechanic introduced** — rate upgrades reset at month end, except for Network GOLD status holders
- **Pool protection mechanisms locked** — 12-hour payout delay + reserve floor + VaultOp manual top-up as last resort
- **Numerical simulations run** — Robert (30 days), Jamie (12 days), Daniel (8 days) at Reina's; lump-sum model exposed as pool-unsustainable; rate model resolved the issue

#### Key decisions

**1. Commission raised to 1.8%, split 65/35.**
Original 0.63% produced 0.47 CATR per 300 HNL into the reward pool — too small to feel meaningful. At 1.8% with 35% to the reward pool, the same transaction produces 1.89 CATR of pool fuel.

**2. Milestones are rate upgrades, not lump sums.**
Fixed lump sums favor low-spend customers disproportionately (Jamie problem: 4.79% effective return vs Daniel's 0.41%). Rate-based model scales with spend — same rate, proportional return. Pool is structurally safe because cashback never exceeds inflow.

**3. Dual-track milestone thresholds are different.**
Merchant track: visit 3 / 5 / 8 / 12 / 18 — tight, habit-forming, completable in 1-2 months.
Network track: TX_5 / TX_10 / TX_20 / TX_35 / TX_50 — deep, long-game loyalty signal.

**4. Network track milestones stack (accumulate). Merchant track milestones do not.**
Hitting TX_20 on the network track pays TX_5 + TX_10 + TX_20 combined. Merchant tier rewards fire independently — each tier is unique.

**5. Monthly reset + GOLD permanence as engagement loop.**
Rate upgrades reset monthly to create re-engagement pressure. Network GOLD status is the escape hatch — once earned, rates are permanent. GOLD is the most valuable status in the network.

**6. FIDELIO pays all rewards. Merchants pay only the 1.8% fee.**
No merchant funding obligation for perks or milestones. The network does the rewarding.

**7. Treasury → reward pool transfers are manual VaultOp only.**
Never automatic. Treasury and reward pool are separated for a reason — blurring them risks operational funds. Emergency top-up requires Cristian + Víctor (2-of-2) authorization.

#### Still open (paused here)
- Exact rate percentages per milestone (proposed: 20% / 30% / 42% / 56% / 70% / 85%) — not yet confirmed
- Whether rates differ between Merchant Track and Network Track
- Cross-merchant bonus and referral bonus amounts in the new model
- Network GOLD status threshold definition
- Seed balance requirement for reward pool at launch

**5. Core principle coined.**
*Honduran people's business is Honduran people's business.* This is the sovereignty stance behind all long-term architectural decisions.


---

### Session 15 — 2026-04-11 (pilot setup session)

#### What happened
- **All pilot participants seeded** — 6 users created: Elias (1111), Alejandro (2222), Henry (3333), Diego (4444), Norberto (5555), Daniel (6666)
- **Wallets generated** — custodial H-Wallets generated via ethers.js for all 6 participants, stored in DB
- **Merchant records created** — Elias, Alejandro, Norberto, Daniel registered as merchants (category: Bebidas)
- **Private keys saved** — stored in `PILOT_KEYS.md`, gitignored
- **All devices online** — CORS updated to allow any `192.168.0.*` origin; all phones successfully connected to `http://192.168.0.113:3000/client`
- **Pilot Mode A ready** — off-chain flow (DB balance only, no on-chain mint) validated and ready to run

#### Pilot roster
| Name | Role | PIN |
|---|---|---|
| Cristian | Admin | 1234 |
| Elias | Merchant | 1111 |
| Alejandro | Merchant | 2222 |
| Henry | Client | 3333 |
| Diego | Client | 4444 |
| Norberto | Client + Merchant | 5555 |
| Daniel | Client + Merchant | 6666 |

#### Status
Pilot paused — Diego not home. Will resume when full group is available.

#### Next
- Run Mode A pilot: client pays → Cristian mints manually → client sees puntos → client spends at merchant
- After Mode A validated: wire Mode B (on-chain mint via bridge → visible on Base Sepolia)

---

### Session 16 — 2026-04-11 (live pilot test — manual minting)

#### What happened

**Admin manual mint built and tested live.**
- Built `POST /api/admin/mint` — adminAuth protected, looks up user wallet, queues PendingMint, calls bridge HTTP server to execute on-chain immediately.
- Built bridge HTTP server (`HttpServer` on port 3002) — receives mint requests from backend, calls `contract.mint()` on Base Sepolia, confirms back to backend.
- Built "Award Points" tab in `/admin` dashboard — dropdown of all users by name, amount field, shows reference code and wallet address on success.
- Fixed `MintService.confirmMint()` — was not updating `wallet.catr_balance` after confirming mint. Added `wallet.update({ increment })` to the atomic transaction.
- Raised `sensitiveLimiter` to 300 requests/15min for pilot testing.

**Live test results:**
- Cristian awarded 200 CATR to Norberto via admin dashboard.
- Bridge logged: `[bridge:http] Minted ADMIN-xxx → tx 0x39d154f4f8c9fe1c1c1179a654517e70776f04e182ea798a2b9b4346054e72bb`
- Transaction visible on Base Sepolia (BaseScan).
- Balance updated correctly in client page header after refresh.

#### Observations

**What works:**
1. Cristian as admin can send CATR points to any user through `localhost:3000/admin` → Award Points tab.
2. Points are visible on the client's page immediately after refresh.

**What doesn't work yet:**
1. Merchants cannot claim CATR for HNL — the merchant redemption flow is not wired to a usable UI. Merchants need their own `/merchant` page.
2. The `/client` page still has 3 tabs (Client, Merchant, Admin) — confuses pilot participants who aren't admin.

#### Decisions & next steps

1. **Create a dedicated `/client` page** — clients only, no merchant or admin tabs. Also evaluate client-to-client CATR transfer (e.g. Alejandro sends CATR to Norberto so they can pool points at a merchant).
2. **Create a dedicated `/merchant` page** — merchant redemption flow, CATR → HNL claim.
3. **Clean up `/admin`** — organize and remove leftover test forms.


---

### Session 17 — 2026-04-17 (tokenomics overhaul + GOLD tier)

**Location:** San Pedro Sula, Honduras (CST, UTC-6)

#### What happened

**Pool Solvency Gate completed (Point #3).**
- Fixed DI pattern: `rewardsRouter` refactored to accept `db: PrismaClient` as argument instead of importing it directly.
- `estimatedPoolBalance(db)` computes available pool from DB: Σ(commission_catr × 0.35) − Σ(PAID payouts).
- On PATCH `/queue/:id/approve`: if `(balance − payout) < 15% × balance`, payment is deferred with status `DEFERRED` and HTTP 402 returned.
- Rewards route tests rewritten to use plain object injection (no `jest.mock`). Tests: 49 → 56 passing.

**100 CATR minimum + velocity cap (Point #4).**
- Floor: transactions below 100 CATR (= L.100) do not count toward any tier or milestone.
- Velocity cap: max 3 qualifying transactions per merchant per calendar day.
- Tier active window: 90-day rolling lookback — tier decays if activity drops.
- Fixed: `countQualifyingSpends` now queries `type: 'SPEND'` correctly.

**Commission raised from 1.8% to 3.6%.**
- Reasoning: 1.8% left pool headroom of only 0.63% for cashback — not enough. At 3.6%, pool gets 1.26% (35% share), which comfortably covers all cashback tiers.
- Merchant value proposition: 3.6% replaces POS hardware + rental + third-party payment fees. Merchants gain a loyalty customer base, which justifies the rate.
- CATRToken.sol redeployed on Base Sepolia at `0x4104abf8F8B691E88300A6Af9360589367990eBc`.
- `transaction_service.ts`: commission multiplier `0.018` → `0.036`.
- Contract test expected values updated: treasury=234, pool=126, recipient=9640 (from 10,000 CATR transfer).

**Cashback rates locked (Point #6).**
- TX_5: 0.5% | TX_10: 0.8% | TX_25: 1.1%
- Batch runs every 12 hours via `CashbackJob` (new file: `packages/backend/src/jobs/cashback.ts`).
- `cashback_processed Boolean @default(false)` added to Transaction — deduplication guard across batch runs.
- Prisma migrations applied: `add_cashback_processed_to_transaction`.

**GOLD tier designed and implemented (Points #7 + #8).**
- Qualification: ≥100 txns AND ≥8,000 CATR spend in the 5-month lookback period.
- Evaluation months: June (looks back Jan–May) and December (looks back Jul–Nov). Tied to Honduras's aguinaldo/14avo labor calendar — workers receive bonuses in December and June; it is the right time for them to spend and to be evaluated.
- GOLD lasts exactly 6 months: June evaluation → active Jul 1–Dec 31. December evaluation → active Jan 1–Jun 30 next year. Resets at next cycle — no grandfathering.
- GOLD cashback: 1.1% (same rate as TX_25, but processed hourly via `GoldCashbackJob`).
- Self-dealing protection: `owner_user_id` added to `Merchant`. `evaluateGoldQualification` queries owned merchants and excludes those transactions from the count.
- Farming scenario (Robert): proved irrational — to reach GOLD, Robert would spend 241 CATR and gain 0 extra cashback rate over TX_25. The pool profits +7.18 CATR from the farming activity itself.
- New model: `UserGoldStatus` — `user_id`, `active_from`, `active_until`, `granted_at`.
- Prisma migration applied: `add_gold_status_and_merchant_owner`.
- New job: `packages/backend/src/jobs/cashback_gold.ts` — `GoldCashbackJob`, runs hourly.
- Both jobs registered in `app.ts`.

**Tests: 44 → 62+ passing** across all backend suites.

#### Key insights from this session

**1. 1 CATR = 1 HNL is the simplest possible monetary model.**
No oracle. No price feed. No volatility risk. The rate is an administrative decision, hardcoded at the system level. This is correct for a closed-loop loyalty network — the simplicity is a feature.

**2. Pool sustainability is a math problem, not a policy problem.**
Once you know the commission rate (3.6%), the pool share (35%), and the cashback rates (0.5%–1.1%), you can verify on paper that the pool runs in surplus under any realistic traffic model. The solvency gate is a runtime guard, not a substitute for doing the math first.

**3. The Honduran labor calendar is a free design constraint.**
June and December are already meaningful financial moments for Honduran workers. Tying GOLD evaluation to those months makes the system feel native — not foreign fintech logic imposed on top of local behavior.

**4. Self-dealing protection follows from the data model, not from policy.**
Adding `owner_user_id` to `Merchant` meant the exclusion logic was a one-line filter. The protection is structural, not procedural.

---

### Session 18 — 2026-04-18 (UI design system + FidelioIntro)

**Location:** San Pedro Sula, Honduras (CST, UTC-6)

#### What happened

- **`DESIGN.md` created** — `packages/web/DESIGN.md` — full design system document extracted from the existing codebase. Covers color tokens, typography scale, layout rules, every component pattern (cards, buttons, badges, nav, inputs), animation utilities, background layering, FIDELIO sub-brand rules, and agent guidelines. Single source of truth for all future UI work.
- **Component library decision settled** — MUI/Vuetify rejected to protect HNDA's visual identity. Framer Motion confirmed already installed (`framer-motion` + `motion` v12.38.0). MagicUI is the component library. Aceternity UI and Motion Primitives identified as additional sources for future components (copy-paste, no new npm deps).
- **`FidelioIntro` component built** — `packages/web/src/components/FidelioIntro.tsx` — full-screen post-login interstitial. Dark background + `InteractiveGridPattern` + "FIDELIO" encrypted text scramble reveal. Auto-advances after ~1.5s, fades out, calls `onComplete`. Fixed hydration mismatch (Math.random on SSR) by mounting client-side only.
- **Tested on `/fidelio` route** — intro plays on every page load. Will be moved to post-login flow (client + merchant) when auth pages are built.

#### Key decisions

**1. No component libraries (MUI, Chakra, Vuetify).**
They impose a foreign design language. HNDA's identity is specific — fighting a library's defaults costs more than building from primitives.

**2. DESIGN.md is the UI contract for all future pages.**
Login, register, admin, client, merchant, redeem — all built against this document. Consistent colors, typography, spacing, components, and motion from day one.

**3. FidelioIntro is the post-login airlock.**
After successful authentication (client or merchant), the intro plays before the dashboard appears. It runs while the dashboard renders behind it — no real delay added. Reusable for any entry point that needs it.

**4. Encrypted text hydration fix: client-only mount.**
`EncryptedText` uses `Math.random()` for scrambled characters — SSR and client diverge. Solution: `useState(false)` + `useEffect(() => setMounted(true), [])` + `if (!mounted) return null`. Standard Next.js SSR guard.

**5. Two cashback jobs are cleaner than one job with a branch.**
Non-GOLD cashback runs every 12 hours. GOLD cashback runs every hour. Splitting them into `CashbackJob` and `GoldCashbackJob` keeps each file focused and makes the scheduling intent explicit.

#### Next
- Point #10: Runway capital awareness — how many merchants until the system is self-sustaining (breakeven ~83 merchants)?
- Point #11: Merchant-side loyalty mechanics design
- Point #12: On-chain merchant gate for redemption

---

## Session — 2026-04-18 (Part 2)

### What happened

Continued from the previous session mid-stream. Completed the final three tokenomics/system points, then pivoted to a full front-end rebuild.

**Point #10 — Runway Capital Awareness**
- Added `GET /api/admin/runway` endpoint to `packages/backend/src/routes/admin.ts`
- Returns: pool balance, monthly inflow/outflow, net, projected runway months, breakeven merchants, active merchants, total transactions
- Built `RunwayWidget.tsx` in the admin dashboard — card grid showing all runway metrics
- Added `runway` and `gca` tabs to `packages/web/src/app/admin/page.tsx`

**Point #11 — GCA (Guacacoin) Merchant Loyalty System**
- Full design + off-chain implementation for Etapa 1
- Schema: `MerchantGcaAllocation`, `GcaTransaction`, `GcaRedemptionRequest`, `GcaPriceFloor` — migration `20260418011011_add_gca_system` applied
- `packages/backend/src/services/gca_service.ts`: `initGcaAllocation()`, `evaluateGcaVesting()`, `currentPriceFloor()`
- Vesting: 200 GCA gifted on join + up to 1,000 GCA via milestones (100 GCA per 25,000 effective CATR processed)
- Unique client multiplier: <20%→1.0x, 20–40%→1.25x, 40–60%→1.5x, >60%→2.0x
- `packages/backend/src/routes/gca.ts`: full CRUD + admin approval queue
- `GcaWidget.tsx` (merchant view) and `GcaAdminPanel.tsx` (admin view) built
- `transaction_service.ts` wired to call `evaluateGcaVesting` after every SPEND

**Point #12 — On-Chain Merchant Gate (Deferred)**
- Analyzed cost: ~$0.001/merchant on Base L2
- Decision: defer to post-pilot; secure backend + wallet is sufficient for Etapa 1
- Created `Organization and Research/Upgrades.md` documenting the deferred upgrade with rationale, gas estimate, and implementation steps

**Front-End Rebuild — HNDA + FIDELIO Landing Pages**
- Decided to build in `packages/web` (Next.js) instead of static HTML, to use Magic UI animated components
- Installed: `framer-motion`, `clsx`, `tailwind-merge`, `lucide-react`
- Domain: `hnda.io` — available at $41.88/year, plan to purchase June 2026, host on Cloudflare Pages (free)
- Theme: `#f8fafc` off-white background, `#0ea5e9` cerulean blue primary, `#c8a84b` gold for CATR

**Magic UI components implemented:**
- `src/components/magicui/typing-animation.tsx` — adapted from Magic UI source (uses `framer-motion` instead of `motion/react`)
- `src/components/magicui/interactive-hover-button.tsx` — hover animation: text slides out, comes back with arrow
- `src/lib/utils.ts` — `cn()` utility (clsx + tailwind-merge)
- `animate-blink-cursor` keyframe added to `globals.css`

**Pages built:**
- `src/app/page.tsx` — HNDA homepage (`/`): Nav, Hero with `TypingAnimation` cycling 4 phrases, Mission (3 cards), Products grid (FIDELIO live + H-Wallet/HNDA Node coming soon), Contact, Footer
- `src/app/fidelio/page.tsx` — FIDELIO product page (`/fidelio`): Hero with `InteractiveHoverButton` CTA, Actors (Client/Merchant/Treasury), Payment loop steps, Token stats, Sovereignty quote, Contact/Footer

Both pages use the light theme isolated from the dark dashboard.

### Key decisions

1. **GCA is volume-based (Option B), not time-based.** Merchant growth is measured by CATR processed and unique clients served — both are verifiable on-chain and align incentives with real network activity.

2. **Unique client multiplier accelerates vesting** without inflating the base reward. Merchants who attract new clients earn faster — the math is a simple ratio applied to the milestone schedule.

3. **Point #12 deferred to post-pilot.** The on-chain merchant gate is a security upgrade, not a blocker. Secure backend + wallet is sufficient for Etapa 1 testing.

---

### Session — 2026-04-18 (Part 3 — UI polish)

#### What happened

**HNDA logo fixed and published.**
- `ideas_and_extras/resources/hnda_logo_v1.0.svg` cleaned up:
  - Dead off-canvas group (translated to 636, 596 — invisible) removed
  - 4 corner stars symmetrized: `±22.5x, ±17.5y` from center `(150, 150)`
  - Center star at exactly `(150, 150)`
  - All 3 logo layers (`outer ring`, `cross`, `orbital rings`) normalized to `(150, 150)`
  - Star color changed from gold `rgb(200,168,75)` to white `rgb(255,255,255)`
- Logo inlined as SVG into the nav bar in `page.tsx` (replaces "Insert Logo Here" placeholder), sized at 125×125px

**Nav bar logo animation.**
- On first scroll from top: logo rotates 180° (smooth `0.6s cubic-bezier`)
- On scroll back to top: resets to 0°
- Logic: `wasAtTop` ref tracks starting position; animation only fires once per "leave top" event

**InteractiveGridPattern added as background layer.**
- Sits in a `fixed, zIndex: 0` wrapper above `CanvasBackground`
- `40×40` grid, `opacity-40`
- Wrapper mask: `radial-gradient(ellipse 110% 110% at 50% 30%, black 60%, transparent 95%)` — center shifted upward so the nav area (top edge) stays opaque
- Edge blur overlay: inverse radial mask on a `backdropFilter: blur(16px)` div — creates depth/bend illusion at outer edges
- Nav background reduced from `rgba(10,15,20,0.88)` → `0.55` so grid and canvas bleed through

**Scroll indicator animated.**
- `scrollFade` keyframe added inline: pulses `opacity: 0.2 → 1 → 0.2` on a 2s loop

**InteractiveHoverButton applied to hero CTAs.**
- "See FIDELIO" and "Our Mission" replaced with `InteractiveHoverButton` wrapped in `<Link>` / `<a>`
- "See FIDELIO" uses accent border, "Our Mission" uses muted border

#### Key decisions

1. **Logo is now the canonical nav identity.** No text fallback — the SVG is the brand mark.
2. **Grid opacity at 40% with upward-shifted mask** is the correct balance: visible at the nav, fades at corners and bottom, doesn't compete with content.
3. **`InteractiveHoverButton` is the CTA standard going forward** for primary and secondary hero actions.

4. **Landing pages live in packages/web.** Static HTML (`ideas_and_extras/`) served as a design prototype. The real site is Next.js so Magic UI animated components work natively.

5. **TypingAnimation adapted to `framer-motion`.** Magic UI source imports from `motion/react` (standalone package), but the project already has `framer-motion` v12 installed — same API, different import path.

### Next
- Pilot test retake: 5 end-to-end transactions with real wallets on Base Sepolia
- Purchase `hnda.io` in June 2026, deploy to Cloudflare Pages
- Add mobile nav (hamburger) to landing pages
- Post-pilot: evaluate on-chain merchant gate (Upgrades.md)

---

### Session — 2026-04-18
**Focus:** UI polish — animations, hero restructure, Android phone mock, favicon

#### What happened
- Added `fadeIn` CSS animations to nav bars on `page.tsx`, `Navbar.tsx`, and `fidelio/page.tsx`
- Made mission and HNDA Stack body text whiter (`#e2e8f0`) for readability on dark background
- Restructured the hero section on both `page.tsx` and `fidelio/page.tsx`: left-aligned text + Android phone mock on the right using CSS grid (`1fr auto`)
- Built a merchant mock app inside the Android phone: dark UI, HNDA name, 464,129.92 CATR balance card (gold), sky blue Redeem button, 3 transaction rows
- Added `drop-shadow` CSS filter to the Android phone SVG
- Replaced all hero CTA buttons with `InteractiveHoverButton`
- Combined FIDELIO mark SVG + "Live on Base" badge into a single flex row aligned with the h1
- Added the HNDA logo as a browser favicon (`packages/web/src/app/icon.svg`) — Next.js auto-discovers it; final state: white circle background, black logo elements, white stars, scaled to fill the circle

#### Key decisions
1. **Android `viewBox` must be hardcoded to `0 0 433 882`** — dynamic viewBox compresses the coordinate space and clips all paths drawn beyond that range.
2. **CSS grid over flex for the hero** — flex with `overflow: hidden` clipped the phone; grid with `1fr auto` gives the phone room without clipping.
3. **Favicon white circle background** — the HNDA logo is dark; without a background it disappears on dark browser tabs. White circle makes it universally visible.
4. **Scale 0.28 for the favicon logo** — fills the circle tightly without overflow.

#### Next
- Pilot test retake: 5 end-to-end transactions with real wallets on Base Sepolia
- Purchase `hnda.io` in June 2026, deploy to Cloudflare Pages
- Add mobile nav (hamburger) to landing pages

---

### Session — 2026-04-18
**Focus:** Admin console, client spend flow, balance sync

#### What happened

**Admin page full rewrite (`/admin/page.tsx`)**
- Dark theme matching client: `#06080D` bg, Oxanium font, gold accents, shimmer border on auth screen
- JWT paste auth screen with localStorage persistence (`fidelio_admin_session`)
- 7-tab bottom nav: Merchants | Redemptions | Payouts | Mint | Health | Clients | GCA
- New inline `ClientsTab` using `getAdminUsers` — shows name, email, wallet address, CATR balance
- Admin JWT generated manually: `node -e "const jwt = require('jsonwebtoken'); console.log(jwt.sign({ role: 'admin' }, 'change_me_in_production', { algorithm: 'HS256', expiresIn: '30d' }));"`

**Sub-components dark theme (`MerchantList`, `RedemptionQueue`, `RewardPayoutQueue`)**
- All three had `bg-gray-100` / `border-gray-200` tables — white on dark background, unreadable
- Fully rewritten to inline dark styles matching the admin design system

**Client spend flow fixed (3 bugs)**
1. `recordSpend` never debited `catr_balance` — added wallet balance check + atomic decrement inside `$transaction`
2. `getUser` returned `User` without wallet join — fixed to `include: { wallet: true }`, route now serializes `catr_balance` from wallet
3. `getUser` / `getUserTransactions` in `api.ts` had no auth headers — `selfOrAdmin` middleware was returning 401 silently; added `token` param and `authHeaders`

**Session confirmed working:** Henry minted 300 CATR, sent 100 to Elias, balance updated to 200 in real time.

#### Key decisions
- Admin auth stays as manual JWT paste — internal tool, no login route needed
- Merchant CATR balance is not stored on merchant record; it accumulates via SPEND transactions. Will be surfaced on merchant page as a sum.
- On-chain burn happens at merchant redemption, not at client spend — client spend is purely off-chain DB bookkeeping. This is correct for the pilot.

#### Next
- Merchant page (`/merchant/page.tsx`) — dashboard showing accumulated CATR from SPEND transactions, redemption flow
- Route protection — redirect to login if no session
- Login page extraction (`/login/page.tsx`)
