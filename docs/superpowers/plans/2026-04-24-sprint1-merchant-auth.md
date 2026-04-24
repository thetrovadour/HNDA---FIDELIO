# Sprint 1 — Merchant Authentication Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give merchants a real authenticated session — password login, JWT, and protected backend routes.

**Architecture:** New `POST /auth/merchant-login` endpoint returns a merchant-scoped JWT. New `merchantAuth` middleware guards all merchant-specific routes. Frontend `LoginScreen` switches from merchant-ID lookup to credential login; token is stored in `localStorage` and threaded to all API calls.

**Tech Stack:** Express, jsonwebtoken, bcrypt, Prisma, Next.js (React state + localStorage)

**Note:** Inactivity logout (`useInactivityLogout`) is already implemented on both pages — no work needed there.

---

## File Map

| File | Action | What changes |
|---|---|---|
| `packages/backend/src/middleware/auth.ts` | Modify | Add `merchantAuth` middleware + `merchant` to Express.Request |
| `packages/backend/src/routes/auth.ts` | Modify | Add `POST /merchant-login` route |
| `packages/backend/src/routes/merchants.ts` | Modify | Add `merchantAuth` to all merchant-specific routes |
| `packages/web/src/lib/api.ts` | Modify | Add `merchantLogin()`, add `token` param to merchant API calls |
| `packages/web/src/app/merchant/page.tsx` | Modify | New login flow, store/restore token, thread token to tabs |

---

## Task 1: Add `merchantAuth` middleware

**Files:**
- Modify: `packages/backend/src/middleware/auth.ts`

- [ ] **Step 1: Add `merchant` to Express.Request type and `merchantAuth` function**

Open `packages/backend/src/middleware/auth.ts`. Replace the `declare global` block and add the new middleware at the end:

```typescript
declare global {
  namespace Express {
    interface Request {
      admin?: jwt.JwtPayload | string;
      user?: { id: string; role: 'user' };
      merchant?: { id: string; user_id: string };
    }
  }
}
```

Add at the bottom of the file (after `selfOrAdmin`):

```typescript
export function merchantAuth(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized', code: 'MISSING_TOKEN' });
    return;
  }
  const token = authHeader.slice(7);
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    res.status(401).json({ error: 'Unauthorized', code: 'JWT_NOT_CONFIGURED' });
    return;
  }
  try {
    const decoded = jwt.verify(token, jwtSecret, { algorithms: ['HS256'] }) as jwt.JwtPayload;
    if (decoded.role === 'admin') {
      req.admin = decoded;
      next();
      return;
    }
    if (decoded.role === 'merchant' && decoded.merchant_id === req.params.id) {
      req.merchant = { id: decoded.merchant_id as string, user_id: decoded.user_id as string };
      next();
      return;
    }
    res.status(403).json({ error: 'Forbidden', code: 'ACCESS_DENIED' });
  } catch {
    res.status(401).json({ error: 'Unauthorized', code: 'INVALID_TOKEN' });
  }
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd packages/backend && npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add packages/backend/src/middleware/auth.ts
git commit -m "feat(auth): add merchantAuth middleware"
```

---

## Task 2: Add `POST /auth/merchant-login` route

**Files:**
- Modify: `packages/backend/src/routes/auth.ts`

- [ ] **Step 1: Add `MerchantLoginSchema` and the route**

At the top of `auth.ts`, after the existing `PilotLoginSchema`, add:

```typescript
const MerchantLoginSchema = z.object({
  full_name: z.string().min(1),
  credential: z.string().min(1),
});
```

Inside `authRouter()`, after the `pilot-login` route, add:

