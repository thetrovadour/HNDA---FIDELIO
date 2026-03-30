#include "bloom_filter.h"

#include <cassert>
#include <cstdio>
#include <string>
#include <thread>
#include <vector>
#include <atomic>
#include <cmath>

// ---------------------------------------------------------------------------
// Minimal test harness (no external dependencies)
// ---------------------------------------------------------------------------

static int tests_run    = 0;
static int tests_passed = 0;

#define TEST(name) static void name()
#define RUN(name)  do { \
    ++tests_run; \
    printf("  [ RUN ] %s\n", #name); \
    name(); \
    ++tests_passed; \
    printf("  [ OK  ] %s\n", #name); \
} while(0)

#define EXPECT_TRUE(expr) \
    do { if (!(expr)) { \
        printf("  [FAIL] %s:%d — expected true: %s\n", __FILE__, __LINE__, #expr); \
        std::abort(); \
    }} while(0)

#define EXPECT_FALSE(expr) EXPECT_TRUE(!(expr))
#define EXPECT_EQ(a,b)     EXPECT_TRUE((a) == (b))
#define EXPECT_LE(a,b)     EXPECT_TRUE((a) <= (b))
#define EXPECT_GE(a,b)     EXPECT_TRUE((a) >= (b))

// ---------------------------------------------------------------------------
// 1. Correctness — added elements are always found
// ---------------------------------------------------------------------------

TEST(test_no_false_negatives) {
    merlink::BloomFilter bf(1000, 0.01);

    std::vector<std::string> refs;
    for (int i = 0; i < 500; ++i) {
        refs.push_back("CATR-wallet-" + std::to_string(i));
    }

    for (auto& r : refs) bf.add(r);
    for (auto& r : refs) {
        EXPECT_TRUE(bf.possibly_contains(r));
    }
}

// ---------------------------------------------------------------------------
// 2. Correctness — unknown elements are mostly not found (very low FPR)
// ---------------------------------------------------------------------------

TEST(test_false_positive_rate) {
    // Size for 10 000 elements at 1% FPR
    const uint64_t N = 10000;
    merlink::BloomFilter bf(N, 0.01);

    for (uint64_t i = 0; i < N; ++i) {
        bf.add("known-" + std::to_string(i));
    }

    int false_positives = 0;
    const int probes = 10000;
    for (int i = 0; i < probes; ++i) {
        // These keys were never added
        if (bf.possibly_contains("unknown-" + std::to_string(i))) {
            ++false_positives;
        }
    }

    double measured_fpr = static_cast<double>(false_positives) / probes;
    // Allow 2× headroom over theoretical 1% target
    EXPECT_LE(measured_fpr, 0.02);
}

// ---------------------------------------------------------------------------
// 3. Stats — element count and estimated FPR
// ---------------------------------------------------------------------------

TEST(test_stats) {
    merlink::BloomFilter bf(1000, 0.01);

    EXPECT_EQ(bf.element_count(), 0u);
    EXPECT_EQ(bf.current_false_positive_rate(), 0.0);

    for (int i = 0; i < 100; ++i) {
        bf.add("ref-" + std::to_string(i));
    }

    EXPECT_EQ(bf.element_count(), 100u);
    EXPECT_GE(bf.bit_count(),   0u);
    EXPECT_GE(bf.hash_count(),  1u);

    double fpr = bf.current_false_positive_rate();
    EXPECT_GE(fpr, 0.0);
    EXPECT_LE(fpr, 0.01); // well under capacity
}

// ---------------------------------------------------------------------------
// 4. Persistence — save/load round-trip
// ---------------------------------------------------------------------------

TEST(test_save_load_roundtrip) {
    const std::string path = "/tmp/bloom_filter_test.bin";

    merlink::BloomFilter bf1(500, 0.01);
    std::vector<std::string> refs;
    for (int i = 0; i < 200; ++i) {
        refs.push_back("CATR-" + std::to_string(i) + "-ref");
        bf1.add(refs.back());
    }

    EXPECT_TRUE(bf1.save(path));

    merlink::BloomFilter bf2(1, 0.5); // different params — will be overwritten by load
    EXPECT_TRUE(bf2.load(path));

    // All elements from bf1 must be found in bf2
    for (auto& r : refs) {
        EXPECT_TRUE(bf2.possibly_contains(r));
    }

    // Metadata must match
    EXPECT_EQ(bf1.bit_count(),     bf2.bit_count());
    EXPECT_EQ(bf1.hash_count(),    bf2.hash_count());
    EXPECT_EQ(bf1.element_count(), bf2.element_count());

    std::remove(path.c_str());
}

// ---------------------------------------------------------------------------
// 5. Persistence — corrupt file is rejected, filter stays empty
// ---------------------------------------------------------------------------

TEST(test_load_corrupt_file) {
    const std::string path = "/tmp/bloom_filter_corrupt.bin";

    // Write garbage
    {
        std::FILE* f = std::fopen(path.c_str(), "wb");
        const char garbage[] = "not-a-valid-bloom-filter-file!!";
        std::fwrite(garbage, 1, sizeof(garbage) - 1, f);
        std::fclose(f);
    }

    merlink::BloomFilter bf(100, 0.01);
    EXPECT_FALSE(bf.load(path));
    EXPECT_EQ(bf.element_count(), 0u);

    std::remove(path.c_str());
}

// ---------------------------------------------------------------------------
// 6. Persistence — missing file returns false, filter stays empty
// ---------------------------------------------------------------------------

TEST(test_load_missing_file) {
    merlink::BloomFilter bf(100, 0.01);
    EXPECT_FALSE(bf.load("/tmp/does_not_exist_merlink.bin"));
    EXPECT_EQ(bf.element_count(), 0u);
}

// ---------------------------------------------------------------------------
// 7. Edge case — single element
// ---------------------------------------------------------------------------

TEST(test_single_element) {
    merlink::BloomFilter bf(1, 0.01);
    const std::string ref = "CATR-0x1234-1711800000";
    EXPECT_FALSE(bf.possibly_contains(ref));
    bf.add(ref);
    EXPECT_TRUE(bf.possibly_contains(ref));
}

// ---------------------------------------------------------------------------
// 8. Edge case — empty filter reports nothing
// ---------------------------------------------------------------------------

TEST(test_empty_filter) {
    merlink::BloomFilter bf(1000, 0.01);
    EXPECT_FALSE(bf.possibly_contains("CATR-anything"));
    EXPECT_EQ(bf.element_count(), 0u);
}

// ---------------------------------------------------------------------------
// 9. Thread safety — concurrent adds and queries don't crash or corrupt
// ---------------------------------------------------------------------------

TEST(test_thread_safety) {
    merlink::BloomFilter bf(50000, 0.01);

    const int N_THREADS  = 8;
    const int OPS_EACH   = 500;

    std::vector<std::thread> writers;
    for (int t = 0; t < N_THREADS; ++t) {
        writers.emplace_back([&bf, t]() {
            for (int i = 0; i < OPS_EACH; ++i) {
                bf.add("thread-" + std::to_string(t) + "-ref-" + std::to_string(i));
            }
        });
    }

    // Concurrent readers while writers are running
    std::atomic<int> reader_crashes{0};
    std::vector<std::thread> readers;
    for (int t = 0; t < N_THREADS; ++t) {
        readers.emplace_back([&bf, &reader_crashes, t]() {
            for (int i = 0; i < OPS_EACH; ++i) {
                try {
                    bf.possibly_contains("thread-" + std::to_string(t) +
                                         "-ref-" + std::to_string(i));
                } catch (...) {
                    ++reader_crashes;
                }
            }
        });
    }

    for (auto& w : writers) w.join();
    for (auto& r : readers) r.join();

    EXPECT_EQ(reader_crashes.load(), 0);
    EXPECT_EQ(bf.element_count(), static_cast<uint64_t>(N_THREADS * OPS_EACH));
}

// ---------------------------------------------------------------------------
// 10. FIDELIO reference format — realistic payment reference codes
// ---------------------------------------------------------------------------

TEST(test_fidelio_reference_codes) {
    merlink::BloomFilter bf(10000, 0.01);

    // Simulate 100 realistic CATR references
    std::vector<std::string> seen;
    for (int i = 0; i < 100; ++i) {
        std::string ref = "CATR-0xABCD" + std::to_string(i) + "-171180000" + std::to_string(i);
        seen.push_back(ref);
        bf.add(ref);
    }

    // All seen references must return true
    for (auto& r : seen) {
        EXPECT_TRUE(bf.possibly_contains(r));
    }

    // References that were never added should mostly return false
    int fp = 0;
    for (int i = 100; i < 200; ++i) {
        std::string ref = "CATR-0xABCD" + std::to_string(i) + "-171180000" + std::to_string(i);
        if (bf.possibly_contains(ref)) ++fp;
    }
    // With only 100 elements in a 10 000-capacity filter, FPR should be near 0
    EXPECT_LE(fp, 2);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

int main() {
    printf("\n=== bloom_filter_test ===\n\n");

    RUN(test_no_false_negatives);
    RUN(test_false_positive_rate);
    RUN(test_stats);
    RUN(test_save_load_roundtrip);
    RUN(test_load_corrupt_file);
    RUN(test_load_missing_file);
    RUN(test_single_element);
    RUN(test_empty_filter);
    RUN(test_thread_safety);
    RUN(test_fidelio_reference_codes);

    printf("\n=== %d/%d tests passed ===\n\n", tests_passed, tests_run);
    return (tests_passed == tests_run) ? 0 : 1;
}
