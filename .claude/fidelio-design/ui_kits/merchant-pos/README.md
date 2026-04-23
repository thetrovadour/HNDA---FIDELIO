# FIDELIO · Merchant POS UI Kit

Static HTML+JSX click-through reference for the FIDELIO merchant portal.
Reverse-engineered from `packages/web/src/app/merchant/page.tsx`.

## Open it

```bash
open .claude/fidelio-design/ui_kits/merchant-pos/index.html
# or serve locally:
npx serve .claude/fidelio-design/ui_kits/merchant-pos
```

## Screens

| File | Screen | Production source |
|---|---|---|
| `LoginScreen.jsx` | Merchant login | `LoginScreen` component |
| `HomeScreen.jsx` | TopBar + Mi Negocio tab | `TopBar` + `NegocioTab` + `TabBar` |
| `CanjearScreen.jsx` | CATR → HNL redemption | `CanjearTab` |
| `GcaScreen.jsx` | GCA balance, earning rules, apply | `GcaTab` |
| `MovimientosScreen.jsx` | Transaction history | `MovimientosTab` |
| `AjustesScreen.jsx` | Edit merchant profile | `AjustesTab` |
| `PhoneFrame.jsx` | Phone bezel + status bar | Shared chrome |

## Design tokens

All tokens are defined in `window.C` inside `index.html` and sourced from
`../../colors_and_type.css`. The merchant palette uses the mobile-app deeper
variant (`#06080D` base, `#0C1018` surfaces).

Key brand rules for merchant surfaces:
- **Gold** (`#C9A84C`) — CATR/GCA amounts, active tab indicator, GCA CTAs.
- **Stencil font** (`SairaStencil`) — used only for the `FIDELIO` wordmark in the top bar.
- **Bottom tab bar** — 5 tabs: Mi Negocio / Canjear / GCA / Movimientos / Ajustes.
- **Gold top-line indicator** — active tab gets a 2px gold bar at the top of the tab button.
- **Approval tiers** — < 50 CATR auto · 50–500 admin · > 500 VaultOp (Gnosis Safe 2-de-2).

## Mock data

All data is hardcoded for reference. No API calls. Swap `MOCK_*` constants in
each JSX file to explore different states (e.g. inactive merchant, empty history).

## What's missing

- Merchant POS QR / NFC payment-acceptance flow (future)
- Admin-approval state screens
- VaultOp pending state
