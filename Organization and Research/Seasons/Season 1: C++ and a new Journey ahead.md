# Season 1: C++ and a new Journey ahead

**Project:** FIDELIO — Digital Loyalty Point System for Honduran Tourism
**Period:** 2026-03-30
**Phase covered:** B — MerL1nk C++ Core
**Final test count:** 66/66 passing

---

## The Starting Point

FIDELIO began as a vision: a closed-loop loyalty token (CATR) running on Base (Ethereum L2), designed for the Honduran tourism sector. Clients pay in Lempiras, receive CATR, and spend it across a network of partner merchants. HNDA operates the system. Víctor the lawyer co-signs large redemptions via Gnosis Safe.

At the start of Season 1, the repository was an empty Turborepo monorepo with four packages and nothing in any of them. The architecture existed only in a markdown file.

The decision was made to build the C++ engine first — not because it was the easiest path, but because it was the right one. Speed, determinism, no garbage collector pauses, 24/7 uptime. MerL1nk would be the engine room of the ship.

---

## What Was Built

### The Foundation

**`murmurhash3.cpp`**
The mathematical bedrock. A fast, non-cryptographic hash function using the Kirsch-Mitzenmacher double-hashing technique. Nothing in the pipeline would work without this — it feeds the bloom filter.

**`bloom_filter.cpp`**
Probabilistic memory. Before FIDELIO ever touches PostgreSQL, the bloom filter checks in O(1) whether a payment reference was already processed. Seed constant `0xF1DE0001` — a deliberate nod to the project name. False positives (~1%) are acceptable and fall back to the `processed_references` table. False negatives are mathematically impossible. This is the first line of defense against double-minting.

**`payment_event.h`**
The most important file in Phase B. Not a source file — a header. It defines the `PaymentEvent` struct:

```cpp
struct PaymentEvent {
    std::string reference_code;
    double      amount_lempiras;
    std::string client_wallet;
    std::string source;
    std::string received_at;
};
```

This is the universal language of the MerL1nk pipeline. A bank email speaks Spanish with numbers buried in a paragraph. An NFC tap speaks binary. A webhook speaks JSON. `PaymentEvent` is what all three say after translation. The bridge, the bloom filter, and the retry queue never learn what language the original message was in.

This is the **input adapter pattern** — the single most important architectural decision of Season 1.

**`retry_queue.cpp`**
The sorting room. A thread-safe FIFO queue. Parsers push `PaymentEvent` objects in. The Node.js Bridge pops them out and calls `contract.mint()`. If the blockchain is temporarily unavailable, events wait here safely. The queue is intentionally in-memory only — PostgreSQL's `pending_mints` table handles crash recovery. This is not a redundancy; it is a separation of concerns by design.

### The Three Mail Carriers

**`email_parser.cpp`**
The first mail carrier and the one that matters most right now. It polls a dedicated Gmail inbox via IMAP (libcurl, port 993) every 60 seconds, looking for Atlántida bank transfer notifications. When it finds one, it parses two fields from the email body — amount and reference code — and produces a `PaymentEvent`.

This is Etapa 1 of FIDELIO's payment intake. It costs zero. Gmail IMAP with an App Password, no API billing. It is unglamorous and it works.

**`webhook_receiver.cpp`**
The second mail carrier. A lightweight HTTP server (cpp-httplib, single header) listening on port 8080 for POST `/payment` requests. This is Etapa 2 — when BAC Credomatic replaces the email flow with a direct API call. The JSON payload arrives, gets parsed, and produces a `PaymentEvent`. Optional token authentication via `X-Webhook-Token` header.

The key insight: swapping from Etapa 1 to Etapa 2 is not a refactor. It is turning off one mail carrier and turning on another. The bloom filter, retry queue, and bridge are untouched.

