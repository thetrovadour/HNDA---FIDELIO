#pragma once

#include <cstdint>
#include <mutex>
#include <string>
#include <vector>

namespace merlink {

/// Probabilistic duplicate-prevention filter for FIDELIO reference codes.
///
/// Guarantees: no false negatives (if add() was called, possibly_contains()
/// always returns true). False positives are handled by falling back to
/// the PostgreSQL processed_references table.
///
/// Thread-safe — all public methods are internally synchronized.
class BloomFilter {
public:
    /// Construct a filter sized for `expected_elements` at the given
    /// `false_positive_rate`. Automatically computes optimal bit array
    /// size (m) and hash function count (k).
    explicit BloomFilter(uint64_t expected_elements,
                         double false_positive_rate = 0.01);

    /// Insert a reference code into the filter.
    void add(const std::string& reference);

    /// Check whether a reference code has possibly been seen before.
    /// - Returns false: DEFINITELY not in the set (safe to mint).
    /// - Returns true:  PROBABLY in the set (check PostgreSQL to confirm).
    bool possibly_contains(const std::string& reference) const;

    /// Persist the bit array to disk. Writes atomically via tmp+rename.
    /// Returns true on success.
    bool save(const std::string& filepath) const;

    /// Load a previously saved bit array from disk.
    /// On failure (missing/corrupt file), the filter remains empty — safe
    /// because an empty filter produces no false negatives.
    /// Returns true on success.
    bool load(const std::string& filepath);

    // --- Stats -----------------------------------------------------------

    /// Total bits in the bit array (m).
    uint64_t bit_count() const;

    /// Number of hash functions (k).
    uint32_t hash_count() const;

    /// Number of elements inserted so far.
    uint64_t element_count() const;

    /// Estimated current false positive probability given elements inserted.
    double current_false_positive_rate() const;

private:
    std::vector<uint8_t> bits_;   // Bit array stored as bytes
    uint64_t m_;                  // Total number of bits
    uint32_t k_;                  // Number of hash functions
    uint64_t count_;              // Elements inserted
    mutable std::mutex mutex_;    // Guards bits_ and count_

    // Kirsch-Mitzenmacher double-hashing: derives k positions from two
    // 64-bit base hashes produced by MurmurHash3-128.
    //   position_i = (h1 + i * h2) % m,  for i in [0, k)
    std::pair<uint64_t, uint64_t> hash(const std::string& data) const;

    void set_bit(uint64_t index);
    bool get_bit(uint64_t index) const;

    // Optimal parameter calculation
    static uint64_t optimal_m(uint64_t n, double p);
    static uint32_t optimal_k(uint64_t m, uint64_t n);
};

} // namespace merlink
