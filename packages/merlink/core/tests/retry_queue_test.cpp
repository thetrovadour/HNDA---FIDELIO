#include "retry_queue.h"

#include <atomic>
#include <cassert>
#include <chrono>
#include <cstdio>
#include <string>
#include <thread>
#include <vector>

// ---------------------------------------------------------------------------
// Minimal test harness (same pattern as bloom_filter_test)
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

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

static merlink::PaymentEvent make_event(const std::string& ref, double amount) {
    merlink::PaymentEvent e;
    e.reference_code  = ref;
    e.amount_lempiras = amount;
    e.client_wallet   = "0xTEST";
    e.source          = "email";
    e.received_at     = "2026-03-30T00:00:00Z";
    return e;
}

// ---------------------------------------------------------------------------
// 1. Empty queue reports correctly
// ---------------------------------------------------------------------------

TEST(test_empty_on_construction) {
    merlink::RetryQueue q;
    EXPECT_TRUE(q.empty());
    EXPECT_EQ(q.size(), 0u);
}

// ---------------------------------------------------------------------------
// 2. Push increases size; pop decreases it
// ---------------------------------------------------------------------------

TEST(test_push_pop_size) {
    merlink::RetryQueue q;
    q.push(make_event("CATR-0xA-1000", 100.0));
    q.push(make_event("CATR-0xB-1001", 200.0));
    EXPECT_EQ(q.size(), 2u);
    EXPECT_FALSE(q.empty());

    merlink::PaymentEvent out;
    EXPECT_TRUE(q.try_pop(out));
    EXPECT_EQ(q.size(), 1u);
    EXPECT_TRUE(q.try_pop(out));
    EXPECT_EQ(q.size(), 0u);
    EXPECT_TRUE(q.empty());
}

// ---------------------------------------------------------------------------
// 3. FIFO order is preserved
// ---------------------------------------------------------------------------

TEST(test_fifo_order) {
    merlink::RetryQueue q;
    q.push(make_event("CATR-0xA-1", 10.0));
    q.push(make_event("CATR-0xB-2", 20.0));
    q.push(make_event("CATR-0xC-3", 30.0));

    merlink::PaymentEvent out;
    q.try_pop(out); EXPECT_TRUE(out.reference_code == "CATR-0xA-1");
    q.try_pop(out); EXPECT_TRUE(out.reference_code == "CATR-0xB-2");
    q.try_pop(out); EXPECT_TRUE(out.reference_code == "CATR-0xC-3");
}

// ---------------------------------------------------------------------------
// 4. try_pop on empty queue returns false without blocking
// ---------------------------------------------------------------------------

TEST(test_try_pop_empty) {
    merlink::RetryQueue q;
    merlink::PaymentEvent out;
    EXPECT_FALSE(q.try_pop(out));
}

// ---------------------------------------------------------------------------
// 5. Blocking pop times out on empty queue
// ---------------------------------------------------------------------------

TEST(test_blocking_pop_timeout) {
    merlink::RetryQueue q;
    merlink::PaymentEvent out;
    auto start = std::chrono::steady_clock::now();
    bool got = q.pop(out, std::chrono::milliseconds(100));
    auto elapsed = std::chrono::steady_clock::now() - start;

    EXPECT_FALSE(got);
    // Should have waited at least ~80ms (allow OS scheduling slack)
    EXPECT_TRUE(elapsed >= std::chrono::milliseconds(80));
}

// ---------------------------------------------------------------------------
// 6. Blocking pop wakes up when producer pushes
// ---------------------------------------------------------------------------

TEST(test_blocking_pop_wakes_on_push) {
    merlink::RetryQueue q;
    merlink::PaymentEvent out;

    std::thread producer([&q]() {
        std::this_thread::sleep_for(std::chrono::milliseconds(50));
        q.push(make_event("CATR-0xWAKE-9999", 999.0));
    });

    bool got = q.pop(out, std::chrono::milliseconds(500));
    producer.join();

    EXPECT_TRUE(got);
    EXPECT_TRUE(out.reference_code == "CATR-0xWAKE-9999");
}

// ---------------------------------------------------------------------------
// 7. Payload fields are preserved through push/pop
// ---------------------------------------------------------------------------

TEST(test_payload_integrity) {
    merlink::RetryQueue q;
    merlink::PaymentEvent e = make_event("CATR-0xDEAD-1711800000", 750.50);
    e.client_wallet = "0xDEAD";
    e.source        = "email";
    e.received_at   = "2026-03-30T14:35:22Z";
    q.push(e);

    merlink::PaymentEvent out;
    EXPECT_TRUE(q.try_pop(out));
    EXPECT_TRUE(out.reference_code  == "CATR-0xDEAD-1711800000");
    EXPECT_TRUE(out.amount_lempiras == 750.50);
    EXPECT_TRUE(out.client_wallet   == "0xDEAD");
    EXPECT_TRUE(out.source          == "email");
    EXPECT_TRUE(out.received_at     == "2026-03-30T14:35:22Z");
}

// ---------------------------------------------------------------------------
// 8. Thread safety — multiple producers, multiple consumers
// ---------------------------------------------------------------------------

TEST(test_thread_safety) {
    merlink::RetryQueue q;
    const int N_PRODUCERS = 4;
    const int N_CONSUMERS = 4;
    const int OPS_EACH    = 250;
    const int TOTAL       = N_PRODUCERS * OPS_EACH;

    std::atomic<int> produced{0};
    std::atomic<int> consumed{0};

    std::vector<std::thread> producers;
    for (int t = 0; t < N_PRODUCERS; ++t) {
        producers.emplace_back([&q, &produced, t]() {
            for (int i = 0; i < OPS_EACH; ++i) {
                q.push(make_event(
                    "CATR-0xP" + std::to_string(t) + "-" + std::to_string(i),
                    static_cast<double>(i)));
                ++produced;
            }
        });
    }

    std::vector<std::thread> consumers;
    for (int t = 0; t < N_CONSUMERS; ++t) {
        consumers.emplace_back([&q, &consumed]() {
            merlink::PaymentEvent out;
            int local = 0;
            while (local < OPS_EACH) {
                if (q.pop(out, std::chrono::milliseconds(200))) {
                    ++consumed;
                    ++local;
                }
            }
        });
    }

    for (auto& p : producers) p.join();
    for (auto& c : consumers) c.join();

    EXPECT_EQ(produced.load(), TOTAL);
    EXPECT_EQ(consumed.load(), TOTAL);
    EXPECT_TRUE(q.empty());
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

int main() {
    printf("\n=== retry_queue_test ===\n\n");

    RUN(test_empty_on_construction);
    RUN(test_push_pop_size);
    RUN(test_fifo_order);
    RUN(test_try_pop_empty);
    RUN(test_blocking_pop_timeout);
    RUN(test_blocking_pop_wakes_on_push);
    RUN(test_payload_integrity);
    RUN(test_thread_safety);

    printf("\n=== %d/%d tests passed ===\n\n", tests_passed, tests_run);
    return (tests_passed == tests_run) ? 0 : 1;
}
