# FIDELIO / HNDA Design System

> **Honduras Nativa Digital Answers (HNDA)** — sovereign digital infrastructure, built for Honduras.
> **FIDELIO** — HNDA's flagship closed-loop loyalty & payment network, built on Base (Ethereum L2), powered by the CATR token.

This is the design system for HNDA and its sub-brand FIDELIO. It consolidates the visual DNA, tokens, fonts, icons, UI kits, and brand rules pulled directly from the production codebase.

---

## Brand Context

HNDA is **not a startup**. It is positioned as **an institution in the making** for Honduras — building sovereign financial infrastructure that "minimizes foreign entities in the critical path of a Honduran financial transaction, not as a reaction to threat, but as a statement of principle."

**The stack:**
- **HNDA** (parent) — `hnda.network` / marketing + mission. Accent color: **sky blue** (`#0ea5e9`).
- **FIDELIO** (product) — closed-loop loyalty payment network. 1 CATR = 1 HNL. Accent color: **gold** (`#c8a84b`) for CATR / financial elements; still dark HNDA base.
- **H-Wallet** (coming soon) — self-custody wallet infra.
- **HNDA Node** (coming soon) — self-hosted Base node on Honduran hardware.

**The products / surfaces:**
1. **Marketing site** (`packages/web` root + `/fidelio`) — dark, Oxanium-heavy, the public face of HNDA and FIDELIO. Uses `HyperText`, `TypingAnimation`, `InteractiveGridPattern`.
2. **Client mobile web app** (`/client`) — the loyalty wallet for end users. Darker palette (`#06080D`), minimal, tab-based, bottom nav.
3. **Merchant web app** (`/merchant`) — point-of-sale for accepting/redeeming CATR.
4. **Admin panel** (`/admin`) — HNDA-facing reward payout queue, redemption queue, GCA admin.
5. **Legacy marketing HTML** (`website/website.html`) — a standalone Spanish-language marketing one-pager using a lighter CATR-orange / GCA-blue palette. Tone and content are canonical — visuals are superseded by the dark system.

---

## Source Materials

All design context pulled from the repo **`thetrovadour/HNDA---FIDELIO`** (private, GitHub):

| Source | Purpose |
|---|---|
| `packages/web/DESIGN.md` | The authoritative design-system doc. Single source of truth for colors, type, components, motion. |
| `packages/web/src/app/globals.css` | CSS custom properties, keyframes, utility classes. |
| `packages/web/src/app/page.tsx` | HNDA home page (hero + mission + products + contact). |
| `packages/web/src/app/fidelio/page.tsx` | FIDELIO marketing page (hero + three actors + how-it-works + token stats). |
| `packages/web/src/app/client/page.tsx` | Mobile client app (login, dashboard, activity, network, settings). |
| `packages/web/src/app/merchant/page.tsx` | Merchant web app. |
| `packages/web/src/app/admin/page.tsx` | Admin console. |
| `packages/web/src/app/register/page.tsx` | Registration flow. |
| `packages/web/src/app/layout.tsx` | Font imports: Oxanium + SairaStencil (local TTFs — full family provided by brand). |
| `website/website.html` | Legacy one-pager marketing site, Spanish copy, CATR-orange palette. |
| `CLAUDE.md` (repo root) | Full architecture, invariants, reward system spec. |
| `test.md` | FIDELIO mission/goals copy. |
| `Organization and Research/Whitepaper_CATR_GUACA_v1_APA.pdf` | CATR/GCA whitepaper (not imported — too large for this system). |

**No Figma** was provided. All visual extraction is from **production code**.

---

## CONTENT FUNDAMENTALS

### Voice

HNDA writes with **quiet conviction**. Short, declarative, slightly institutional. Never hype. Never "we're changing the world." The tone sits between a sovereign announcement and a crypto-engineer's README.

**Signature rhetorical pattern:** *paired declarative sentences*, often with a period mid-line for emphasis.

> "Mint before pay. Burn before redeem."
> "One network. Three roles."
> "Honduras pays on its own terms."
> "Designed to stay honest."

