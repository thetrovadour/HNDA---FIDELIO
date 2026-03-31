#include "vault_monitor.h"

#include <cassert>
#include <cstdio>
#include <string>

// ---------------------------------------------------------------------------
// Minimal test harness
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

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

static merlink::VaultState healthy_state() {
    return { .treasury_balance = 1'000'000.0,
             .reward_balance   =   250'000.0,
             .total_supply     = 1'250'000.0 };
}

// ---------------------------------------------------------------------------
// 1. Healthy state → no alert
// ---------------------------------------------------------------------------

TEST(test_healthy_no_alert) {
    merlink::VaultBackendStub stub;
    merlink::VaultMonitor     monitor(stub);

    auto state = healthy_state();
    auto alert = monitor.check_once(state, state);
    EXPECT_FALSE(alert.has_value());
}

// ---------------------------------------------------------------------------
// 2. Supply cap approaching (>90%) → CAP_APPROACHING alert
// ---------------------------------------------------------------------------

TEST(test_cap_approaching) {
    merlink::VaultBackendStub stub;
    merlink::VaultMonitor     monitor(stub);

    auto prev = healthy_state();
    merlink::VaultState curr = prev;
    curr.total_supply = 46'000'000.0; // 92% of 50M

    auto alert = monitor.check_once(curr, prev);
    EXPECT_TRUE(alert.has_value());
    EXPECT_TRUE(alert->type == merlink::AlertType::CAP_APPROACHING);
}

// ---------------------------------------------------------------------------
// 3. Supply exactly at 90% threshold → CAP_APPROACHING alert
// ---------------------------------------------------------------------------

TEST(test_cap_at_threshold) {
    merlink::VaultBackendStub stub;
    merlink::VaultMonitor     monitor(stub);

    auto prev = healthy_state();
    merlink::VaultState curr = prev;
    curr.total_supply = 45'000'000.0; // exactly 90%

    auto alert = monitor.check_once(curr, prev);
    EXPECT_TRUE(alert.has_value());
    EXPECT_TRUE(alert->type == merlink::AlertType::CAP_APPROACHING);
}

// ---------------------------------------------------------------------------
// 4. Supply below threshold → no cap alert
// ---------------------------------------------------------------------------

TEST(test_cap_below_threshold) {
    merlink::VaultBackendStub stub;
    merlink::VaultMonitor     monitor(stub);

    auto prev = healthy_state();
    merlink::VaultState curr = prev;
    curr.total_supply = 44'000'000.0; // 88% — below threshold

    auto alert = monitor.check_once(curr, prev);
    EXPECT_FALSE(alert.has_value());
}

// ---------------------------------------------------------------------------
// 5. Supply decreased → UNEXPECTED_BURN alert
// ---------------------------------------------------------------------------

TEST(test_unexpected_burn) {
    merlink::VaultBackendStub stub;
    merlink::VaultMonitor     monitor(stub);

    auto prev = healthy_state();
    merlink::VaultState curr = prev;
    curr.total_supply = prev.total_supply - 5000.0;

    auto alert = monitor.check_once(curr, prev);
    EXPECT_TRUE(alert.has_value());
    EXPECT_TRUE(alert->type == merlink::AlertType::UNEXPECTED_BURN);
}

// ---------------------------------------------------------------------------
// 6. Treasury balance drifts beyond 5% → BALANCE_DRIFT alert
// ---------------------------------------------------------------------------

TEST(test_treasury_drift) {
    merlink::VaultBackendStub stub;
    merlink::VaultMonitor     monitor(stub);

    auto prev = healthy_state();
    merlink::VaultState curr = prev;
    curr.treasury_balance = prev.treasury_balance * 0.90; // 10% drop

    auto alert = monitor.check_once(curr, prev);
    EXPECT_TRUE(alert.has_value());
    EXPECT_TRUE(alert->type == merlink::AlertType::BALANCE_DRIFT);
}

// ---------------------------------------------------------------------------
// 7. Reward pool drifts beyond 5% → BALANCE_DRIFT alert
// ---------------------------------------------------------------------------

TEST(test_reward_drift) {
    merlink::VaultBackendStub stub;
    merlink::VaultMonitor     monitor(stub);

    auto prev = healthy_state();
    merlink::VaultState curr = prev;
    curr.reward_balance = prev.reward_balance * 1.10; // 10% increase

    auto alert = monitor.check_once(curr, prev);
    EXPECT_TRUE(alert.has_value());
    EXPECT_TRUE(alert->type == merlink::AlertType::BALANCE_DRIFT);
}

// ---------------------------------------------------------------------------
// 8. Treasury drift within 5% → no alert
// ---------------------------------------------------------------------------

TEST(test_treasury_within_threshold) {
    merlink::VaultBackendStub stub;
    merlink::VaultMonitor     monitor(stub);

    auto prev = healthy_state();
    merlink::VaultState curr = prev;
    curr.treasury_balance = prev.treasury_balance * 0.97; // 3% drop — within threshold

    auto alert = monitor.check_once(curr, prev);
    EXPECT_FALSE(alert.has_value());
}

// ---------------------------------------------------------------------------
// 9. Supply increase (minting) → no alert
// ---------------------------------------------------------------------------

TEST(test_supply_increase_no_alert) {
    merlink::VaultBackendStub stub;
    merlink::VaultMonitor     monitor(stub);

    auto prev = healthy_state();
    merlink::VaultState curr = prev;
    curr.total_supply = prev.total_supply + 10'000.0;

    auto alert = monitor.check_once(curr, prev);
    EXPECT_FALSE(alert.has_value());
}

// ---------------------------------------------------------------------------
// 10. VaultBackendStub returns configured state
// ---------------------------------------------------------------------------

TEST(test_stub_backend_returns_state) {
    merlink::VaultBackendStub stub;
    merlink::VaultState       expected = healthy_state();
    stub.set_state(expected);

    auto result = stub.fetch();
    EXPECT_TRUE(result.has_value());
    EXPECT_TRUE(result->treasury_balance == expected.treasury_balance);
    EXPECT_TRUE(result->reward_balance   == expected.reward_balance);
    EXPECT_TRUE(result->total_supply     == expected.total_supply);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

int main() {
    setvbuf(stdout, nullptr, _IONBF, 0);
    printf("\n=== vault_monitor_test ===\n\n");

    RUN(test_healthy_no_alert);
    RUN(test_cap_approaching);
    RUN(test_cap_at_threshold);
    RUN(test_cap_below_threshold);
    RUN(test_unexpected_burn);
    RUN(test_treasury_drift);
    RUN(test_reward_drift);
    RUN(test_treasury_within_threshold);
    RUN(test_supply_increase_no_alert);
    RUN(test_stub_backend_returns_state);

    printf("\n=== %d/%d tests passed ===\n\n", tests_passed, tests_run);
    return (tests_passed == tests_run) ? 0 : 1;
}