```typescript
router.post('/merchant-login', validate(MerchantLoginSchema), async (req: Request, res: Response) => {
  const { full_name, credential } = req.body as { full_name: string; credential: string };

  const user = await db.user.findFirst({ where: { full_name } });
  if (!user) {
    res.status(401).json({ error: 'No encontramos tu cuenta', code: 'INVALID_CREDENTIALS' });
    return;
  }

  const valid = user.password_hash
    ? await bcrypt.compare(credential, user.password_hash)
    : user.pin === credential;

  if (!valid) {
    res.status(401).json({ error: 'No encontramos tu cuenta', code: 'INVALID_CREDENTIALS' });
    return;
  }

  const merchant = await db.merchant.findFirst({ where: { owner_user_id: user.id } });
  if (!merchant) {
    res.status(403).json({ error: 'Esta cuenta no tiene un negocio asociado', code: 'NOT_A_MERCHANT' });
    return;
  }

  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    res.status(500).json({ error: 'Auth not configured', code: 'JWT_NOT_CONFIGURED' });
    return;
  }

  const token = jwt.sign(
    { id: user.id, user_id: user.id, merchant_id: merchant.id, role: 'merchant' },
    jwtSecret,
    { algorithm: 'HS256', expiresIn: '7d' }
  );

  res.status(200).json({
    data: {
      token,
      merchant: {
        id: merchant.id,
        name: merchant.name,
        category: merchant.category,
        contact_email: merchant.contact_email,
        wallet_address: merchant.wallet_address,
        active: merchant.active,
        notify_redemption_update: merchant.notify_redemption_update,
        payout_bank: merchant.payout_bank,
        payout_account_number: merchant.payout_account_number,
        payout_account_type: merchant.payout_account_type,
        payout_crypto_address: merchant.payout_crypto_address,
      },
    },
  });
});
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd packages/backend && npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 3: Manual smoke test**

Start the backend: `cd packages/backend && npm run dev`

Test with curl (replace credential with a real pilot merchant's PIN or password):
```bash
curl -s -X POST http://localhost:3001/api/auth/merchant-login \
  -H "Content-Type: application/json" \
  -d '{"full_name":"Alejandro Reyes","credential":"1234"}' | jq .
```
Expected: `{ data: { token: "eyJ...", merchant: { id: "...", name: "...", active: true, ... } } }`

Test with non-merchant user:
```bash
curl -s -X POST http://localhost:3001/api/auth/merchant-login \
  -H "Content-Type: application/json" \
  -d '{"full_name":"Henry Rodriguez","credential":"3333"}' | jq .
