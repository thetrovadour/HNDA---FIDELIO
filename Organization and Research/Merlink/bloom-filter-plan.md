# FIDELIO — Architecture Review & Bloom Filter Plan

---

## The 8 Components (Numbered)

| # | Component | Technology | Etapa 1? |
|---|-----------|-----------|----------|
| 1 | **CATRToken.sol** — Smart Contracts | Solidity 0.8.x + Hardhat + OpenZeppelin | YES |
| 2 | **Backend API** | Node.js 20 + Express.js + TypeScript | YES |
| 3 | **Web Application** | Next.js 14 + React + TailwindCSS | YES |
| 4 | **PostgreSQL Database** | PostgreSQL + Prisma ORM | YES |
| 5 | **GCAToken.sol** | Solidity | Deferred (Etapa 2) |
| 6 | **VaultRegistry.sol** | Solidity | Deferred (Etapa 2) |
| 7 | **Gnosis Safe** (2/2 multi-sig) | No custom code | YES |
| 8 | **MerL1nk** (Hybrid C++/Node.js) | C++17 Core + Node.js Bridge | YES |

---

## MerL1nk Review — 4 Etapa 1 Parts in `src/`

The architecture defines these 4 C++ modules for Etapa 1:

| File | Module | Purpose |
|------|--------|---------|
| `email_parser.cpp` | Email Notification Parser | Monitors HNDA inbox, parses Atlántida bank notifications, extracts amount + reference |
| `bloom_filter.cpp` | Duplicate Prevention Engine | Ultra-fast "have I seen this reference?" check |
| `retry_queue.cpp` | Retry Queue Engine | Failed mint transactions retried with exponential backoff, survives restarts |
| `vault_monitor.cpp` | Vault Monitor | Polls vault balance ratios (67/33 USDT/fiat), alerts when below threshold |

**Status:** ✅ Architecture matches — all 4 specified, all C++, all Etapa 1.

---

## Organization Review

Current project structure:

```
HNDA---FIDELIO/
├── ClaudeProfile/
│   └── CLAUDE.md                          ✅ AI workspace guidelines
├── Organization and Research/
│   ├── CLAUDE.md                          ✅ Working rules
│   ├── Fidelio-Architecture-Planv1.1.md   ✅ Main blueprint
│   ├── FIDELIO-Learning-Plan.md           ✅ Learning resources
│   ├── learning-plan.md                   ✅ Education plan
│   └── sources-and-resources.md           ✅ References
└── packages/
    ├── contracts/                          ✅ Created (empty — Component 1)
    └── merlink/
        └── core/
            ├── include/                   ✅ Created (empty — headers)
            └── src/                       ✅ Created (empty — C++ source)
```

**What's set up:** Docs are organized, merlink/core directory scaffold is ready.

**What's missing (expected — not yet in scope):**
- `packages/merlink/bridge/` — Node.js Bridge
- `packages/backend/` — Backend API
- `packages/web/` — Web Application
- `CMakeLists.txt` in merlink/core
- Root `package.json`, `turbo.json`

---

## Bloom Filter — Implementation Plan

### Context

When a customer transfers lempiras to HNDA's bank account, Atlántida sends an email notification. MerL1nk's email parser reads this every 60 seconds. Before triggering a mint, it must check: **"Have I already processed this reference code?"** Processing the same reference twice = double-minting = real financial loss.

The bloom filter provides this check in O(1) time with near-zero memory. PostgreSQL's `processed_references` table serves as the authoritative backup for false positives.

### The Math Model

A bloom filter is a bit array of size **m** with **k** hash functions. To check membership, all k hash positions must be 1.

**Formulas:**
- **m** (bits) = −(n × ln(p)) / (ln 2)²
- **k** (hash functions) = (m / n) × ln 2
- **Actual false positive rate** = (1 − e^(−kn/m))^k

Where **n** = expected number of elements, **p** = target false positive rate.

**FIDELIO sizing (design for 10,000 references, 1% false positive rate):**

| Parameter | Value |
|-----------|-------|
| n (capacity) | 10,000 |
| p (false positive rate) | 0.01 (1%) |
| **m (bit array size)** | **95,851 bits ≈ 12 KB** |
| **k (hash functions)** | **7** |

Even at 100,000 elements → ~120 KB. Extremely lightweight.

**Key property:** False positives are safe (system falls back to PostgreSQL check). False negatives are **impossible** — a bloom filter will never say "not seen" for something it has seen.

### Class Design

**Header:** `packages/merlink/core/include/bloom_filter.h`
**Source:** `packages/merlink/core/src/bloom_filter.cpp`

