# Season 5: The Face of FIDELIO

**Date:** 2026-04-08
**Location:** San Pedro Sula, Honduras (CST, UTC-6)
**Session:** 10

---

## What This Season Was About

Every previous season built something real — a contract, a backend, a bridge, a web skeleton. But none of it was visible to a person who wasn't already inside the code.

Season 5 is the season FIDELIO got a face.

The decision was deliberate. Cristian put it simply: *"First impressions matter. No one, except myself and you, understands the system. If this is not user friendly, it'll instantly create a gap."* Option B — full wallet-connect integration — was chosen over the quick fix. The right call.

---

## What Was Built

### F1 — RainbowKit Wallet Connect UI

Three new files were written and wired into the app:

| File | Purpose |
|---|---|
| `packages/web/src/lib/wagmi.ts` | Centralized wagmi config — Base Sepolia chain, WalletConnect project ID, SSR enabled |
| `packages/web/src/app/providers.tsx` | Client-side provider tree: `WagmiProvider` → `QueryClientProvider` → `RainbowKitProvider` → `Navbar` |
| `packages/web/src/components/Navbar.tsx` | Indigo header with FIDELIO branding, nav links, and `ConnectButton` |

The result: every page in the app now has a consistent header and a working Connect Wallet button. Any user with MetaMask, Coinbase Wallet, or a WalletConnect-compatible mobile wallet can connect in one click.

---

## The Bugs

Season 5 was not a clean sprint. Three separate infrastructure problems blocked the work before a single feature landed — all pre-existing, all hidden until the build was actually exercised.

### Bug 1 — The Ghost Directory

**Symptom:** `npm run build` produced only one route: `/404`. The entire `src/app/` directory was invisible to Next.js.

**Root cause:** An empty directory `packages/web/app/` existed at the package root. Next.js uses the first `app/` it finds. It found the empty one, registered zero routes, and stopped looking. `src/app/` with all six pages was never reached.

**Fix:** `rmdir packages/web/app` — one command, one line, the entire app came back.

**Lesson:** Next.js directory precedence is silent. An empty folder can erase your entire application without a single error message.

---

### Bug 2 — The Two Wagmis

**Symptom:** After the ghost directory was removed, the build reached static generation and crashed with `WagmiProviderNotFoundError: useConfig must be used within WagmiProvider`.

**Root cause:** Two versions of wagmi were installed simultaneously:
- Root `node_modules/wagmi@2.19.5` — what RainbowKit@2 was built against
- `packages/web/node_modules/wagmi@3.6.1` — what a previous install left locally

Two versions = two separate React context registries. The `WagmiProvider` registered its context in one registry. `ConnectButton` looked for it in the other. They never found each other.

**Fix:** Deleted `package-lock.json`, removed `packages/web/node_modules`, ran a fresh `npm install` from root. wagmi@2.19.5 resolved from root, no local shadow.

**Lesson:** In a monorepo, never run `npm install` from a workspace subdirectory. Always install from root. Local `node_modules` in a workspace package creates version conflicts that are nearly invisible until runtime.

---

### Bug 3 — Turborepo 2.x Breaking Changes

**Symptom:** `npm run dev` from root failed immediately with two errors:
1. `Missing packageManager field in package.json`
2. `Found pipeline field instead of tasks`

**Root cause:** `turbo.json` was written for Turbo 1.x. Turbo 2.x renamed `pipeline` to `tasks` and added a requirement for `packageManager` in the root `package.json`.

**Fix:** Two one-line edits — `"pipeline"` → `"tasks"` in `turbo.json`, and `"packageManager": "npm@10.9.2"` added to root `package.json`.

**Lesson:** Turborepo 2.0 was a breaking change release. Both fixes were flagged explicitly in the error output — the tool told us exactly what to do. Read the error before searching for it.

---

## WalletConnect Project ID

A real Reown (WalletConnect) project was registered for FIDELIO. The Project ID is stored in `packages/web/.env.local` as `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID`. This activates:

- WalletConnect modal for mobile wallets (Trust Wallet, Rainbow, etc.)
- Proper remote config from Reown's infrastructure
- No more 403 errors in the dev console

`.env.local` is gitignored. The project ID is not sensitive, but it's associated with the FIDELIO project on Reown's dashboard.

---

## What's Running

```
npm run dev   # from repo root
```

| Service | Port | Status |
|---|---|---|
| Next.js (web) | 3000 | ✅ Running |
| Express (backend) | 3001 | ✅ Running |
| MerL1nk Bridge | `/tmp/merlink.sock` | ✅ Running |

All six routes respond 200:

```
/ → 307 → /client
/client     200
/merchant   200
/admin      200
/ping       200
/test       200
```

---

## Note on WSL2 Filesystem Performance

Next.js detected slow filesystem during dev (`benchmark: 333ms`). This is a known WSL2 behavior when the project lives on a Windows-mounted path. The project is already on the native Linux path (`~/proyectos/`), which is the fast path. The warning is a Turbopack internal benchmark and does not affect correctness. A potential optimization is symlink or relocate `.next/dev` to a tmpfs location — deferred to a future session.

---

## What's Next

| Item | Priority |
|---|---|
| F2 — Network guard (lock to Base Sepolia, warn on wrong network) | Next |
| Filesystem optimization (WSL2 `.next/dev` path) | When relevant |
| M2 — IDOR fix on `/api/users/:id` | Before mainnet |
| Pilot preparation — Reina onboarding | Upcoming |

---

## Open Questions — Closing Season 5

These questions were raised during the Season 5 thinking session and are answered at the opening of Season 6.

1. **Home pilot architecture** — How do siblings interact with FIDELIO at home? What's the deposit flow, the role split, the input method?
2. **Multi-bank email parser** — Instead of hardcoded Atlántida and BAC parsers, can we build a dynamic template engine where each bank is a config file?
3. **GCA deployment** — Should GCA be deployed now in simplified form for visualization, ahead of Etapa 2?
4. **GCA thermodynamics** — GCA can only grow. Where is the loss? What is GCA actually backed by?
5. **GCA tradeability** — Would making GCA tradeable solve the value floor problem? (Answer: no — regulatory risk. GCA stays internal.)
6. **GCA value backing** — Is GCA's value a function of the 3.6% commission, or something more fundamental?
7. **Decay vs. dilution vs. dividends** — Which mechanism honestly answers the entropy question for GCA?
