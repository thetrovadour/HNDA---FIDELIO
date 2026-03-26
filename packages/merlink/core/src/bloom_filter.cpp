#include "bloom_filter.h"
#include "murmurhash3.h"

#include <algorithm>
#include <cmath>
#include <cstdio>
#include <cstring>
#include <fstream>
#include <numeric>

namespace merlink {

// ---------- File format constants ----------------------------------------

static constexpr char MAGIC[8] = {'M','R','L','K','B','L','M','\0'};
static constexpr uint32_t MURMUR_SEED = 0xF1DE0001; // FIDELIO-flavored seed

// Simple CRC32 (IEEE polynomial) for persistence integrity checks.
namespace {

uint32_t crc32_update(uint32_t crc, const void* buf, size_t len) {
    auto* p = static_cast<const uint8_t*>(buf);
    crc = ~crc;
    for (size_t i = 0; i < len; ++i) {
        crc ^= p[i];
        for (int j = 0; j < 8; ++j) {
            crc = (crc >> 1) ^ (0xEDB88320 & (-(crc & 1)));
        }
    }
    return ~crc;
}

} // anonymous namespace

// ---------- Optimal parameter calculations --------------------------------

uint64_t BloomFilter::optimal_m(uint64_t n, double p) {
    // m = -(n * ln(p)) / (ln(2))^2
    if (n == 0) return 64; // minimum sensible size
    double m = -(static_cast<double>(n) * std::log(p)) / (std::log(2.0) * std::log(2.0));
    return std::max(static_cast<uint64_t>(std::ceil(m)), uint64_t{64});
}

uint32_t BloomFilter::optimal_k(uint64_t m, uint64_t n) {
    // k = (m/n) * ln(2)
    if (n == 0) return 1;
    double k = (static_cast<double>(m) / static_cast<double>(n)) * std::log(2.0);
    return std::max(static_cast<uint32_t>(std::round(k)), uint32_t{1});
}

// ---------- Construction -------------------------------------------------

BloomFilter::BloomFilter(uint64_t expected_elements, double false_positive_rate)
    : m_(optimal_m(expected_elements, false_positive_rate))
    , k_(optimal_k(m_, expected_elements))
    , count_(0) {
    // Allocate byte vector large enough to hold m_ bits
    bits_.resize((m_ + 7) / 8, 0);
}

// ---------- Core operations ----------------------------------------------

void BloomFilter::add(const std::string& reference) {
    auto [h1, h2] = hash(reference);
    std::lock_guard<std::mutex> lock(mutex_);
    for (uint32_t i = 0; i < k_; ++i) {
        uint64_t pos = (h1 + static_cast<uint64_t>(i) * h2) % m_;
        set_bit(pos);
    }
    ++count_;
}

bool BloomFilter::possibly_contains(const std::string& reference) const {
    auto [h1, h2] = hash(reference);
    std::lock_guard<std::mutex> lock(mutex_);
    for (uint32_t i = 0; i < k_; ++i) {
        uint64_t pos = (h1 + static_cast<uint64_t>(i) * h2) % m_;
        if (!get_bit(pos)) {
            return false; // Definitely not in the set
        }
    }
    return true; // Probably in the set
}

// ---------- Bit manipulation ---------------------------------------------

void BloomFilter::set_bit(uint64_t index) {
    bits_[index / 8] |= (1u << (index % 8));
}

bool BloomFilter::get_bit(uint64_t index) const {
    return (bits_[index / 8] & (1u << (index % 8))) != 0;
}

// ---------- Hashing (Kirsch-Mitzenmacher via MurmurHash3-128) ------------

std::pair<uint64_t, uint64_t> BloomFilter::hash(const std::string& data) const {
    uint64_t out[2];
    murmurhash3_x64_128(data.data(), static_cast<int>(data.size()),
                        MURMUR_SEED, out);
    return {out[0], out[1]};
}

// ---------- Persistence --------------------------------------------------

bool BloomFilter::save(const std::string& filepath) const {
    std::lock_guard<std::mutex> lock(mutex_);

    // Write to a temporary file, then rename for atomicity
    std::string tmp_path = filepath + ".tmp";
    std::ofstream out(tmp_path, std::ios::binary);
    if (!out) return false;

    uint32_t crc = 0;

    // Magic
    out.write(MAGIC, 8);
    crc = crc32_update(crc, MAGIC, 8);

    // m (bit count)
    out.write(reinterpret_cast<const char*>(&m_), 8);
    crc = crc32_update(crc, &m_, 8);

    // k (hash count)
    out.write(reinterpret_cast<const char*>(&k_), 4);
    crc = crc32_update(crc, &k_, 4);

    // count (elements inserted)
    out.write(reinterpret_cast<const char*>(&count_), 8);
    crc = crc32_update(crc, &count_, 8);

    // Bit array
    out.write(reinterpret_cast<const char*>(bits_.data()),
              static_cast<std::streamsize>(bits_.size()));
    crc = crc32_update(crc, bits_.data(), bits_.size());

    // CRC32 checksum
    out.write(reinterpret_cast<const char*>(&crc), 4);

    out.close();
    if (!out) {
        std::remove(tmp_path.c_str());
        return false;
    }

    // Atomic rename
    if (std::rename(tmp_path.c_str(), filepath.c_str()) != 0) {
        std::remove(tmp_path.c_str());
        return false;
    }

    return true;
}

bool BloomFilter::load(const std::string& filepath) {
    std::lock_guard<std::mutex> lock(mutex_);

    std::ifstream in(filepath, std::ios::binary);
    if (!in) return false;

    uint32_t crc = 0;

    // Read and verify magic
    char magic[8];
    in.read(magic, 8);
    if (!in || std::memcmp(magic, MAGIC, 8) != 0) return false;
    crc = crc32_update(crc, magic, 8);

    // Read parameters
    uint64_t m;
    uint32_t k;
    uint64_t count;

    in.read(reinterpret_cast<char*>(&m), 8);
    if (!in) return false;
    crc = crc32_update(crc, &m, 8);

    in.read(reinterpret_cast<char*>(&k), 4);
    if (!in) return false;
    crc = crc32_update(crc, &k, 4);

    in.read(reinterpret_cast<char*>(&count), 8);
    if (!in) return false;
    crc = crc32_update(crc, &count, 8);

    // Read bit array
    size_t byte_count = (m + 7) / 8;
    std::vector<uint8_t> bits(byte_count);
    in.read(reinterpret_cast<char*>(bits.data()),
            static_cast<std::streamsize>(byte_count));
    if (!in) return false;
    crc = crc32_update(crc, bits.data(), byte_count);

    // Read and verify checksum
    uint32_t stored_crc;
    in.read(reinterpret_cast<char*>(&stored_crc), 4);
    if (!in || stored_crc != crc) return false;

    // All checks passed — commit the loaded state
    m_ = m;
    k_ = k;
    count_ = count;
    bits_ = std::move(bits);

    return true;
}

// ---------- Stats --------------------------------------------------------

uint64_t BloomFilter::bit_count() const {
    std::lock_guard<std::mutex> lock(mutex_);
    return m_;
}

uint32_t BloomFilter::hash_count() const {
    std::lock_guard<std::mutex> lock(mutex_);
    return k_;
}

uint64_t BloomFilter::element_count() const {
    std::lock_guard<std::mutex> lock(mutex_);
    return count_;
}

double BloomFilter::current_false_positive_rate() const {
    std::lock_guard<std::mutex> lock(mutex_);
    if (count_ == 0) return 0.0;
    // (1 - e^(-kn/m))^k
    double exponent = -(static_cast<double>(k_) * static_cast<double>(count_))
                      / static_cast<double>(m_);
    return std::pow(1.0 - std::exp(exponent), static_cast<double>(k_));
}

} // namespace merlink
