#include "webhook_receiver.h"

#include <cassert>
#include <cstdio>
#include <string>

// ---------------------------------------------------------------------------
// Minimal test harness (mirrors email_parser_test style)
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
// Valid BAC Credomatic mock payload
// ---------------------------------------------------------------------------

static const std::string VALID_BODY =
    "{\n"
    "  \"reference_code\":  \"CATR-0xABCD1234-1711800000\",\n"
    "  \"amount_lempiras\": 500.00,\n"
    "  \"client_wallet\":   \"0xABCD1234\"\n"
    "}";

// ---------------------------------------------------------------------------
// 1. Valid payload parses correctly
// ---------------------------------------------------------------------------

TEST(test_valid_payload) {
    auto result = merlink::WebhookReceiver::parse_body(VALID_BODY);
    EXPECT_TRUE(result.has_value());
    EXPECT_TRUE(result->reference_code  == "CATR-0xABCD1234-1711800000");
    EXPECT_TRUE(result->amount_lempiras == 500.00);
    EXPECT_TRUE(result->client_wallet   == "0xABCD1234");
    EXPECT_TRUE(result->source          == "webhook");
    EXPECT_FALSE(result->received_at.empty());
}

// ---------------------------------------------------------------------------
// 2. Missing reference_code → nullopt
// ---------------------------------------------------------------------------

TEST(test_missing_reference_code) {
    std::string body =
        "{ \"amount_lempiras\": 500.00, \"client_wallet\": \"0xABCD1234\" }";
    EXPECT_FALSE(merlink::WebhookReceiver::parse_body(body).has_value());
}

// ---------------------------------------------------------------------------
// 3. Missing amount_lempiras → nullopt
// ---------------------------------------------------------------------------

TEST(test_missing_amount) {
    std::string body =
        "{ \"reference_code\": \"CATR-0xABCD1234-1711800000\", "
        "\"client_wallet\": \"0xABCD1234\" }";
    EXPECT_FALSE(merlink::WebhookReceiver::parse_body(body).has_value());
}

// ---------------------------------------------------------------------------
// 4. Zero amount → nullopt
// ---------------------------------------------------------------------------

TEST(test_zero_amount) {
    std::string body =
        "{ \"reference_code\": \"CATR-0xABCD1234-1711800000\", "
        "\"amount_lempiras\": 0.00, \"client_wallet\": \"0xABCD1234\" }";
    EXPECT_FALSE(merlink::WebhookReceiver::parse_body(body).has_value());
}

// ---------------------------------------------------------------------------
// 5. Negative amount → nullopt
// ---------------------------------------------------------------------------

TEST(test_negative_amount) {
    std::string body =
        "{ \"reference_code\": \"CATR-0xABCD1234-1711800000\", "
        "\"amount_lempiras\": -100.00, \"client_wallet\": \"0xABCD1234\" }";
    EXPECT_FALSE(merlink::WebhookReceiver::parse_body(body).has_value());
}

// ---------------------------------------------------------------------------
// 6. Reference missing CATR- prefix → nullopt
// ---------------------------------------------------------------------------

TEST(test_invalid_reference_prefix) {
    std::string body =
        "{ \"reference_code\": \"XREF-0xABCD1234-1711800000\", "
        "\"amount_lempiras\": 500.00, \"client_wallet\": \"0xABCD1234\" }";
    EXPECT_FALSE(merlink::WebhookReceiver::parse_body(body).has_value());
}

// ---------------------------------------------------------------------------
// 7. Reference missing timestamp segment → nullopt
// ---------------------------------------------------------------------------

TEST(test_reference_missing_timestamp) {
    std::string body =
        "{ \"reference_code\": \"CATR-0xABCD1234\", "
        "\"amount_lempiras\": 500.00, \"client_wallet\": \"0xABCD1234\" }";
    EXPECT_FALSE(merlink::WebhookReceiver::parse_body(body).has_value());
}

// ---------------------------------------------------------------------------
// 8. Reference missing wallet segment → nullopt
// ---------------------------------------------------------------------------

TEST(test_reference_missing_wallet) {
    std::string body =
        "{ \"reference_code\": \"CATR--1711800000\", "
        "\"amount_lempiras\": 500.00, \"client_wallet\": \"0xABCD1234\" }";
    EXPECT_FALSE(merlink::WebhookReceiver::parse_body(body).has_value());
}

// ---------------------------------------------------------------------------
// 9. Wallet extracted correctly from reference_code
// ---------------------------------------------------------------------------

TEST(test_wallet_extraction) {
    std::string body =
        "{ \"reference_code\": \"CATR-0xDEADBEEF-1711999999\", "
        "\"amount_lempiras\": 1250.75, \"client_wallet\": \"0xDEADBEEF\" }";
    auto result = merlink::WebhookReceiver::parse_body(body);
    EXPECT_TRUE(result.has_value());
    EXPECT_TRUE(result->client_wallet   == "0xDEADBEEF");
    EXPECT_TRUE(result->amount_lempiras == 1250.75);
}

// ---------------------------------------------------------------------------
// 10. Source is always "webhook"
// ---------------------------------------------------------------------------

TEST(test_source_is_webhook) {
    auto result = merlink::WebhookReceiver::parse_body(VALID_BODY);
    EXPECT_TRUE(result.has_value());
    EXPECT_TRUE(result->source == "webhook");
}

// ---------------------------------------------------------------------------
// 11. received_at is a valid ISO 8601 UTC string
// ---------------------------------------------------------------------------

TEST(test_received_at_format) {
    auto result = merlink::WebhookReceiver::parse_body(VALID_BODY);
    EXPECT_TRUE(result.has_value());
    EXPECT_TRUE(result->received_at.size() >= 20);
    EXPECT_TRUE(result->received_at.find('T') != std::string::npos);
    EXPECT_TRUE(result->received_at.back() == 'Z');
}

// ---------------------------------------------------------------------------
// 12. Empty body → nullopt
// ---------------------------------------------------------------------------

TEST(test_empty_body) {
    EXPECT_FALSE(merlink::WebhookReceiver::parse_body("").has_value());
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

int main() {
    setvbuf(stdout, nullptr, _IONBF, 0);
    printf("\n=== webhook_receiver_test ===\n\n");

    RUN(test_valid_payload);
    RUN(test_missing_reference_code);
    RUN(test_missing_amount);
    RUN(test_zero_amount);
    RUN(test_negative_amount);
    RUN(test_invalid_reference_prefix);
    RUN(test_reference_missing_timestamp);
    RUN(test_reference_missing_wallet);
    RUN(test_wallet_extraction);
    RUN(test_source_is_webhook);
    RUN(test_received_at_format);
    RUN(test_empty_body);

    printf("\n=== %d/%d tests passed ===\n\n", tests_passed, tests_run);
    return (tests_passed == tests_run) ? 0 : 1;
}
