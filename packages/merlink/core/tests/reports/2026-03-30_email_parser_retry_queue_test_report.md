# Email Parser & Retry Queue Test Report

**Date:** 2026-03-30
**Time:** 2026-03-30 (session)
**Modules:** `packages/merlink/core/src/email_parser.cpp` · `packages/merlink/core/src/retry_queue.cpp`
**Test files:** `tests/email_parser_test.cpp` · `tests/retry_queue_test.cpp`
**Result:** PASS — 20/20 new tests passed (30/30 total across all suites)

---

## Build

| Step | Result |
|---|---|
| CMake configure | OK — libcurl 8.5.0 found, Threads found |
| Compile `merlink_core` (all 4 sources) | OK |
| Compile `retry_queue_test` | OK |
| Compile `email_parser_test` | OK |
| Link all executables | OK |

Build type: `Release` | Standard: `C++17` | New dependency: `libcurl`

---

## New Files Created

| File | Purpose |
|---|---|
| `include/payment_event.h` | Shared `PaymentEvent` struct — common output for all input adapters |
| `include/retry_queue.h` | Thread-safe FIFO queue interface |
| `src/retry_queue.cpp` | RetryQueue implementation |
| `include/email_parser.h` | EmailParser + ImapConfig interface |
| `src/email_parser.cpp` | IMAP polling + body parsing implementation |

---

## Bug Found and Fixed During Testing

**Bug:** Off-by-one in reference code parsing.
- `reference.find('-', 5)` skipped the first dash (CATR**-**wallet) and found the second dash (wallet**-**timestamp)
- Then searched for a third dash → `npos` → returned `nullopt` for every valid reference
- **Fix:** Changed `find('-', 5)` to `find('-', 4)` to correctly locate the first dash at position 4

---

## RetryQueue Test Results (8/8)

| # | Test | Description | Result |
|---|---|---|---|
| 1 | `test_empty_on_construction` | Fresh queue reports `empty()=true`, `size()=0` | PASS |
| 2 | `test_push_pop_size` | Push increases size; pop decreases it | PASS |
| 3 | `test_fifo_order` | Events are returned in insertion order | PASS |
| 4 | `test_try_pop_empty` | `try_pop` on empty queue returns false immediately | PASS |
| 5 | `test_blocking_pop_timeout` | `pop()` waits the specified timeout then returns false | PASS |
| 6 | `test_blocking_pop_wakes_on_push` | Blocked consumer wakes immediately when producer pushes | PASS |
| 7 | `test_payload_integrity` | All `PaymentEvent` fields survive push/pop unchanged | PASS |
| 8 | `test_thread_safety` | 4 producers × 250 ops + 4 consumers — no loss, no corruption | PASS |

---

## EmailParser Test Results (12/12)

| # | Test | Description | Result |
|---|---|---|---|
| 1 | `test_valid_body_parses` | Full mock Atlántida email parses all fields correctly | PASS |
| 2 | `test_missing_amount` | Body without amount marker → `nullopt` | PASS |
| 3 | `test_missing_reference` | Body without reference marker → `nullopt` | PASS |
| 4 | `test_zero_amount` | Amount of 0.00 → `nullopt` (invalid payment) | PASS |
| 5 | `test_negative_amount` | Negative amount → `nullopt` | PASS |
| 6 | `test_invalid_reference_prefix` | Reference not starting with `CATR-` → `nullopt` | PASS |
| 7 | `test_reference_missing_timestamp` | Reference with only one segment after CATR → `nullopt` | PASS |
| 8 | `test_reference_missing_wallet` | Empty wallet segment → `nullopt` | PASS |
| 9 | `test_wallet_extraction` | Wallet correctly extracted from `CATR-0xDEADBEEF-1711999999` | PASS |
| 10 | `test_amount_no_decimal` | Integer amount `L. 300` parses as `300.0` | PASS |
| 11 | `test_extra_content_ignored` | Surrounding email text doesn't interfere with parsing | PASS |
| 12 | `test_received_at_format` | `received_at` is non-empty ISO 8601 UTC string ending in `Z` | PASS |

---

## Architecture Note

`PaymentEvent` is the common output of all input adapters:

```
[ EmailParser  ]  ──┐
[ NFCReader    ]  ──┼──►  PaymentEvent  ──►  RetryQueue  ──►  Bridge  ──►  Mint
[ Webhook      ]  ──┘
```

Switching from email to NFC in production requires only swapping the input adapter — the `RetryQueue`, `BloomFilter`, and bridge pipeline are unchanged.

---

## Full Suite Summary

| Suite | Passed | Total |
|---|---|---|
| `bloom_filter_test` | 10 | 10 |
| `retry_queue_test` | 8 | 8 |
| `email_parser_test` | 12 | 12 |
| **Total** | **30** | **30** |

---

## Phase B Status

| Module | Status |
|---|---|
| `bloom_filter.cpp` + `murmurhash3.cpp` | **Complete — 10/10 tests passing** |
| `payment_event.h` | **Complete** |
| `retry_queue.cpp` | **Complete — 8/8 tests passing** |
| `email_parser.cpp` | **Complete — 12/12 tests passing** |
| `vault_monitor.cpp` | Next |
| `nfc_reader.cpp` | Pending |
| `webhook_receiver.cpp` | Pending |
| Node.js Bridge | Pending |