```
Expected: `{ error: "Esta cuenta no tiene un negocio asociado", code: "NOT_A_MERCHANT" }`

- [ ] **Step 4: Commit**

```bash
git add packages/backend/src/routes/auth.ts
git commit -m "feat(auth): add POST /auth/merchant-login route"
```

---

## Task 3: Protect merchant routes with `merchantAuth`

**Files:**
- Modify: `packages/backend/src/routes/merchants.ts`

- [ ] **Step 1: Import `merchantAuth`**

At the top of `merchants.ts`, update the import:

```typescript
import { adminAuth, merchantAuth } from '../middleware/auth';
```

- [ ] **Step 2: Add `merchantAuth` to all merchant-specific routes**

Find each of these route definitions and add `merchantAuth` as the second argument (before the handler):

```typescript
router.get('/:id/balance', merchantAuth, async (req: Request, res: Response) => {
router.get('/:id/transactions', merchantAuth, async (req: Request, res: Response) => {
router.get('/:id/redemptions', merchantAuth, async (req: Request, res: Response) => {
router.post('/:id/redemptions', merchantAuth, validate(MerchantRedemptionSchema), async (req: Request, res: Response) => {
router.patch('/:id/profile', merchantAuth, validate(UpdateProfileSchema), async (req: Request, res: Response) => {
router.patch('/:id/notifications', merchantAuth, validate(UpdateMerchantNotificationsSchema), async (req: Request, res: Response) => {
router.patch('/:id/payout', merchantAuth, validate(UpdateMerchantPayoutSchema), async (req: Request, res: Response) => {
```

Leave `/:id/public` as-is (public — used by client Red tab to display merchant info).

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd packages/backend && npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 4: Smoke test protected route**

With the backend running, confirm a request without a token is rejected:
```bash
curl -s http://localhost:3001/api/merchants/<any-merchant-id>/balance | jq .
```
Expected: `{ error: "Unauthorized", code: "MISSING_TOKEN" }`

Then confirm a valid merchant token works (use the token from Task 2 Step 3):
```bash
curl -s http://localhost:3001/api/merchants/<merchant-id>/balance \
  -H "Authorization: Bearer <token>" | jq .
```
Expected: `{ data: { catr_balance: "...", ... } }`

- [ ] **Step 5: Run backend tests**

```bash
cd packages/backend && npm test
```
Expected: all tests still passing (tests use admin tokens or bypass auth).

- [ ] **Step 6: Commit**

```bash
git add packages/backend/src/routes/merchants.ts
git commit -m "feat(auth): protect merchant routes with merchantAuth middleware"
```

---

## Task 4: Add `merchantLogin` API function and token param to merchant calls

**Files:**
- Modify: `packages/web/src/lib/api.ts`

- [ ] **Step 1: Add `merchantLogin` function**

After the `pilotLogin` function, add:

```typescript
export function merchantLogin(body: { full_name: string; credential: string }) {
  return apiFetch<{
    data: {
      token: string;
      merchant: Merchant;
    };
  }>('/api/auth/merchant-login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}
```

- [ ] **Step 2: Add `token` parameter to protected merchant API calls**

Update these functions to accept and forward `token: string`:

```typescript
export function getMerchantBalance(id: string, token: string) {
  return apiFetch<{ data: MerchantBalance }>(`/api/merchants/${id}/balance`, {
    headers: authHeaders(token),
  });
}

export function getMerchantTransactions(id: string, token: string) {
  return apiFetch<{ data: MerchantTransaction[] }>(`/api/merchants/${id}/transactions`, {
    headers: authHeaders(token),
  });
}

export function getMerchantRedemptions(id: string, token: string) {
  return apiFetch<{ data: RedemptionRequest[] }>(`/api/merchants/${id}/redemptions`, {
    headers: authHeaders(token),
  });
}

export function createMerchantRedemption(merchantId: string, amount_catr: number, token: string) {
  return apiFetch<{ data: RedemptionRequest }>(`/api/merchants/${merchantId}/redemptions`, {
    method: 'POST',
    headers: { ...authHeaders(token), 'Content-Type': 'application/json' },
    body: JSON.stringify({ amount_catr }),
  });
}

export function updateMerchantNotifications(
  id: string,
  body: { notify_redemption_update?: boolean },
  token: string,
) {
  return apiFetch<{ data: { notify_redemption_update: boolean } }>(`/api/merchants/${id}/notifications`, {
    method: 'PATCH',
    headers: { ...authHeaders(token), 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

export function updateMerchantPayout(
  id: string,
  body: {
    payout_bank?: string;
    payout_account_number?: string;
    payout_account_type?: 'SAVINGS' | 'CHECKING';
    payout_crypto_address?: string;
  },
  token: string,
) {
  return apiFetch<{ data: Merchant }>(`/api/merchants/${id}/payout`, {
    method: 'PATCH',
    headers: { ...authHeaders(token), 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}
```

Leave `getMerchantPublic` unchanged (public route, no token needed).

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd packages/web && npx tsc --noEmit
```
Expected: errors pointing to `merchant/page.tsx` call sites that now need `token` — these will be fixed in Task 5.

- [ ] **Step 4: Commit**

```bash
git add packages/web/src/lib/api.ts
git commit -m "feat(api): add merchantLogin and token param to merchant API calls"
```

---

## Task 5: Update merchant page — login flow, session, token threading

**Files:**
- Modify: `packages/web/src/app/merchant/page.tsx`

- [ ] **Step 1: Add `token` to component state and update imports**

At the top of the file, ensure `merchantLogin` is imported:
```typescript
import { merchantLogin, getMerchantBalance, getMerchantTransactions, getMerchantRedemptions, createMerchantRedemption, updateMerchantNotifications, updateMerchantPayout, getMerchantPublic } from '@/lib/api';
```

In `MerchantPage`, add `token` to state:
```typescript
const [token, setToken] = useState<string | null>(null);
```

- [ ] **Step 2: Update session restore to read `token`**

Find the `useEffect` that reads from `localStorage` and update it:
```typescript
useEffect(() => {
  const raw = localStorage.getItem(SESSION_KEY);
  if (!raw) return;
  try {
    const session = JSON.parse(raw);
    setMerchant(session.merchant);
    setToken(session.token ?? null);
    setIntroComplete(true);
  } catch {
    localStorage.removeItem(SESSION_KEY);
  }
}, []);
```

- [ ] **Step 3: Update `handleLogin` to store token**

```typescript
function handleLogin(m: Merchant, t: string) {
  setMerchant(m);
  setToken(t);
  localStorage.setItem(SESSION_KEY, JSON.stringify({ merchant: m, token: t }));
}
```

- [ ] **Step 4: Update `handleLogout` to clear token**

```typescript
function handleLogout(reason?: 'inactivity') {
  localStorage.removeItem(SESSION_KEY);
  setMerchant(null);
  setToken(null);
  setBalance(null);
  setActiveTab('negocio');
  setInactivity(reason === 'inactivity');
}
```

- [ ] **Step 5: Update polling `useEffect` to pass token**

Find the `useEffect` that polls `getMerchantBalance` and `getMerchantPublic`:
```typescript
useEffect(() => {
  if (!merchant || !token) return;
  getMerchantBalance(merchant.id, token)
    .then((r) => setBalance(r.data))
    .catch(() => {});

  const interval = setInterval(() => {
    getMerchantBalance(merchant.id, token)
      .then((r) => setBalance(r.data))
      .catch(() => {});
    getMerchantPublic(merchant.id)
      .then((r) => {
        if (r.data.active !== merchant.active) {
          const updated = { ...merchant, active: r.data.active };
          setMerchant(updated);
          const raw = localStorage.getItem(SESSION_KEY);
          if (raw) {
            const s = JSON.parse(raw);
            localStorage.setItem(SESSION_KEY, JSON.stringify({ ...s, merchant: updated }));
          }
        }
      })
      .catch(() => {});
  }, 15_000);
  return () => clearInterval(interval);
}, [merchant?.id, token]);
```

- [ ] **Step 6: Rewrite `LoginScreen` to use credential login**

Replace the entire `LoginScreen` component:

```typescript
function LoginScreen({ onLogin, inactivity }: { onLogin: (merchant: Merchant, token: string) => void; inactivity?: boolean }) {
  const [fullName, setFullName] = useState('');
  const [credential, setCredential] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!fullName.trim() || !credential.trim()) return;
    setLoading(true);
    setError('');
    try {
      const res = await merchantLogin({ full_name: fullName.trim(), credential: credential.trim() });
      onLogin(res.data.merchant, res.data.token);
    } catch {
      setError(t('merchant.error_not_found'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: C.bg }}>
      <form onSubmit={handleSubmit} className="w-full max-w-sm flex flex-col gap-4">
        <h1 className="text-2xl font-bold text-center" style={{ color: C.text, fontFamily: 'Oxanium, sans-serif' }}>
          {t('merchant.portal_label')}
        </h1>
        {inactivity && (
          <p className="text-center text-sm" style={{ color: C.error }}>
            {t('common.inactivity_logout')}
          </p>
        )}
        <Input
          label={t('common.full_name')}
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          placeholder="Nombre completo"
        />
        <Input
          label={t('common.credential')}
          type="password"
          value={credential}
          onChange={(e) => setCredential(e.target.value)}
          placeholder="PIN o contraseña"
        />
        {error && <p className="text-sm text-center" style={{ color: C.error }}>{error}</p>}
        <PrimaryBtn type="submit" disabled={loading || !fullName.trim() || !credential.trim()}>
          {loading ? t('common.loading') : t('client.btn_login')}
        </PrimaryBtn>
        <p className="text-center text-sm" style={{ color: C.slate }}>
          {t('merchant.client_link')}{' '}
          <a href="/client" style={{ color: C.accent }}>{t('merchant.client_link_cta')}</a>
        </p>
      </form>
    </div>
  );
}
```

- [ ] **Step 7: Update the `handleLogin` call site**

Find the line that calls `handleLogin` in the `LoginScreen` render:
```typescript
if (!merchant) return <LoginScreen onLogin={(m, t) => { setInactivity(false); handleLogin(m, t); }} inactivity={inactivity} />;
```

- [ ] **Step 8: Thread `token` to all tabs**

Update the tab render section:
```typescript
{activeTab === 'negocio'     && <NegocioTab     merchant={merchant} />}
{activeTab === 'canjear'     && <CanjearTab     merchant={merchant} token={token!} />}
{activeTab === 'gca'         && <GcaTab         merchant={merchant} />}
{activeTab === 'movimientos' && <MovimientosTab merchant={merchant} token={token!} />}
{activeTab === 'ajustes'     && <AjustesTab     merchant={merchant} token={token!} onUpdate={(m) => {
  setMerchant(m);
  const raw = localStorage.getItem(SESSION_KEY);
  if (raw) {
    const s = JSON.parse(raw);
    localStorage.setItem(SESSION_KEY, JSON.stringify({ ...s, merchant: m }));
  }
}} />}
```

- [ ] **Step 9: Update tab components to accept and use `token`**

For `CanjearTab` — add `token: string` to props and pass to API calls:
```typescript
function CanjearTab({ merchant, token }: { merchant: Merchant; token: string }) {
  // ...
  getMerchantRedemptions(merchant.id, token)  // in useEffect
  // ...
  const res = await createMerchantRedemption(merchant.id, amount, token);  // in submit handler
}
```

For `MovimientosTab` — add `token: string` to props and pass to API calls:
```typescript
function MovimientosTab({ merchant, token }: { merchant: Merchant; token: string }) {
  // ...
  getMerchantTransactions(merchant.id, token)  // in useEffect
}
```

For `AjustesTab` — add `token: string` to props and pass to API calls:
```typescript
function AjustesTab({ merchant, token, onUpdate }: { merchant: Merchant; token: string; onUpdate: (m: Merchant) => void }) {
  // ...
  updateMerchantNotifications(merchant.id, update, token)  // notification toggle
  updateMerchantPayout(merchant.id, payoutBody, token)     // payout save
}
```

- [ ] **Step 10: Verify TypeScript compiles with zero errors**

```bash
cd packages/web && npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 11: Verify full build passes**

```bash
cd /home/cristian-rodriguez/proyectos/HNDA---FIDELIO && npm run build
```
Expected: all packages build successfully.

- [ ] **Step 12: Commit**

```bash
git add packages/web/src/app/merchant/page.tsx
git commit -m "feat(merchant): credential login, JWT session, token-authenticated API calls"
```

---

## Final Verification

- [ ] Start backend and frontend: `npm run dev` from repo root
- [ ] Open `http://localhost:3000/merchant` — login with `full_name` + PIN
- [ ] Confirm: login succeeds, merchant dashboard loads
- [ ] Confirm: balance, transactions, redemptions all load (token being sent)
- [ ] Open DevTools → Application → localStorage → `fidelio_merchant_session` — confirm `token` field is present
- [ ] Refresh page — confirm session restores correctly (token restored, dashboard loads without re-login)
- [ ] Wait 15 minutes idle (or temporarily set timeout to 10s to test) — confirm inactivity logout fires and redirects to login screen
- [ ] Open `http://localhost:3001/api/merchants/<id>/balance` in browser (no token) — confirm 401
