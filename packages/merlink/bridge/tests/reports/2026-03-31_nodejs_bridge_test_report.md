# Node.js Bridge — Test Report

**Date:** 2026-03-31
**Module:** `packages/merlink/bridge/`
**Runtime:** Node.js + TypeScript (ts-jest)
**Result:** 8/8 tests passing

---

## Test Suite Results

| # | Suite | Test | Result |
|---|---|---|---|
| 1 | Minter | computes correct CATR amount from lempiras (500 → 500 × 10^18 units) | ✅ Pass |
| 2 | Minter | calls mint() with correct wallet address | ✅ Pass |
| 3 | Minter | returns success on resolved mint | ✅ Pass |
| 4 | Minter | returns failure with reason on rejected mint | ✅ Pass |
| 5 | Minter | handles mint revert gracefully | ✅ Pass |
| 6 | SocketServer | sends ACK on successful mint | ✅ Pass |
| 7 | SocketServer | sends NACK on mint failure | ✅ Pass |
| 8 | SocketServer | sends NACK on invalid JSON | ✅ Pass |

---

## Architecture Tested

```
C++ RetryQueue (simulated client)
        │  JSON over Unix domain socket (/tmp/merlink.sock)
        ▼
socket_server.ts  →  minter.ts  →  contract.mint() [mocked]
        │
        ▼
ACK / NACK response back to C++ client
```

---

## IPC Protocol Verified

**Incoming (C++ → Node.js):**
```json
{"reference_code":"CATR-0xABCD-1711800000","amount_lempiras":500.00,"client_wallet":"0xABCD1234...","source":"EMAIL","received_at":1711800000}
```

**Outgoing ACK:**
```json
{"status":"ACK","reference_code":"CATR-0xABCD-1711800000"}
```

**Outgoing NACK:**
```json
{"status":"NACK","reference_code":"CATR-0xABCD-1711800000","reason":"mint reverted: ..."}
```

---

## Key Design Decisions Verified

- **Contract injection pattern** — `Minter` accepts a `ContractLike` interface. Tests use a mock. Production wires the real ethers.js contract. Same pattern as `VaultBackend` and `NfcHardware` in C++ core.
- **1:1 peg enforced** — 500 Lempiras → `ethers.parseUnits("500", 18)` → 500 × 10^18 CATR wei. Correct.
- **Newline-delimited JSON framing** — socket buffers incoming data, splits on `\n`. Handles partial reads correctly.
- **Stale socket cleanup** — server deletes `/tmp/merlink.sock` on startup if it exists from a prior crash.
- **Graceful shutdown** — SIGINT/SIGTERM closes socket and removes socket file cleanly.

---

## What Is Not Tested Here (Phase A completes this)

- Real `contract.mint()` call against Base Sepolia — requires deployed `CATRToken.sol` address and funded minter wallet
- End-to-end C++ → socket → bridge → blockchain flow — requires Phase A deployment

---

## Notes

No real blockchain calls in any test. All ethers.js contract interactions are mocked. This is correct — same philosophy as C++ stub backends. The bridge is fully testable without a live network.
