# FIDELIO Design System — Handoff for Claude Code

This folder is a **Claude Code Skill**. Once installed, Claude Code will automatically use the brand colors, typography, fonts, iconography rules, and UI-kit references when building anything for HNDA / FIDELIO.

---

## What's in this folder

| File / Folder | Purpose |
|---|---|
| `SKILL.md` | Skill manifest — Claude Code reads this first |
| `README.md` | Full brand bible: context, content rules, visual foundations, iconography |
| `colors_and_type.css` | CSS variables + `@font-face` — the source of truth for tokens |
| `fonts/` | Local Oxanium + SairaStencil TTFs (variable + statics) |
| `assets/` | HNDA logos + app icons |
| `preview/` | Static HTML cards (colors, type, components) — reference imagery |
| `ui_kits/web/` | hnda.io marketing site recreation (JSX components) |
| `ui_kits/mobile/` | FIDELIO H-Wallet app recreation (Login → Home → Send) |

---

## Step-by-step: install into your repo

### 1. Download this project
Click the download card in the chat (or re-ask: "give me the download link again"). You'll get a `.zip`.

### 2. Unzip and rename
Unzip it. Rename the resulting folder to **`fidelio-design`** (lowercase, hyphenated — this becomes the skill name Claude Code invokes).

### 3. Verify the structure
From your repo root:
```bash
ls .claude/skills/fidelio-design/
```
You should see `SKILL.md`, `README.md`, `colors_and_type.css`, `fonts/`, `ui_kits/`, etc.

### 4. Commit it (Option A only)
```bash
git add .claude/skills/fidelio-design
git commit -m "Add FIDELIO design system skill"
```
Teammates now get it on `git pull`.

### 6. Use it in Claude Code
Start a new session in your repo and say:
> "Use the fidelio-design skill to build a merchant onboarding screen."

Or simply:
> "Build a new settings page for the mobile app, following the design system."

Claude Code will find the skill automatically via `SKILL.md`, read `README.md` for context, and reference `ui_kits/` and `colors_and_type.css` as needed.

---

## Wiring fonts into production (`packages/web`)

The brand fonts are currently loaded via `@font-face` in this skill. To use them in your Next.js app:

### 1. Copy fonts into the web package
```bash
cp -r .claude/skills/fidelio-design/fonts packages/web/public/
```

### 2. Update `packages/web/src/app/layout.tsx`
Replace the Google Fonts import with `next/font/local`:

```tsx
import localFont from 'next/font/local';

const oxanium = localFont({
  src: '../../public/fonts/Oxanium-VariableFont_wght.ttf',
  variable: '--font-oxanium',
  weight: '200 800',
  display: 'swap',
});

const sairaStencil = localFont({
  src: '../../public/fonts/SairaStencil-VariableFont_wdth_wght.ttf',
  variable: '--font-stencil',
  weight: '100 900',
  display: 'swap',
});

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${oxanium.variable} ${sairaStencil.variable}`}>
      <body>{children}</body>
    </html>
  );
}
```

### 3. Update `tailwind.config.ts`
```ts
fontFamily: {
  sans: ['var(--font-oxanium)', 'system-ui', 'sans-serif'],
  stencil: ['var(--font-stencil)', 'sans-serif'],
},
```

Now `className="font-stencil"` applies SairaStencil anywhere, and Oxanium is the default. No more CDN dependency.

---

## Tips for Claude Code sessions

- **Invoke explicitly** when starting something new: *"Using the fidelio-design skill, ..."* — this loads the full brand context up front.
- **Ask Claude to reference specific files** for pixel-perfect work: *"Match the balance card in `ui_kits/mobile/HomeScreen.jsx`"* or *"Use the product card pattern from `ui_kits/web/ProductGrid.jsx`."*
- **When iterating on the skill itself** (e.g. adding a Merchant POS kit), edit files directly in `.claude/skills/fidelio-design/` and commit. Claude Code picks up changes on the next session.
- **Keep the skill in sync with production.** If you add a new component family to `packages/web`, add a matching JSX stub to `ui_kits/web/` so future design work stays anchored.

---

## What's *not* in here (yet)

- Merchant POS UI kit
- Admin console UI kit
- Slide / deck template
- Email template system
- Finalized icon set (currently Unicode placeholders — pick Lucide, Phosphor, or a custom set and wire it through)
