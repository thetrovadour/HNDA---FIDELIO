# Test Report — webhook_receiver

**Date:** 2026-03-30
**Module:** `webhook_receiver.cpp`
**Tests:** 12/12 passed
**Suite total after this module:** 42/42 passing

---

## What was built

`WebhookReceiver` — the second input adapter for the FIDELIO payment pipeline.

It listens on HTTP POST `/payment`, parses a JSON payload from BAC Credomatic, validates it, and pushes a `PaymentEvent` into the `RetryQueue`. The parsing logic is exposed as a static method (`parse_body`) so tests run without starting an HTTP server.

**New dependency:** `httplib.h` (cpp-httplib, single-header) — dropped into `include/`. No new CMake packages required.

---

## Test cases

| # | Test | Validates |
|---|---|---|
| 1 | `test_valid_payload` | Full happy path — all fields correct |
| 2 | `test_missing_reference_code` | Missing `reference_code` → nullopt |
| 3 | `test_missing_amount` | Missing `amount_lempiras` → nullopt |
| 4 | `test_zero_amount` | Amount = 0.00 → nullopt |
| 5 | `test_negative_amount` | Amount < 0 → nullopt |
| 6 | `test_invalid_reference_prefix` | Reference not starting with `CATR-` → nullopt |
| 7 | `test_reference_missing_timestamp` | No third segment → nullopt |
| 8 | `test_reference_missing_wallet` | Empty wallet segment → nullopt |
| 9 | `test_wallet_extraction` | Wallet correctly extracted from reference |
| 10 | `test_source_is_webhook` | `source` field always set to `"webhook"` |
| 11 | `test_received_at_format` | ISO 8601 UTC format with `T` and `Z` |
| 12 | `test_empty_body` | Empty string → nullopt |

---

## Key decisions

- **No external JSON library** — the BAC Credomatic payload schema is fixed and small. Manual extraction keeps zero new dependencies and mirrors the email parser's approach.
- **parse_body is static** — same pattern as `EmailParser::parse_body`. Tests verify correctness without a running server.
- **Optional token auth** — `WebhookConfig.secret_token` gates requests via `X-Webhook-Token` header. Empty by default (open for local/staging use).
- **stop() detaches thread** — cpp-httplib's `server.listen()` is blocking. For the current scope (Etapa 1 is email-based; webhook is Etapa 2), detach is sufficient. A production stop will wire the server instance out of the thread for graceful shutdown.

---

## Connection to the macro

`WebhookReceiver` completes the second of three input adapters. The pipeline now has two mail carriers:

```
[ EmailParser     ]  ──┐
[ WebhookReceiver ]  ──┼──►  PaymentEvent  ──►  RetryQueue  ──►  Bridge  ──►  Mint
[ NFCReader       ]  ──┘  (pending)
```

Switching from email (Etapa 1) to BAC Credomatic webhooks (Etapa 2) requires only swapping which adapter is running — the bloom filter, retry queue, and bridge are untouched.
