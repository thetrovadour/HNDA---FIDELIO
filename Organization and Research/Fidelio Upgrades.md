**Upgrades wiki**


### Basic Upgrades to improve User Experience


1- Auth Security — Password, Passkey (huella dactilar / WebAuthn).
2-(DONE) In-app security reminder for optional JWT feature
3- (DONE) A configuration menu for clients/merchants. Allows editing of user information, contact information, etc.
4-(DONE) Inactivity logout — 5min clients, 15min merchants, "Sesión cerrada por inactividad"
5- (DONE) I Spanish translation — es-HN, simple t('key') helper, no heavy i18n library
6-(DONE) GCA script — CLI tool: status, vest, set-floor, list-redemptions. Goes hand in hand with the fact that GCA balance is already fetched once on mount in GcaTab via getGcaBalance. Once the GCA script is built, we just add it to the 15-second poll the same way we did for balance and transactions — one setInterval call in that same useEffect.
7- (DONE) An inactivity logout for admin. 5 min.
8-(DONE) Search bar in "Red" tab in client/page.tsx
9- When clicking a merchant, pop-up a small box (kinda like an ad when you click a video on youtube). Contains photos, cellphone number, owner's name, physical address and wallet address. Address first 6 characters and last 6 are the shown with three dots dividing them. First 3 and last 3 characters are highlighted in gold to highlight the address.  Add photo/icon/letter option to the small box in the red tab as well. 
10- Merchant application page — a dedicated /apply page where clients can apply to become a merchant. Linked from the client Ajustes tab ("Aplicar para Comercio").
11-(DONE) Registration page — a dedicated /register page with a single form that allows users to register as either a client or a merchant. Linked from a "Join Network" button on the main page.tsx (FIDELIO landing).
12- Dual-role UI — a merchant who is also registered as a client can switch between both views from a single session. Two main tabs at the top: "Cliente" and "Comercio". Each tab loads its respective dashboard. No need to log in twice.
13-(CREATE A FAQ PAGE) Merchant deactivation rules — define conditions that trigger automatic deactivation (e.g. inactivity threshold, failed redemptions, compliance flag). Admin can also manually deactivate with a required reason. Deactivated merchants see a clear status message explaining why and what to do next.
(DONE)- In Moviemientos for CLients and Merchants, add the name of the client or merchant who sent the points, date and time.
14- In GCA for admin tab, show the transactions of GCA, who requested, date and time. Same for minting and same for redemptions. In general, add a date, time and identification for redemption and minting for GCA and CATR, even in GCA vesting.
15-(DONE) Whenever a customer applies as a client, provide him the possibility to become a merchant.
16-(DONE) In the same manner, if the client is approved to become a merchant, allow him to enter the merchant page. Give that customer the button in the client page. That means, when accepted show a "Ingresar como Comercio" in the Client webpage.
17-In the same manner, if a customer applies to be a merchant, give him automatically a client page. Give the customer a "Ingresar como Cliente" button in the merchant webpage and a "Ingresar como Comercio" button in the Client page. This means that, when a customer's first account is a merchant account, he receives two accounts that have the feature to change between each one. But if the customer's fisrt account is a client account, he got to validate until he gets accepted as a merchant.
---

## npm Dependency Upgrades

~50 packages outdated across the monorepo as of 2026-04-27.

### Minor / Patch — Safe to update
- `@tanstack/react-query` 5.96.2 → 5.100.5
- `express-rate-limit` 8.3.2 → 8.4.1
- `autoprefixer` 10.4.27 → 10.5.0
- `@types/node` 20.19.37 → 20.19.39

### Major — Breaking changes, migrate carefully
| Package | Current | Latest | Location |
|---|---|---|---|
| `@prisma/client` | 5.22.0 | 7.8.0 | backend |
| `express` | 4.22.1 | 5.2.1 | backend |
| `hardhat` | 2.28.6 | 3.4.2 | contracts |
| `@nomicfoundation/hardhat-toolbox` | 5.0.0 | 7.0.0 | contracts |
| `@nomicfoundation/hardhat-ethers` | 3.1.3 | 4.0.9 | contracts |
| `@nomicfoundation/hardhat-chai-matchers` | 2.1.2 | 3.0.0 | contracts |
| `@nomicfoundation/hardhat-ignition-ethers` | 0.15.17 | 3.1.4 | contracts |
| `@nomicfoundation/hardhat-verify` | 2.1.3 | 3.0.15 | contracts |
| `@nomicfoundation/hardhat-network-helpers` | 1.1.2 | 3.0.6 | contracts |
| `chai` | 4.5.0 | 6.2.2 | contracts | ⚠️ Must migrate with full Hardhat 3 stack — hardhat-chai-matchers@2.x requires chai@^4 |
| `@types/jest` | 29.5.14 | 30.0.0 | backend, bridge |
| `@types/express` | 4.17.25 | 5.0.6 | backend |
| `@types/react` | 18.3.28 | 19.2.14 | web |
| `@types/react-dom` | 18.3.7 | 19.2.3 | web |
| `@types/supertest` | 6.0.3 | 7.2.0 | backend |
| `dotenv` | 16.6.1 | 17.4.2 | backend, bridge, contracts, e2e |

