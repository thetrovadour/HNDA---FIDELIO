# Test Report — nfc_reader

**Date:** 2026-03-30
**Module:** `nfc_reader.cpp`
**Tests:** 14/14 passed
**Suite total after this module:** 56/56 passing

---

## What was built

`NfcReader` — the third and final input adapter for the FIDELIO payment pipeline.

It reads NFC tap events from hardware, parses the NDEF payload into a `PaymentEvent`, and pushes it into the `RetryQueue`. Because no physical NFC hardware exists yet, the module is built in two layers:

- `NfcHardware` — abstract interface (swappable)
- `NfcHardwareMock` — test implementation; taps are injected programmatically
- `NfcHardwareReal` — production implementation (stub, returns empty)

No new dependencies — pure C++17.

---

## NDEF payload format

```
CATR-0xABCD1234-1711800000|500.00
^-- reference_code ------^ ^amount^
```

Pipe-delimited. Simple enough to encode on any NFC tag writer app or transmit via HCE (Host Card Emulation) from the client's phone.

---

## Test cases

| # | Test | Validates |
|---|---|---|
| 1 | `test_valid_payload` | Full happy path — all fields correct |
| 2 | `test_missing_pipe` | No pipe separator → nullopt |
| 3 | `test_empty_payload` | Empty string → nullopt |
| 4 | `test_zero_amount` | Amount = 0.00 → nullopt |
| 5 | `test_negative_amount` | Amount < 0 → nullopt |
| 6 | `test_invalid_reference_prefix` | Reference not starting with `CATR-` → nullopt |
| 7 | `test_reference_missing_timestamp` | No third segment → nullopt |
| 8 | `test_reference_missing_wallet` | Empty wallet segment → nullopt |
| 9 | `test_wallet_extraction` | Wallet correctly extracted from reference |
| 10 | `test_source_is_nfc` | `source` field always set to `"nfc"` |
| 11 | `test_received_at_format` | ISO 8601 UTC format with `T` and `Z` |
| 12 | `test_non_numeric_amount` | Non-numeric amount string → nullopt |
| 13 | `test_mock_hardware_end_to_end` | Injected tap → PaymentEvent lands in RetryQueue |
| 14 | `test_malformed_tap_dropped` | Bad tap is silently discarded — queue stays empty |

Tests 13 and 14 are the most valuable: they exercise the full thread path (hardware → reader loop → queue) without any real hardware.

---

## Key decisions

- **Abstract hardware interface** — `NfcHardware` is a pure virtual class. Swapping mock for real hardware in production is a one-line change at the call site. The reader, parser, and queue are untouched.
- **Blocking read_tap()** — the reader thread blocks on `read_tap()` rather than polling. Zero CPU burn while waiting for a tap.
- **cancel() unblocks read_tap()** — `stop()` calls `hardware_.cancel()` before joining the thread, guaranteeing a clean shutdown with no deadlock.
- **parse_payload is static** — same pattern as `EmailParser` and `WebhookReceiver`. 12 of 14 tests run with no threads, no queue, no hardware.

---

## Connection to the macro

All three input adapters are now implemented. The pipeline is complete on the C++ side:

```
[ EmailParser     ]  ──┐  (Etapa 1 — active)
[ WebhookReceiver ]  ──┼──►  PaymentEvent  ──►  RetryQueue  ──►  Bridge  ──►  Mint
[ NfcReader       ]  ──┘  (long-term goal)
```

Next: `vault_monitor.cpp` (stub pending Phase A contract), then the Node.js Bridge.