### Signature phrases (canonical — preserve casing and punctuation)

- **"The business of the Honduran people is Honduran people's business."** — the mission quote, italic, accent-colored "Honduran people's business."
- **"Sovereign digital infrastructure."**
- **"Honduran by design."**
- **"Technology that belongs to the people."**
- **"On-chain. Transparent. Honest."**
- **"1 CATR = 1 HNL."**
- **"Mint before pay. Burn before redeem."**
- **"Live on Base · Testnet Active"**

### Bilingual rule

- **HNDA brand surfaces** (marketing, mission, about) → **English**.
- **FIDELIO product surfaces** (client app, merchant app, legacy marketing) → **Spanish** (Honduran register).
- The FIDELIO marketing page (`/fidelio`) sits at the seam — headline English, product copy English, but anchored phrasing like "Bienvenido" appears in UI mocks.

### Casing

- **Headlines:** Sentence case with a final period. Emphasis via `<br>` line break, **not** capitalization. (`Honduras Nativa\nDigital Answers.`)
- **Eyebrow labels:** ALL CAPS, 0.12em tracked, accent-colored, small (`0.78rem`). Examples: `WHO WE ARE`, `THREE PILLARS`, `THE PAYMENT LOOP`, `CATR TOKEN · BASE (ETHEREUM L2)`.
- **Brand wordmarks:** `HNDA`, `FIDELIO`, `CATR`, `GCA` — always uppercase. FIDELIO specifically uses the `.stencil` (SairaStencil) class, always.
- **Buttons / CTAs:** Sentence case, no period. "Join Network", "Explore the Network", "See FIDELIO", "Back to HNDA".
- **Badges:** Title Case with a dot separator for status — "Live · Testnet", "Coming Soon", "In Planning".

### Pronoun / perspective

- HNDA mostly speaks in the **first-person plural ("we")** when stating mission: *"We use public blockchains because they are auditable."*
- User-facing product copy (client/merchant) uses **Spanish formal-informal "tú"** form: *"¿Olvidaste tu contraseña?"*, *"Accede aquí"*, *"No tienes cuenta?"*.

### Emoji

**Minimally used.** Only in **mission cards** on the HNDA home page (pattern is established and set):
- 🇭🇳 Honduran by design
- 🔗 Blockchain as a trust layer
- 🏛️ Sovereignty as strategy
- 🆔 / 🏪 / 🏦 for FIDELIO "three roles"
- 🔐 / 🌐 for coming-soon products

**Rule:** Do not add new emoji to new UI. The existing set is the entire catalog.

### Capsule phrases — the "invariants"

Certain phrases from `CLAUDE.md` are treated as **engraved invariants** — always formatted with `<strong>` or uppercase-bold:

- **MINT-BEFORE-PAY**
- **BURN-BEFORE-REDEEM**
- **50M supply cap**
- **3.6% commission · 65% treasury · 35% rewards**
- **2/2 multisig (VaultOp)**

### Numbers, tokens, amounts

- CATR amounts rendered with comma-separated thousands + 2-decimal: `56,203.19`.
- Always labeled `CATR` (display) or `pts` (user-facing in client app — the word "crypto" is deliberately hidden from end users per the "make crypto invisible" goal).
- Conversion always stated as `1 CATR = 1 HNL` or `1 pt = 1 Lempira`.

---

## VISUAL FOUNDATIONS

### Colors

Three palettes coexist:

**1. HNDA Dark (primary)** — the authoritative system.
- `--bg #0a0f14` deep navy-black (never pure `#000`)
- `--text #e2e8f0`, `--muted #64748b`, `--muted-hi #94A3B8`
- `--accent #0ea5e9` sky blue (HNDA — CTAs, active, links)
- `--gold #c8a84b` (FIDELIO — CATR amounts, financial)
- `--border rgba(255,255,255,0.08)`, `--card-bg rgba(255,255,255,0.04)`
- Success `#22c55e`, Error `#EF4444`