**Rule:** Do minor/patch upgrades freely. Major upgrades require a dedicated migration session — test suite must pass after each one.

**Note on `@types/node`:** Do NOT upgrade to v25. `@types/node` major version must match the Node.js runtime version. We run Node 20 → stay on `@types/node@20.x`. Upgrade only when the Node runtime is upgraded to match.

**Note on `wagmi`:** Do NOT upgrade to v3 until RainbowKit releases a v3 compatible version. RainbowKit latest (2.2.11) requires `wagmi@^2.9.0`. Upgrading wagmi without RainbowKit support breaks the Connect Wallet button.

---

## Rust — Post-Deployment Module Strategy

Decision made 2026-04-30: MerL1nk C++ core ships as-is. New modules after deployment are written in Rust where applicable. Below are the concrete benefits driving that decision.

### Why Rust for HNDA's next modules

**1. Memory safety enforced at compile time**
Rust's borrow checker makes use-after-free, dangling pointers, and buffer overflows impossible to compile. In C++ these are runtime bugs — discovered in production, often under adversarial conditions. For a financial network handling real Lempiras, compile-time proof of memory correctness is a meaningful guarantee.

**2. Data race elimination**
Rust's ownership model makes data races a compile error, not a 3am crash. MerL1nk's `retry_queue` uses raw `std::mutex` — correct today, but correctness is test-enforced, not language-enforced. New concurrent modules (BAC Credomatic adapter, NFC handler) will have that guarantee built in.

**3. Keyvault — the highest-stakes use case**
`HNDA---WALLETS/keyvault/` will generate and custody private keys for H-Wallets. This is exactly the domain where C++ memory bugs have caused catastrophic security failures historically (Heartbleed class). Rust's `ring` and `ed25519-dalek` crates are audited, widely trusted, and purpose-built for this. Writing a keyvault in C++ today is hard to justify when Rust exists.

**4. WebAssembly (WASM) path**
Rust → WASM via `wasm-pack` is first-class. If any MerL1nk validation logic (bloom filter, reference parsing) ever needs to run client-side in the browser, Rust compiles cleanly to WASM. C++ → WASM via Emscripten works but is painful.

**5. Async networking — `tokio` ecosystem**
BAC Credomatic API integration (Etapa 2) is a persistent HTTP client with retries and timeouts. Rust's `tokio` + `reqwest` stack is modern, ergonomic, and safe. No manual memory management around network buffers — a common source of vulnerabilities in C++ networking code.

**6. Long-term maintainability**
Rust's ownership model forces explicit, auditable data flow. New contributors cannot accidentally introduce memory bugs — the compiler blocks them. As HNDA grows and more engineers touch the codebase, this is a structural advantage.

### Planned Rust modules (post-deployment)

| Module | Why Rust | Priority |
|---|---|---|
| `HNDA---WALLETS/keyvault/` | Cryptographic key generation/custody — zero tolerance for memory bugs | High |
| BAC Credomatic adapter (Etapa 2) | Async HTTP client, untrusted external input, replaces email parser | High |
| NFC input adapter (Etapa 3) | Real-time hardware I/O, concurrent event handling | Medium |
| WASM validation module | Client-side reference code validation without a server round-trip | Low |

### What stays in C++

MerL1nk's existing core (`bloom_filter`, `retry_queue`, `email_parser`, `nfc_reader`, `webhook_receiver`, `vault_monitor`) — 87/87 tests passing, production-ready, no rewrite justified.




### Automation Changes
1- Admin approval for burn is changed to passkey verification so that the merchant controls their own transactions.
2- A unified redemptions page where AI take notes and reviews each and every redemption request and validates with current CATR pool balance and approves while notifying admin every morning
