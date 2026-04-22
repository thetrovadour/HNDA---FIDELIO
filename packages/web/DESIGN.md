# HNDA Design System

> Honduras Nativa Digital Answers — sovereign digital infrastructure, built for Honduras.
> This document is the single source of truth for visual and interaction design across all HNDA web interfaces.
> AI agents and developers must read this before generating or modifying any UI.

---

## Philosophy

HNDA is not a startup. It is an institution in the making. The design reflects that:

- **Dark and deliberate** — no light mode, no playfulness for its own sake. Every element earns its place.
- **Technical without being cold** — the sky blue accent brings life to an otherwise austere palette.
- **Honduran by design** — the identity is specific, not generic. Do not reach for Material Design or Bootstrap defaults.
- **Honest** — no decorative complexity. Motion exists to communicate, not to impress.

---

## Color System

All colors are defined as CSS custom properties in `globals.css`.

| Token | Value | Usage |
|---|---|---|
| `--bg` | `#0a0f14` | Page background — deep navy black |
| `--text` | `#e2e8f0` | Primary text |
| `--muted` | `#64748b` | Secondary text, labels, subtitles |
| `--accent` | `#0ea5e9` | Sky blue — primary brand color, CTAs, highlights |
| `--gold` | `#c8a84b` | FIDELIO-specific — CATR token, financial elements |
| `--border` | `rgba(255,255,255,0.08)` | Subtle borders on cards and dividers |
| `--card-bg` | `rgba(255,255,255,0.04)` | Card and panel backgrounds |

### Semantic usage

- **Accent (`--accent`)** — active states, links, badges, primary buttons, inline emphasis
- **Gold (`--gold`)** — CATR amounts, FIDELIO token UI, financial data, FIDELIO product icon stroke
- **Muted (`--muted`)** — nav links, body copy that is secondary, timestamps, metadata
- **Border (`--border`)** — card outlines, dividers, nav bottom border, input borders

### Extended palette (use sparingly, inline only)

| Purpose | Value |
|---|---|
| Success / Live badge | `rgba(34,197,94,0.12)` bg · `#22c55e` text |
| Coming Soon badge | `rgba(255,255,255,0.06)` bg · `--muted` text |
| Scrollbar track | `#080C14` |
| Scrollbar thumb | `#1E2A40` |

---

## Typography

### Fonts

| Role | Family | CSS Token |
|---|---|---|
| Body / UI | Oxanium | `var(--font-body)` |
| Display / Brand | Saira Stencil One | `var(--font-stencil)` |

- **Oxanium** — geometric, technical, slightly futuristic. Used for all body text, nav, labels, buttons, form fields.
- **Saira Stencil One** — used exclusively for brand names (`HNDA`, `FIDELIO`, product headings). Apply via `.stencil` class.

### Scale

| Element | Size | Weight | Other |
|---|---|---|---|
| Section heading (h2) | `clamp(2rem, 5vw, 3rem)` | 900 | `letter-spacing: -0.03em`, `line-height: 1.1` |
| Product card heading (h3) | `1.25rem` | 800 | — |
| Mission card heading (h3) | `1.1rem` | 700 | — |
| Body / card copy | `0.95rem` | 400 | `line-height: 1.7` |
| Hero subtitle | `clamp(1rem, 2.5vw, 1.35rem)` | 400 | `line-height: 1.6` |
| Section label | `0.78rem` | 700 | `letter-spacing: 0.12em`, `text-transform: uppercase`, color `--accent` |
| Nav links | `0.9rem` | 500 | color `--muted` |
| Small metadata | `0.85rem` | 400 | color `--muted` |

### Rules

- Section labels (eyebrow text above h2) are always uppercase, spaced, accent-colored, small.
- Brand names in headings use `.stencil`. All other headings use `var(--font-body)`.
- Tight tracking (`-0.03em`) on large headings only. Everything else is default or slightly loose.
- `line-height: 1.7` for all paragraph/card body copy.

---

## Layout & Spacing

### Content width

