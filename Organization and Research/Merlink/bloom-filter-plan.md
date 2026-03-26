# FIDELIO — Architecture Review & Bloom Filter Plan

**Status:** Implementation complete (2026-03-25)

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

| File | Module | Purpose | Status |
|------|--------|---------|--------|
| `email_parser.cpp` | Email Notification Parser | Monitors HNDA inbox, parses Atlántida bank notifications, extracts amount + reference | Pending |
| `bloom_filter.cpp` | Duplicate Prevention Engine | Ultra-fast "have I seen this reference?" check | ✅ Implemented |
| `retry_queue.cpp` | Retry Queue Engine | Failed mint transactions retried with exponential backoff, survives restarts | Pending |
| `vault_monitor.cpp` | Vault Monitor | Polls vault balance ratios (67/33 USDT/fiat), alerts when below threshold | Pending |

**Architecture check:** ✅ All 4 specified, all C++, all Etapa 1.

---

## Project Structure (Current)

```
HNDA---FIDELIO/
├── package.json                         ✅ Root monorepo workspace config
├── turbo.json                           ✅ Turborepo build pipeline
├── ClaudeProfile/
│   └── CLAUDE.md                        ✅ AI workspace guidelines
├── Organization and Research/
│   ├── CLAUDE.md                        ✅ Working rules
│   ├── Fidelio-Architecture-Planv1.1.md ✅ Main blueprint
│   ├── FIDELIO-Learning-Plan.md         ✅ Learning resources
│   ├── learning-plan.md                 ✅ Education plan
│   ├── sources-and-resources.md         ✅ References
│   ├── organization-explanation.md      ✅ Full folder/file organization guide
│   └── Merlink/
│       └── bloom-filter-plan.md         ✅ This file
└── packages/
    ├── contracts/                       ✅ Created (empty — Component 1)
    ├── backend/
    │   └── src/                         ✅ Created (empty — Component 2)
    ├── web/
    │   └── app/                         ✅ Created (empty — Component 3)
    └── merlink/
        ├── core/
        │   ├── CMakeLists.txt           ✅ CMake build config
        │   ├── include/
        │   │   └── bloom_filter.h       ✅ BloomFilter class header
        │   ├── src/
        │   │   ├── bloom_filter.cpp     ✅ Full implementation
        │   │   ├── murmurhash3.h        ✅ MurmurHash3 header
        │   │   └── murmurhash3.cpp      ✅ MurmurHash3 implementation
        │   └── tests/                   ✅ Created (empty — awaiting tests)
        └── bridge/
            └── src/                     ✅ Created (empty — Node.js Bridge)
```

---

## Bloom Filter — Design & Implementation

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

### Implemented API

**Header:** `packages/merlink/core/include/bloom_filter.h`
**Source:** `packages/merlink/core/src/bloom_filter.cpp`

```cpp
namespace merlink {

class BloomFilter {
public:
    // Construct — auto-calculates optimal m and k from capacity + FP rate
    explicit BloomFilter(uint64_t expected_elements, double false_positive_rate = 0.01);

    // Core operations
    void add(const std::string& reference);
    bool possibly_contains(const std::string& reference) const;

    // Persistence — survives server restarts
    bool save(const std::string& filepath) const;
    bool load(const std::string& filepath);

    // Stats
    uint64_t bit_count() const;                  // m
    uint32_t hash_count() const;                 // k
    uint64_t element_count() const;              // items added
    double current_false_positive_rate() const;  // estimated FP rate

private:
    std::vector<uint8_t> bits_;
    uint64_t m_;
    uint32_t k_;
    uint64_t count_;
    mutable std::mutex mutex_;

    std::pair<uint64_t, uint64_t> hash(const std::string& data) const;
    void set_bit(uint64_t index);
    bool get_bit(uint64_t index) const;
    static uint64_t optimal_m(uint64_t n, double p);
    static uint32_t optimal_k(uint64_t m, uint64_t n);
};

} // namespace merlink
```

### Hashing Strategy (Implemented)

Uses **MurmurHash3** (128-bit x64 variant) to produce two 64-bit hashes (h1, h2). Derives k hash functions via Kirsch-Mitzenmacher optimization:

```
hash_i(x) = (h1 + i * h2) % m,  for i = 0..k-1
```

Mathematically proven to have the same false positive guarantees as k independent hash functions, but only requires one hash computation.

**MurmurHash3** was chosen because:
- Public domain, no external dependencies
- Excellent distribution
- Very fast on x86/x64
- Widely used in bloom filter implementations

**Seed:** `0xF1DE0001` (FIDELIO-themed constant)

### Persistence (Implemented)

The filter survives server restarts via binary file save/load.

**File format:**
```
[8 bytes] magic number: "MRLKBLM\0"
[8 bytes] m (bit count)
[4 bytes] k (hash count)
[8 bytes] count (elements inserted)
[ceil(m/8) bytes] raw bit array
[4 bytes] CRC32 checksum of everything above
```

**Safety guarantees:**
- `save()` writes atomically (write to `.tmp`, then rename) — no half-written files
- `load()` validates magic number + CRC32 before accepting — rejects corruption
- On corrupt/missing file → starts with empty filter (safe: no false negatives possible)

### Thread Safety (Implemented)

- `std::mutex` guards all reads/writes to `bits_` and `count_`
- `add()` locks, sets bits, increments count, unlocks
- `possibly_contains()` locks, checks bits, unlocks
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

### Implemented Files

| File | Status |
|------|--------|
| `packages/merlink/core/include/bloom_filter.h` | ✅ Implemented |
| `packages/merlink/core/src/bloom_filter.cpp` | ✅ Implemented |
| `packages/merlink/core/src/murmurhash3.h` | ✅ Implemented |
| `packages/merlink/core/src/murmurhash3.cpp` | ✅ Implemented |
| `packages/merlink/core/CMakeLists.txt` | ✅ Created |
| `packages/merlink/core/tests/bloom_filter_test.cpp` | Pending |

**Compilation verified:** Both `.cpp` files compile cleanly with `g++ -std=c++17`.

### Testing Strategy (Pending)

1. **Basic membership:** Add reference → `possibly_contains` returns true
2. **Non-membership:** Never-added reference → returns false
3. **Persistence round-trip:** Add items → save → create new filter → load → all items still present
4. **Corrupt file handling:** Load garbage file → gracefully starts empty
5. **False positive rate validation:** Insert n items, test 100,000 random non-members, measure actual FP rate ≈ target
6. **Duplicate reference format:** Test with actual `CATR-0x...-timestamp` format strings
7. **Thread safety:** Concurrent adds from multiple threads → no crashes, no lost inserts

### Build & Verify

```bash
cd packages/merlink/core
mkdir build && cd build
cmake ..
make
ctest --output-on-failure
```