**`nfc_reader.cpp`**
The third mail carrier and the long-term vision. A client taps their phone or card at a merchant's reader. The NDEF payload — a pipe-delimited string encoding the reference code and amount — is captured, parsed, and becomes a `PaymentEvent`.

There is no physical NFC hardware yet. So `nfc_reader` was built in two layers: `NfcHardware` (abstract interface) and `NfcHardwareMock` (test implementation that accepts injected taps). When real hardware arrives, it becomes a third implementation of the same interface. The reader, the parser, and the queue never change.

### The Security Camera

**`vault_monitor.cpp`**
The guardian that watches without intervening. It polls the CATR contract state on Base at a configurable interval and fires alerts when:
- Total supply exceeds 90% of the 50M cap
- Supply decreases unexpectedly (possible unauthorized burn)
- Treasury or reward pool balance drifts beyond 5%

The blockchain connection is stubbed (`VaultBackendStub`) because Phase A — the CATRToken.sol contract — has not been deployed yet. The full interface is in place. When Phase A delivers the contract address and ABI, `VaultBackendReal` replaces the stub in one line.

---

## The Numbers

| Module | Tests Passing |
|---|---|
| `murmurhash3` + `bloom_filter` | 10/10 |
| `retry_queue` | 8/8 |
| `email_parser` | 12/12 |
| `webhook_receiver` | 12/12 |
| `nfc_reader` | 14/14 |
| `vault_monitor` | 10/10 |
| **Total** | **66/66** |

Six test suites. Zero failures. One justified stub.

---

## Key Decisions Made in Season 1

| Decision | Reason |
|---|---|
| C++ for MerL1nk Core | Speed, determinism, no GC pauses, 24/7 operation |
| Input adapter pattern (`PaymentEvent`) | NFC is the long-term goal — normalizing input now makes that a one-module swap |
| RetryQueue instead of direct callback | Decouples retry logic from parsing layer; wrong layer to bolt retry onto the parser |
| IMAP for email (Etapa 1) | Zero cost, natively supported by Gmail, no API billing |
| cpp-httplib for webhook | Single header, zero new CMake dependencies, sufficient for one endpoint |
| Abstract `NfcHardware` interface | No hardware exists yet; mock enables full test coverage today |
| `VaultBackendStub` | Phase A contract not deployed; interface complete, implementation deferred |
| `cmake -DCMAKE_BUILD_TYPE=Release` | Debug builds with `-fsanitize=address` cause mismatched-flag failures in test binaries |

---

## What Season 1 Proved

The hardest part of any payment system is the seam between the messy outside world and the clean inside logic. Bank emails arrive in Spanish with inconsistent formatting. NFC payloads are binary blobs. Webhooks are JSON from a bank's API team you've never met.

Season 1 built that seam and made it airtight. Every payment — regardless of origin — arrives at the bridge as a validated, normalized `PaymentEvent`. The rest of the system does not know and does not care where it came from.

The engine is built. It is tested. It is waiting for something to drive.

---

## Season 2 Preview

**The Node.js Bridge** (`packages/merlink/bridge/`)

For the first time, the engine shakes hands with the blockchain. The bridge pops `PaymentEvent` objects from the `RetryQueue` and calls `contract.mint(clientWallet, amount)` on Base Sepolia via ethers.js. CATR lands in a client's wallet. The loop closes for the first time.

After the bridge:
- **Phase A** — CATRToken.sol deployed on Base Sepolia. Gnosis Safe configured. `VaultBackendReal` wired in.
- **Phase C** — Express API + PostgreSQL/Prisma. The 11-table schema comes to life. Reconciliation cron, reward payouts, redemption flow.
- **Phase D** — Next.js web app. Client, merchant, and admin views.
- **Phase E** — Five real end-to-end transactions. Money in, CATR minted, CATR spent, CATR burned, Lempiras out.

**The boulder never stops.**

---

*Report written at end of session — 2026-03-30*
*Claude Code + oh-my-claudecode | FIDELIO v0.1.0*