**2. Mobile-app darker variant** — slightly deeper for phone screens.
- Background `#06080D`, surfaces `#0C1018` / `#111820`.

**3. Legacy marketing orange** (website.html only) — CATR-50 `#fff8e1` → CATR-700 `#c77d00`, and GCA blue `#0d1b3e`. **Superseded** by the dark system for all new work.

See `colors_and_type.css` for the full token list.

### Typography

- **Body/UI:** **Oxanium** (local TTFs, weights 200–800, variable). Geometric, technical, slightly futuristic. Used everywhere.
- **Display/Brand:** **SairaStencil** (local TTFs — full family with width + weight variable axes). Used **exclusively** for the wordmarks `HNDA`, `FIDELIO`, and product headings via the `.stencil` class. Brand also ships Condensed / SemiCondensed / Expanded / SemiExpanded / ExtraCondensed / UltraCondensed subfamilies — reserve the default family for brand marks; width variants are available if needed for editorial / poster contexts.
- Section headings use negative tracking `-0.03em` to `-0.04em`.
- Body copy uses `line-height: 1.7`.
- Eyebrow labels: `0.78rem`, weight 700, `0.12em` tracking, uppercase, accent-blue.

**Note:** both fonts load from Google Fonts in production (`packages/web/src/app/layout.tsx`). No local font files exist in the source repo — **no font file substitution was needed**.

### Spacing & layout

- **Max content width:** 960px (standard), 1100px (hero only).
- **Section padding:** `5rem 2rem` (vertical, horizontal).
- **Nav:** fixed top, 64px, `rgba(10,15,20,0.55)` + `backdrop-filter: blur(12px)`, 1px border-bottom.
- **Cards:** 16px radius, `1.5px` border, `var(--card-bg)` surface, `2rem` padding.
- **Buttons:** pill-shaped (`999px`), `0.75rem 1.75rem` padding.
- **Inputs:** **rectangular** 8px radius — a deliberate contrast with the pill buttons.
- **Mobile-app internal cards:** 12px radius, deeper surface `#0C1018`.

### Backgrounds & atmosphere

Rich layered fixed-position atmosphere:

1. **Base** — `#0a0f14` flat.
2. **Canvas background** — `<CanvasBackground>` (HNDA home) or `<HexCanvasBackground>` (FIDELIO page) — subtle animated particle/hex field, `position: fixed`, `z-index: 0`.
3. **Interactive grid** — `<InteractiveGridPattern>` 40×40, radial-gradient-masked (`ellipse 110% 110% at 50% 30%, black 60%, transparent 95%`), hover cells fill sky-400/20.
4. **Blur overlay** — `backdrop-filter: blur(16px)` on lower portion via inverse radial mask, so content feels closer.
5. **Nav glass** — `rgba(10,15,20,0.55) + blur(12px)`.

**No full-bleed imagery. No stock photos. No hand-drawn illustration.** The background *is* the atmosphere — particles, grid, blur, gradient masks. Everything else is typography and bordered cards on a flat dark field.

### Motion

- **Scroll reveal** on every section content block via `data-reveal` attribute — 28px upward translate + opacity fade, 0.6s ease. Stagger via `data-delay="1|2|3|4"` (0.1s increments).
- **Hero sequence** — `.hero-seq-item` items fade+rise 18px, JS-staggered (`200ms + i*150ms`).
- **Gold shimmer** — `.shimmer-text` on CATR amounts, 9s linear infinite gradient sweep.
- **Pulse glow** — `.animate-pulse-glow` on CATR balance displays, 3s ease-in-out infinite box-shadow pulse in gold.
- **Mark draw-on** — the FIDELIO hexagonal mark has a clip-path reveal animation on `/fidelio` page load (2.6s ease-in-out cubic).
- **HyperText** (MagicUI) — scramble-reveal effect for `HNDA` headline.
- **TypingAnimation** (MagicUI) — rotating subtitle lines.
- **Active-press** — mobile buttons use `active:scale-95` (Tailwind).
- **No bounce, no elastic, no overshoot.** Motion is linear / cubic-ease, always in service of communication.