```cpp
// bloom_filter.h
#pragma once
#include <vector>
#include <string>
#include <mutex>
#include <cstdint>

namespace merlink {

class BloomFilter {
public:
    // Construct with expected capacity and target false positive rate
    BloomFilter(uint64_t expected_elements, double false_positive_rate = 0.01);

    // Core operations
    void add(const std::string& reference);
    bool possibly_contains(const std::string& reference) const;

    // Persistence — save/load bit array to disk
    bool save(const std::string& filepath) const;
    bool load(const std::string& filepath);

    // Stats
    uint64_t bit_count() const;        // m
    uint32_t hash_count() const;       // k
    uint64_t element_count() const;    // items added
    double current_false_positive_rate() const;

private:
    std::vector<uint8_t> bits_;        // bit array
    uint64_t m_;                       // total bits
    uint32_t k_;                       // number of hash functions
    uint64_t count_;                   // elements inserted
    mutable std::mutex mutex_;         // thread safety

    // Double hashing: h(i) = h1 + i*h2  (Kirsch-Mitzenmacher optimization)
    // Only need 2 base hashes to generate k hash functions
    std::pair<uint64_t, uint64_t> hash(const std::string& data) const;
    void set_bit(uint64_t index);
    bool get_bit(uint64_t index) const;
};

} // namespace merlink
```

### Hashing Strategy

Use **MurmurHash3** (128-bit variant) to produce two 64-bit hashes (h1, h2). Then derive k hash functions via:

```
hash_i(x) = (h1 + i * h2) % m,  for i = 0..k-1
```

This is the Kirsch-Mitzenmacher optimization — mathematically proven to have the same false positive guarantees as k independent hash functions, but only requires one hash computation.

**MurmurHash3** is chosen because:
- Public domain, no dependencies
- Excellent distribution
- Very fast on x86/x64
- Widely used in bloom filter implementations

### Persistence

The filter must survive server restarts (architecture requirement).

**File format (binary):**
```
[8 bytes] magic number: "MRLKBLM\0"
[8 bytes] m (bit count)
[4 bytes] k (hash count)
[8 bytes] count (elements inserted)
[ceil(m/8) bytes] raw bit array
[4 bytes] CRC32 checksum of everything above
```

- `save()` writes atomically (write to `.tmp`, then rename)
- `load()` validates magic number + CRC32 before accepting
- On corrupt/missing file → start with empty filter (safe: causes no false negatives)

### Thread Safety

- `std::mutex` guards all reads/writes to `bits_` and `count_`
- `add()` locks, sets bits, increments count, unlocks
- `possibly_contains()` locks (shared read in future with `std::shared_mutex` if needed), checks bits, unlocks
- For Etapa 1 (single email parser thread polling every 60s), contention is zero — but the design is ready for concurrent modules

### Integration Flow

```
Email arrives → Email Parser extracts reference "CATR-0x1234-1711234567"
    │
    ▼
BloomFilter::possibly_contains(reference)
    │
    ├── returns false → DEFINITELY new → proceed to mint
    │                    add(reference) to bloom filter
    │                    INSERT into processed_references (PostgreSQL)
    │
    └── returns true  → PROBABLY duplicate
                         Query PostgreSQL processed_references to confirm
                         ├── Found in DB → confirmed duplicate → reject
                         └── Not in DB → false positive → proceed to mint
                                          add(reference) — already there, no-op
                                          INSERT into processed_references
```

### Files to Create

| File | What |
|------|------|
| `packages/merlink/core/include/bloom_filter.h` | Class declaration |
| `packages/merlink/core/src/bloom_filter.cpp` | Implementation (hashing, persistence, bit ops) |
| `packages/merlink/core/src/murmurhash3.h` | MurmurHash3 header (public domain, inline) |
| `packages/merlink/core/src/murmurhash3.cpp` | MurmurHash3 implementation |
| `packages/merlink/core/CMakeLists.txt` | CMake build config |
| `packages/merlink/core/tests/bloom_filter_test.cpp` | Unit tests |

### CMake Setup

```cmake
cmake_minimum_required(VERSION 3.16)
project(merlink_core LANGUAGES CXX)
set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

add_library(merlink_core
    src/bloom_filter.cpp
    src/murmurhash3.cpp
)
target_include_directories(merlink_core PUBLIC include)

# Tests
enable_testing()
add_executable(bloom_filter_test tests/bloom_filter_test.cpp)
target_link_libraries(bloom_filter_test merlink_core)
add_test(NAME bloom_filter_test COMMAND bloom_filter_test)
```

### Testing Strategy

1. **Basic membership:** Add reference → `possibly_contains` returns true
2. **Non-membership:** Never-added reference → returns false
3. **Persistence round-trip:** Add items → save → create new filter → load → all items still present
4. **Corrupt file handling:** Load garbage file → gracefully starts empty
5. **False positive rate validation:** Insert n items, test 100,000 random non-members, measure actual FP rate ≈ target
6. **Duplicate reference format:** Test with actual `CATR-0x...-timestamp` format strings
7. **Thread safety:** Concurrent adds from multiple threads → no crashes, no lost inserts

### Verification

```bash
cd packages/merlink/core
mkdir build && cd build
cmake ..
make
ctest --output-on-failure
```
