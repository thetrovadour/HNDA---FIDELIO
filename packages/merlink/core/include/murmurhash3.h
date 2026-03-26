#pragma once

// MurmurHash3 — public domain hash by Austin Appleby.
// 128-bit variant for x64 platforms.
// https://github.com/aappleby/smhasher

#include <cstdint>

namespace merlink {

/// Produce a 128-bit hash stored as two uint64_t values in `out`.
void murmurhash3_x64_128(const void* key, int len, uint32_t seed,
                         uint64_t out[2]);

} // namespace merlink