### Hover states

- **Nav links:** `color: var(--muted) → var(--text)`, no underline.
- **Buttons:** `InteractiveHoverButton` component — sliding arrow reveal with border-accent sweep. Falls back to `opacity` change on simple links.
- **Cards (product cards):** `translateY(-2px to -4px) + box-shadow` on the legacy marketing site; the production dark site relies on border-color shifts instead.
- **Grid cells:** `hover:fill-sky-400/20` on InteractiveGridPattern.

### Press states

- Mobile: `active:scale-95` (6% shrink).
- Web: no explicit press state — hover is the only feedback.

### Borders

Three tiers:
- `--border rgba(255,255,255,0.08)` — default card / nav border.
- `--border-hi rgba(255,255,255,0.13)` — elevated / hover.
- **Accent-bordered cards** — featured cards swap border to `var(--accent)` (blue) or `var(--gold)` (CATR/financial). Coming-soon cards get `opacity: 0.55`.

### Shadows

Shadows are **rare** on the dark site — borders do most of the elevation work. Where used:
- `drop-shadow(0 32px 64px rgba(0,0,0,0.7)) drop-shadow(0 8px 24px rgba(14,165,233,0.15))` — the Android phone mock on the FIDELIO hero.
- `shadow` on legacy marketing site service cards (older style).

### Gradients

- **Radial masks** on background overlays (dominant pattern).
- **Linear gradients** on the FIDELIO mark stroke: `#c8a84b → #d9bc6e → #ffffff` vertical.
- **Text shimmer** gradient on CATR amounts.
- **No** bluish-purple gradients. **No** rainbow/saturated gradients. **No** gradient buttons.

### Corner radii

- Buttons / pills / status badges: `999px`.
- Cards: `16px`.
- Inputs: `8px` (intentionally rectangular, not pill).
- Mobile sub-cards: `12px` (`rounded-xl` in Tailwind).

### Transparency & blur

Used deliberately:
- Nav glass: `rgba(10,15,20,0.55) + blur(12px)`.
- Grid background blur mask: `blur(16px)` on lower portion.
- Soft color fills: `rgba(201,168,76,0.08)` for gold-tinted cards, `rgba(14,165,233,0.06)` for invariant callouts.

### Iconography

See the ICONOGRAPHY section below.

### Imagery

Virtually none. The production site has **zero photography** and **zero illustration**. Visual texture comes entirely from typography + canvas backgrounds + custom SVG marks.

---

## ICONOGRAPHY

HNDA's iconography is **minimal, custom, and restrained**. It is not a library pull — it is bespoke SVG for key brand marks, with one-off inline SVGs and emoji filling the rest.

### Primary marks (inline SVG — in this repo at `assets/`)

| File | Use |
|---|---|
| `assets/hnda-icon.svg` | HNDA favicon / logo mark. Contains the full circular "H" symbol with orbital rings, cross axis, and five stars — accent blue `#0ea5e9` on the orbital rings. |
| `assets/hnda-icon.png` | Rasterized favicon. |
| `assets/hnda-apple-icon.png` | Apple touch icon. |
| *(FIDELIO hexagon mark)* | Rendered **inline** in `packages/web/src/app/fidelio/page.tsx` and `page.tsx`. Hexagonal outline, stroked `var(--gold)`, no fill, 3.5px stroke-width, round line-caps. Path coordinates use a ~50px hex radius. Not a separate asset. |

### Icon style rules

- **Stroke-only, no fill.** Every custom glyph (FIDELIO hexagon, the small stat icons in the client app — Activity, Network, User, Copy, Settings) uses `fill="none" stroke="currentColor" strokeWidth={1.5}`.
- **Round line-caps and line-joins.** (`strokeLinecap="round" strokeLinejoin="round"`)
- **20–24px viewBox**, rendered at 20–48px depending on context.
- **CurrentColor.** Icons inherit from their container — they shift between `--muted`, `--text`, `--gold`, `--accent` based on state without CSS filter tricks.

### Inline SVG icons in the codebase