- **Max content width:** `960px`, centered with `margin: 0 auto`
- **Section padding:** `5rem 2rem` (vertical · horizontal)
- **Nav height:** `64px`, fixed to top

### Grid

- Card grids use CSS auto-fit: `repeat(auto-fit, minmax(260px, 1fr))` for 3-col layouts
- Gap between grid items: `1.5rem`
- Single-column centered content: `maxWidth: 600px`, `margin: 0 auto`, `textAlign: center`

### Dividers

- Horizontal rule between sections: `.h-divider` class — 1px, `var(--border)` color, `margin: 0 2rem`

---

## Components

### Navigation

```
position: fixed | top: 0 | height: 64px
background: rgba(10,15,20,0.55) + backdrop-filter: blur(12px)
border-bottom: 1px solid var(--border)
padding: 0 2rem
z-index: 100
```

- Logo left, links right
- Nav links: `--muted` color, `0.9rem`, weight 500
- Primary nav CTA: accent background, white text, `border-radius: 999px`, `padding: 0.4rem 1rem`

### Cards

```css
background: var(--card-bg);
border: 1.5px solid var(--border);
border-radius: 16px;
padding: 2rem;
```

- Featured/active cards get `border-color: var(--accent)` instead of `--border`
- Inactive/coming-soon cards get `opacity: 0.55`
- Card icons: emoji at `2rem` or SVG at `48×48px`

### Buttons

**Primary (filled):**
```css
background: var(--accent);
color: #fff;
padding: 0.75rem 1.75rem;
border-radius: 999px;
font-weight: 600;
font-size: 1rem;
```

**Outline:**
```css
border: 1.5px solid var(--border);
color: var(--text);
padding: 0.75rem 1.75rem;
border-radius: 999px;
font-weight: 600;
font-size: 1rem;
```

- All buttons are pill-shaped (`border-radius: 999px`)
- Use `InteractiveHoverButton` from `@/components/ui/interactive-hover-button` for interactive states on hero CTAs

### Status Badges

```css
display: inline-block;
padding: 0.25rem 0.75rem;
border-radius: 999px;
font-size: 0.75rem;
font-weight: 700;
letter-spacing: 0.04em;
margin-bottom: 1rem;
```

- Live: `rgba(34,197,94,0.12)` bg · `#22c55e` text
- Coming Soon: `rgba(255,255,255,0.06)` bg · `--muted` text

### Blockquote / Pull Quote

```css
font-size: clamp(1.1rem, 2.5vw, 1.4rem);
font-style: italic;
color: var(--text);
text-align: center;
padding: 2rem;
line-height: 1.6;
```

Key phrase wrapped in `<span style={{ color: "var(--accent)" }}>`.

### Inputs & Forms

- Border: `1.5px solid var(--border)`
- Background: `var(--card-bg)`
- Border-radius: `8px` (not pill — inputs are rectangular, buttons are pills)
- Focus: `border-color: var(--accent)`, no outline
- Font: `var(--font-body)`
- Remove number spinners (already in globals.css)

### Scrollbar

Thin, dark: width `4px`, track `#080C14`, thumb `#1E2A40` with `border-radius: 4px`.

---

## Animation & Motion

### Scroll Reveal (CSS — `globals.css`)

Elements with `data-reveal` attribute animate in when they enter the viewport:

```css
opacity: 0 → 1
transform: translateY(28px) → translateY(0)
transition: 0.6s ease
```

Staggered delay via `data-delay="1|2|3|4"` (0.1s · 0.22s · 0.34s · 0.46s increments).

Hook: `useScrollReveal()` from `@/hooks/useScrollReveal`.

### Hero Sequence (CSS)

`.hero-seq-item` elements animate on mount:

```css
opacity: 0 → 1
transform: translateY(18px) → translateY(0)
transition: 0.5s ease
```

Triggered via `setTimeout` stagger (`200ms + i * 150ms`).

### Keyframe utilities (apply via class)

