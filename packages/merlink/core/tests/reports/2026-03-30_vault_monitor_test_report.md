# Test Report — vault_monitor

**Date:** 2026-03-30
**Module:** `vault_monitor.cpp`
**Tests:** 10/10 passed
**Suite total after this module:** 66/66 passing

---

## What was built

`VaultMonitor` — the on-chain security camera for the FIDELIO system.

Runs as a background thread, polling the CATR contract state on Base at a configurable interval. Fires alerts when anomalies are detected: supply cap approach, unexpected burns, or wallet balance drift.

Because Phase A (CATRToken.sol) does not yet exist, the blockchain connection is stubbed via `VaultBackendStub`. The full interface is in place — swapping in `VaultBackendReal` (Base RPC via ethers.js IPC) is a one-line change at the call site.

No new dependencies — pure C++17.

---

## Architecture

```
VaultMonitor
    │
    └── VaultBackend (interface)
            ├── VaultBackendStub   ← active now (returns configurable dummy state)
            └── VaultBackendReal   ← Phase A (Base RPC, to be implemented)
```

---

## Alert types

| Alert | Trigger |
|---|---|
| `CAP_APPROACHING` | `total_supply >= 90%` of 50,000,000 CATR |
| `UNEXPECTED_BURN` | `total_supply` decreased between checks |
| `BALANCE_DRIFT` | Treasury or reward pool moved >5% relative to last check |

---

## Test cases

| # | Test | Validates |
|---|---|---|
| 1 | `test_healthy_no_alert` | Identical states → no alert |
| 2 | `test_cap_approaching` | 92% supply → CAP_APPROACHING |
| 3 | `test_cap_at_threshold` | Exactly 90% → CAP_APPROACHING |
| 4 | `test_cap_below_threshold` | 88% → no alert |
| 5 | `test_unexpected_burn` | Supply decrease → UNEXPECTED_BURN |
| 6 | `test_treasury_drift` | 10% treasury drop → BALANCE_DRIFT |
| 7 | `test_reward_drift` | 10% reward increase → BALANCE_DRIFT |
| 8 | `test_treasury_within_threshold` | 3% drop → no alert |
| 9 | `test_supply_increase_no_alert` | Minting → no alert |
| 10 | `test_stub_backend_returns_state` | Stub returns configured state |

---

## Key decisions

- **check_once is a method, not static** — it needs `config_` (thresholds). All 10 tests call it directly without starting a thread.
- **Interruptible sleep** — the monitor loop sleeps 1 second at a time instead of the full interval, so `stop()` exits promptly without waiting up to 60 seconds.
- **Alert callback** — `on_alert()` decouples the monitor from any specific notification system. The backend can wire it to a Slack webhook, a DB write, or a log file without touching this module.
- **Stub backend** — `VaultBackendStub::set_state()` lets tests inject any scenario without touching the monitor logic.

---

## Connection to the macro

`VaultMonitor` is the guardian of the MINT-BEFORE-PAY and BURN-BEFORE-REDEEM invariants at the observability layer. It does not enforce them (the smart contract does) — it detects if something slipped through.

```
CATRToken.sol  ──►  VaultBackendReal  ──►  VaultMonitor  ──►  Alert callback
                    (Phase A, stub now)
```

---

## Phase B C++ Core — COMPLETE

All 7 modules are implemented and tested:

| Module | Tests |
|---|---|
| `bloom_filter` + `murmurhash3` | 10/10 ✅ |
| `payment_event.h` | — |
| `retry_queue` | 8/8 ✅ |
| `email_parser` | 12/12 ✅ |
| `webhook_receiver` | 12/12 ✅ |
| `nfc_reader` | 14/14 ✅ |
| `vault_monitor` | 10/10 ✅ |
| **Total** | **66/66** |

Next: Node.js Bridge (`packages/merlink/bridge/`) — the first piece that touches the blockchain.