Defined inline in `packages/web/src/app/client/page.tsx`:
- `IconUser` — `circle(8,4)` head + arc body.
- `IconActivity` — heartbeat polyline.
- `IconNetwork` — three-circle node graph.
- `IconCopy` — overlapping rounded rectangles.
- `IconSettings` — gear (complex path, 8 teeth).

These are **not exported as a set**. Each component defines the icons it needs inline. When extending this system, follow the same pattern — or reach for Lucide as a close substitute (same stroke-1.5 / round-cap vocabulary).

### Emoji as icon

Emoji **is** used, but only in the mission-card pattern (see CONTENT FUNDAMENTALS → Emoji). The palette is fixed at those ~8 glyphs; do not expand without reason.

### Recommended CDN substitute — **FLAGGED SUBSTITUTION**

If you need icons beyond the inline-SVG catalog, use **Lucide** (`https://unpkg.com/lucide-static@latest/icons/<name>.svg`) — it matches the stroke-1.5, round-cap, 24px-viewBox style almost exactly. **Flag the substitution to the user** and ask whether they want the icons committed to `assets/` as SVGs or embedded inline.

### Unicode / special characters

- `·` (middle dot) is used as a separator in labels: `"Live · Testnet Active"`, `"© 2026 HNDA · Built on Base"`.
- `→` (rightward arrow) for "Explore FIDELIO →" CTAs.
- `↓ / ↑` for transaction direction arrows in the mobile app.
- `←` for "Back" links.

---

## File Index

```
/                         — this design system root
├── README.md             — you are here
├── SKILL.md              — Agent Skill manifest (Claude Code compatible)
├── colors_and_type.css   — CSS variables for color + type + semantic rules
├── assets/               — logos, icon marks (HNDA SVG + rasters)
│   ├── hnda-icon.svg
│   ├── hnda-icon.png
│   └── hnda-apple-icon.png
├── preview/              — Design System tab card previews (registered assets)
│   └── *.html            — one card per sub-concept
└── ui_kits/              — high-fidelity UI kit recreations, per product surface
    ├── marketing/        — HNDA home + FIDELIO marketing page
    │   ├── README.md
    │   ├── index.html
    │   └── *.jsx
    └── client-app/       — FIDELIO client mobile app
        ├── README.md
        ├── index.html
        └── *.jsx
```

---

## Caveats

- **No Figma access** — all visuals reverse-engineered from production TSX.
- **FIDELIO hexagon mark** is **not** an asset file — it lives inline in the codebase. If you need it as an SVG file, extract from `/fidelio/page.tsx`.
- **Fonts are local** — the brand delivered the full Oxanium + SairaStencil TTF families (variable + statics across every width axis). Wired via `@font-face` in `colors_and_type.css`. No CDN dependency.
- The **`website.html` legacy page** uses a completely different palette (CATR-orange, GCA-blue). Kept for reference but treated as **superseded**.
- No decks, slide templates, or illustration libraries exist in the source.

---

## Index

Root files:
- `README.md` — this file. Brand context, content fundamentals, visual foundations, iconography.
- `SKILL.md` — Agent Skill entry point (Claude Code compatible).
- `colors_and_type.css` — foundation tokens. Import this from every artifact. Defines all CSS vars + `@font-face` rules.

Folders:
- `fonts/` — Oxanium + SairaStencil TTFs (full family, variable + statics).
- `assets/` — HNDA logo marks (SVG + PNG), app icons.
- `preview/` — design-system card HTML files (colors, type, spacing, components, brand).
- `ui_kits/web/` — hnda.io marketing site recreation. Open `index.html`.
- `ui_kits/mobile/` — FIDELIO H-Wallet mobile app recreation. Open `index.html`.

UI Kits:
| Kit | Surface | Entry |
|---|---|---|
| `ui_kits/web` | HNDA marketing site (packages/web) | `index.html` — Hero, MissionCards, ProductGrid, Footer |
| `ui_kits/mobile` | FIDELIO H-Wallet app | `index.html` — Login → Home → Send click-through |