| Class | Animation | Duration |
|---|---|---|
| `.animate-fade-up` | Fade + rise 16px | 0.4s |
| `.animate-slide-right` | Fade + slide from right 24px | 0.3s |
| `.animate-slide-left` | Fade + slide from left 24px | 0.3s |
| `.animate-counter-up` | Fade + rise 8px | 0.5s |
| `.animate-pulse-glow` | Gold glow pulse | 3s infinite |
| `.animate-blink-cursor` | Cursor blink | 1.2s infinite |
| `.shimmer-text` | Gold shimmer sweep | 9s infinite |

### Framer Motion

`framer-motion` and `motion` are installed. Use for:
- Page transitions between routes
- Complex gesture-based interactions
- Orchestrated entrance sequences on new pages
- Scroll-progress-driven animations (e.g. dashboard charts)

Do not replace `data-reveal` scroll animations with Framer Motion — keep CSS for simple reveals, Framer Motion for complex sequences.

### MagicUI components (already installed)

- `TypingAnimation` — `@/components/magicui/typing-animation` — rotating text lines
- `HyperText` — `@/components/ui/hyper-text` — scramble-reveal text effect
- `InteractiveGridPattern` — `@/components/ui/interactive-grid-pattern` — hover-reactive grid background
- `InteractiveHoverButton` — `@/components/ui/interactive-hover-button` — animated CTA buttons

---

## Background & Atmosphere

- **Base background:** `#0a0f14` — deep navy black, never pure black
- **Canvas background:** `<CanvasBackground />` — animated particle/canvas layer, `position: fixed`, `z-index: 0`
- **Interactive grid:** `<InteractiveGridPattern>` behind hero, masked with radial gradient ellipse
- **Blur overlay:** `backdropFilter: blur(16px)` on the lower portion of the grid mask
- **Nav glass effect:** `rgba(10,15,20,0.55)` + `backdrop-filter: blur(12px)`

The layering order (bottom to top):
1. Canvas background (fixed, z-index 0)
2. Interactive grid + blur mask (fixed, z-index 0)
3. Page content (z-index 1)
4. Nav (fixed, z-index 100)

---

## FIDELIO Sub-brand

FIDELIO pages use the same base system with these additions:

- **Gold (`--gold` / `#c8a84b`)** is the primary FIDELIO accent — used for CATR amounts, token icons, financial data
- **FIDELIO wordmark** uses `.stencil` class always
- **CATR token icon:** hexagonal SVG outline, stroked in `var(--gold)`, no fill
- **`.shimmer-text`** class is FIDELIO-specific — applied to CATR totals and key financial figures
- **`.animate-pulse-glow`** applied to CATR balance display elements

---

## Page Structure Template

Every page follows this shell:

```tsx
<div style={{ background: "var(--bg)", color: "var(--text)", minHeight: "100vh", fontFamily: "var(--font-body)" }}>
  <CanvasBackground />
  {/* Fixed nav */}
  <nav>...</nav>

  {/* Sections separated by .h-divider */}
  <section style={{ padding: "5rem 2rem" }}>
    <div style={{ maxWidth: "960px", margin: "0 auto" }}>
      <p style={label}>Eyebrow text</p>
      <h2 style={h2}>Section heading.</h2>
      {/* content */}
    </div>
  </section>

  <div className="h-divider" />

  <footer>...</footer>
</div>
```

---

## Agent Guidelines

- Never use Material UI, Chakra, or any third-party component library — build from primitives using this system
- Never use light backgrounds or white surfaces
- All border-radius on buttons: `999px`. Cards: `16px`. Inputs: `8px`
- All interactive elements must have a hover state (opacity change, border color change, or Framer Motion transition)
- Accent blue (`#0ea5e9`) for HNDA. Gold (`#c8a84b`) for FIDELIO financial elements. Never swap them
- Section labels always: uppercase · spaced · accent color · `0.78rem` · weight 700
- `data-reveal` on every section content block for scroll entrance
- Do not add emojis to UI unless already established in the design (mission cards use emoji icons — that pattern is set)
- User's experience is valuable.

