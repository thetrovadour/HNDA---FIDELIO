# Sprint 1 — Auth Security Design: Inactivity Logout + Merchant JWT

**Date:** 2026-04-24
**Status:** Approved

---

## Scope

Two focused changes. No new migrations, no new backend routes, no admin changes.

1. **Inactivity auto-logout** — client (5 min) and merchant (15 min)
2. **Merchant JWT sessions** — merchants currently store no token; fix that

Deferred to post-pilot (HTTPS required): Passkey / WebAuthn, in-app security banner.

---

## 1. Inactivity Auto-Logout

### Hook: `packages/web/src/hooks/useInactivity.ts`

```
useInactivity({ timeoutMs, onTimeout })
```

- Attaches `mousemove`, `keydown`, `touchstart`, `click` listeners to `window`
- Tracks `lastActivity` in a `useRef` — no re-renders on activity
- `setInterval` every 60s checks `Date.now() - lastActivity.current > timeoutMs`
- On timeout: calls `onTimeout()`, clears interval, removes listeners
- Cleans up fully on unmount

### Integration

| Page | Timeout | `onTimeout` |
|---|---|---|
| `client/page.tsx` | `5 * 60 * 1000` | existing logout handler (clears `fidelio_session`, resets state) |
| `merchant/page.tsx` | `15 * 60 * 1000` | existing logout handler (clears `fidelio_merchant_session`, resets state) |

Hook is called only when the user is logged in (i.e., when `token !== null`).

---

## 2. Merchant JWT Sessions

### Problem

`merchant/page.tsx` login handler stores `{ merchant }` in `fidelio_merchant_session` but discards the JWT returned by `/auth/pilot-login`. All merchant API calls run without a Bearer token.

### Fix

**Frontend only — no backend changes.**

1. Login handler: store `{ merchant, token }` in `fidelio_merchant_session`
2. Session restore: read `token` from storage alongside `merchant`
3. Add `token` to component state (`useState<string | null>`)
4. Thread `token` as a prop into all tabs that call the API: `NegocioTab`, `CanjearTab`, `MovimientosTab`, `AjustesTab`
5. All merchant API calls in `src/lib/api.ts` that are missing `Authorization: Bearer <token>` headers get `token` added

---

## Out of Scope

- New DB migrations
- New backend routes
- Admin page changes
- In-app security banner (deferred — no opt-in features to point to yet)
- Passkey / WebAuthn (deferred — requires HTTPS; lands with `hnda.io`)

---

## Success Criteria

- Client page logs out automatically after 5 minutes of no interaction
- Merchant page logs out automatically after 15 minutes of no interaction
- After inactivity logout, user lands on the login screen (same as manual logout)
- Merchant API calls include `Authorization: Bearer <token>` header
- Session restore on merchant page recovers both `merchant` and `token`
- No regressions on client page, admin page, or backend tests
