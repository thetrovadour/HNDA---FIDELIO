# FIDELIO Backend — Phase C Test Report

**Date:** 2026-04-02
**Module:** `packages/backend/` (Express API + PostgreSQL/Prisma)
**Test runner:** Jest 29.7.0 + ts-jest
**Result:** 44/44 tests passing across 7 test suites

---

## Test Suites

### 1. MintService (`tests/services/mint_service.test.ts`) — 7 tests
| # | Test | Result |
|---|------|--------|
| 1 | receivePaymentEvent: returns ACK and creates PendingMint + ProcessedReference for new reference | PASS |
| 2 | receivePaymentEvent: returns NACK when reference_code found in ProcessedReference (duplicate) | PASS |
| 3 | receivePaymentEvent: returns NACK when PendingMint found with status MINTED (duplicate) | PASS |
| 4 | receivePaymentEvent: creates Transaction when wallet is found | PASS |
| 5 | receivePaymentEvent: does NOT create Transaction when wallet not found (still returns ACK) | PASS |
| 6 | confirmMint: updates PendingMint to MINTED with tx_hash | PASS |
| 7 | confirmMint: throws when reference_code not found | PASS |

### 2. RedemptionService (`tests/services/redemption_service.test.ts`) — 8 tests
| # | Test | Result |
|---|------|--------|
| 1 | createRequest: assigns AUTO tier for amount < 50 | PASS |
| 2 | createRequest: assigns ADMIN_APPROVAL tier for amount 50-500 | PASS |
| 3 | createRequest: assigns VAULT_OP tier for amount > 500 | PASS |
| 4 | createRequest: throws if merchant not found | PASS |
| 5 | createRequest: throws if merchant not active | PASS |
| 6 | approveRequest: transitions PENDING_BURN to BURN_SUBMITTED | PASS |
| 7 | confirmBurn: throws if called on PENDING_BURN status (wrong sequence) | PASS |
| 8 | confirmLempirasSent: transitions BURNED to LEMPIRAS_SENT | PASS |

### 3. TransactionService (`tests/services/transaction_service.test.ts`) — 5 tests
| # | Test | Result |
|---|------|--------|
| 1 | recordSpend: creates Transaction and MerchantVisit atomically | PASS |
| 2 | recordSpend: throws if user not found | PASS |
| 3 | recordSpend: throws if merchant not found | PASS |
| 4 | getUserTransactions: returns paginated results | PASS |
| 5 | getUserTransactions: returns empty for unknown user | PASS |

### 4. RewardService (`tests/services/reward_service.test.ts`) — 8 tests
| # | Test | Result |
|---|------|--------|
| 1 | checkMilestones: does not award TX_5 when tx count is 4 | PASS |
| 2 | checkMilestones: awards TX_5 when tx count reaches 5 | PASS |
| 3 | checkMilestones: does not award TX_5 again if already exists (upsert guard) | PASS |
| 4 | checkCrossMerchantBonus: does not award when only 2 unique merchants | PASS |
| 5 | checkCrossMerchantBonus: awards when 3+ unique merchants in 30 days | PASS |
| 6 | checkReferralTrigger: does nothing when no pending referral found | PASS |
| 7 | checkReferralTrigger: triggers reward when pending referral found | PASS |
| 8 | queuePayout: assigns correct tier for AUTO (<50) | PASS |

### 5. ReconciliationJob (`tests/jobs/reconciliation.test.ts`) — 6 tests
| # | Test | Result |
|---|------|--------|
| 1 | run: returns zero counts when no stale rows exist | PASS |
| 2 | run: marks row as already_minted when tx_hash is already set | PASS |
| 3 | run: increments attempts and retries when row is stale and no tx_hash | PASS |
| 4 | run: marks FAILED when attempts reaches maxAttempts | PASS |
| 5 | run: does not process rows younger than staleMinutes | PASS |
| 6 | run: does not process rows with status MINTED or FAILED | PASS |

### 6. Bridge Events Routes (`tests/routes/bridge_events.test.ts`) — 6 tests
| # | Test | Result |
|---|------|--------|
| 1 | POST /internal/bridge/payment-received with valid body + correct secret -> 200 ACK | PASS |
| 2 | POST /internal/bridge/payment-received with missing secret -> 401 | PASS |
| 3 | POST /internal/bridge/payment-received with invalid body -> 400 | PASS |
| 4 | POST /internal/bridge/payment-received when MintService returns NACK -> 409 | PASS |
| 5 | POST /internal/bridge/mint-confirmed with valid body -> 200 | PASS |
| 6 | POST /internal/bridge/mint-confirmed when confirmMint throws -> 404 | PASS |

### 7. Redemptions Routes (`tests/routes/redemptions.test.ts`) — 4 tests
| # | Test | Result |
|---|------|--------|
| 1 | POST /api/redemptions with valid body -> 201 with correct tier | PASS |
| 2 | POST /api/redemptions with missing fields -> 400 | PASS |
| 3 | PATCH /api/redemptions/:id/approve without JWT -> 401 | PASS |
| 4 | GET /api/redemptions/:id for valid id -> 200 | PASS |

---

## Invariants Verified

- **MINT-BEFORE-PAY**: MintService is the sole creator of MINT transactions. No client-facing endpoint creates mints.
- **BURN-BEFORE-REDEEM**: RedemptionService enforces strict state machine (PENDING_BURN -> BURN_SUBMITTED -> BURNED -> LEMPIRAS_SENT). Skipping steps throws.
- **1.8% commission**: TransactionService calculates `commission_catr` on every SPEND transaction.
- **Duplicate protection**: Both ProcessedReference and PendingMint status checked before accepting payment events.
- **Tier assignment**: Redemption and payout tiers correctly assigned based on configurable thresholds.

---

## Architecture Notes

- All services use constructor-injected `PrismaClient` (dependency injection pattern from MerL1nk bridge)
- Mock DB (`tests/__mocks__/db.ts`) auto-mapped via Jest `moduleNameMapper`
- `$transaction` mock executes callbacks synchronously with the mock db
- Route tests use `supertest` with isolated Express apps (no real DB connection)
- ReconciliationJob.run() is pure business logic, fully unit-testable without cron
