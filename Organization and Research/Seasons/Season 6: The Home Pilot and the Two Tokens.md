# Season 6: The Home Pilot and the Two Tokens

**Date:** 2026-04-08
**Location:** San Pedro Sula, Honduras (CST, UTC-6)
**Session:** 11 (thinking session — no code written)

---

## What This Season Is About

Season 5 closed with seven open questions. This season opens with their answers.

The core theme: FIDELIO is ready to be tested by real people who are not engineers. The home pilot with siblings is the bridge between a working system and a system that works *for someone*.

---

## Answers to Season 5 Open Questions

### 1. Home Pilot Architecture

Siblings deposit HNL into Cristian's BAC account. Cristian manually confirms each deposit via the admin dashboard. The system mints CATR to the client-sibling's wallet. Some siblings are clients, some are merchants. All interact through a visual, non-technical UI on localhost.

**Key decision:** Manual confirmation first. Automatic parsing after the manual flow is proven.

Auth: username + password, with fingerprint (WebAuthn) as the upgrade path.

---

### 2. Multi-Bank Email Parser — Template Engine

Instead of hardcoding a parser per bank, the email parser reads a template library at startup. Each template is a config file (JSON or YAML) with:

- `bank_name`
- `sender_domain` — used to match which template to apply
- `amount_marker` — the string prefix before the amount
- `reference_marker` — the string prefix before the reference code
- `date_format`

The C++ parser core stays unchanged. Adding a new bank = adding one config file. No recompile.

**Home pilot test:** One sibling sends via BAC, another via Atlántida. Same `PaymentEvent` comes out. Same downstream pipeline. That's the proof of concept.

**Long-term:** This is the architecture that scales to any country with email-based bank notifications. Honduras today, Central America tomorrow — same engine, different templates.

---

### 3. GCA Deployment — Simplified for Home Pilot

Deploy a simplified `GCAToken.sol` now — not for Etapa 2 business logic, but for visualization. Showing a merchant "you've earned 3 GCA today" is more convincing than any explanation.

**Simplified vs. production GCA:**

| Parameter | Home Pilot | Production |
|---|---|---|
| Initial gift | 1,200 GCA per merchant-sibling | 1,200 GCA per merchant |
| Vesting | None | 10-year schedule (Year 4, 6, 8, 10) |
| Dividend frequency | Daily | Monthly |
| Dividend source | Simulated from commission cut | Real 0.63% revenue |
| Exit | Return GCA to Cristian | Legal agreement + return |

Both contracts (CATR + GCA) will be redeployed when the home pilot is complete.

---

### 4. GCA Thermodynamics — Where Is the Loss?

GCA doesn't need a forced decay mechanism. The whitepaper already has the entropy built in:

- GCA is **locked during vesting** — illiquid for years
- Merchants who **exit the network must return GCA to HNDA** — that's the burn
- **Dividends are paid from HNDA's 0.63% commission revenue** — if the network shrinks, dividends shrink. Natural pressure.
- **Supply is capped at 3,000,000 GCA** — no inflation beyond the cap

The "meter a la guaca" analogy is exact. You save it, it grows with the network, and you get paid out over time.

---

### 5. GCA Tradeability — Ruled Out

Making GCA tradeable on secondary markets would make it a security under Honduran and international financial regulation — a claim on HNDA's future earnings, equivalent to issuing stock without registration. The regulatory risk is not worth it.

**Decision:** GCA stays internal to the network. Non-tradeable. Non-sellable. Restricted by the merchant incorporation agreement.

---

### 6. GCA Value Backing — What It's Actually Backed By

GCA is not backed by the vault (that's CATR). GCA is backed by **HNDA's revenue and growth**. It is equity-like in nature — a participation token, not a stablecoin.

The 0.63% commission is the *source* of dividend payments, but GCA's value is ultimately a function of how many merchants are active and how much volume flows through the network.

At 1,000 active merchants, the whitepaper estimates **~$12 USD per GCA**. A merchant holding 1,200 GCA would receive approximately **$876 USD annually in dividends**.

---

### 7. Entropy Mechanism — Dividends + Exit Burn

The loss mechanism is honest and already in the whitepaper:

- **Dividends** — HNDA pays out a percentage of commission revenue to GCA holders. If revenue drops, dividends drop. Holding GCA in a shrinking network is a losing proposition.
- **Exit burn** — Merchants who leave return their GCA. Supply returns to HNDA. No free exit.
- **Vesting lock** — GCA can't be cashed out early. It's a forced savings account by design.

No decay rate needed. No artificial deflation. The thermodynamics come from real economic behavior.

---

## Key Whitepaper Details (v1.0 — March 2026)

A brief record of the most important numbers and decisions from the whitepaper, for reference:

| Item | Value |
|---|---|
| CATR supply cap | 50,000,000 CATR |
| GCA supply cap | 3,000,000 GCA |
| GCA per merchant at joining | 1,200 GCA |
| GCA estimated value at maturity | ~$12 USD at 1,000 active merchants |
| Dividend at Etapa 1 (0–100 merchants) | 20% of commission revenue |
| Dividend at Etapa 2 (100–500 merchants) | 40% |
| Dividend at Etapa 3 (500–1,000 merchants) | 60% |
| Vault structure | 67% USDT on Base / 33% HNL fiat |
| Commission | 0.63% — hardcoded, immutable |
| Gnosis Safe expansion | 2-of-2 (Etapa 1) → 2-of-3 (Etapa 2) |
| Dead Man's Switch | 30 days no signal → full pause |
| Zero Knowledge Proof reserves | Published monthly |

**Name origin:** GUACA comes from the Honduran expression *"meter a la guaca"* (to save money) and from the Guacamaya Roja (Ara macao), Honduras's national bird — a symbol of freedom and sovereignty.

---

## Season 6 Agenda

| Item | Description |
|---|---|
| GCAToken.sol (simplified) | Deploy alongside CATR on Base Sepolia for home pilot |
| Home pilot UI | Visual dashboards for non-technical siblings |
| Auth layer | Username + password, WebAuthn fingerprint upgrade |
| Email parser template engine | Dynamic multi-bank config system |
| Manual confirmation flow | Admin confirms BAC deposits before CATR mints |
| F2 — Network guard | Lock UI to Base Sepolia, warn on wrong network |
| M2 — IDOR fix | User-owned data auth on `/api/users/:id` |
