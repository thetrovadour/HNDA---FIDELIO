#include "nfc_reader.h"
#include "retry_queue.h"

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

// ---------------------------------------------------------------------------
// Valid NFC payload
// ---------------------------------------------------------------------------

static const std::string VALID_PAYLOAD = "CATR-0xABCD1234-1711800000|500.00";

// ---------------------------------------------------------------------------
// 1. Valid payload parses correctly
// ---------------------------------------------------------------------------

TEST(test_valid_payload) {
    auto result = merlink::NfcReader::parse_payload(VALID_PAYLOAD);
    EXPECT_TRUE(result.has_value());
    EXPECT_TRUE(result->reference_code  == "CATR-0xABCD1234-1711800000");
    EXPECT_TRUE(result->amount_lempiras == 500.00);
    EXPECT_TRUE(result->client_wallet   == "0xABCD1234");
    EXPECT_TRUE(result->source          == "nfc");
    EXPECT_FALSE(result->received_at.empty());
}

// ---------------------------------------------------------------------------
// 2. Missing pipe separator → nullopt
// ---------------------------------------------------------------------------

TEST(test_missing_pipe) {
    EXPECT_FALSE(merlink::NfcReader::parse_payload("CATR-0xABCD1234-1711800000 500.00").has_value());
}

// ---------------------------------------------------------------------------
// 3. Empty payload → nullopt
// ---------------------------------------------------------------------------

TEST(test_empty_payload) {
    EXPECT_FALSE(merlink::NfcReader::parse_payload("").has_value());
}

// ---------------------------------------------------------------------------
// 4. Zero amount → nullopt
// ---------------------------------------------------------------------------

TEST(test_zero_amount) {
    EXPECT_FALSE(merlink::NfcReader::parse_payload("CATR-0xABCD1234-1711800000|0.00").has_value());
}

// ---------------------------------------------------------------------------
// 5. Negative amount → nullopt
// ---------------------------------------------------------------------------

TEST(test_negative_amount) {
    EXPECT_FALSE(merlink::NfcReader::parse_payload("CATR-0xABCD1234-1711800000|-100.00").has_value());
}

// ---------------------------------------------------------------------------
// 6. Invalid reference prefix → nullopt
// ---------------------------------------------------------------------------

TEST(test_invalid_reference_prefix) {
    EXPECT_FALSE(merlink::NfcReader::parse_payload("XREF-0xABCD1234-1711800000|500.00").has_value());
}

// ---------------------------------------------------------------------------
// 7. Reference missing timestamp segment → nullopt
// ---------------------------------------------------------------------------

TEST(test_reference_missing_timestamp) {
    EXPECT_FALSE(merlink::NfcReader::parse_payload("CATR-0xABCD1234|500.00").has_value());
}

// ---------------------------------------------------------------------------
// 8. Reference missing wallet segment → nullopt
// ---------------------------------------------------------------------------

TEST(test_reference_missing_wallet) {
    EXPECT_FALSE(merlink::NfcReader::parse_payload("CATR--1711800000|500.00").has_value());
}

// ---------------------------------------------------------------------------
// 9. Wallet correctly extracted from reference
// ---------------------------------------------------------------------------

TEST(test_wallet_extraction) {
    auto result = merlink::NfcReader::parse_payload("CATR-0xDEADBEEF-1711999999|1250.75");
    EXPECT_TRUE(result.has_value());
    EXPECT_TRUE(result->client_wallet   == "0xDEADBEEF");
    EXPECT_TRUE(result->amount_lempiras == 1250.75);
}

// ---------------------------------------------------------------------------
// 10. Source is always "nfc"
// ---------------------------------------------------------------------------

TEST(test_source_is_nfc) {
    auto result = merlink::NfcReader::parse_payload(VALID_PAYLOAD);
    EXPECT_TRUE(result.has_value());
    EXPECT_TRUE(result->source == "nfc");
}

// ---------------------------------------------------------------------------
// 11. received_at is a valid ISO 8601 UTC string
// ---------------------------------------------------------------------------

TEST(test_received_at_format) {
    auto result = merlink::NfcReader::parse_payload(VALID_PAYLOAD);
    EXPECT_TRUE(result.has_value());
    EXPECT_TRUE(result->received_at.size() >= 20);
    EXPECT_TRUE(result->received_at.find('T') != std::string::npos);
    EXPECT_TRUE(result->received_at.back() == 'Z');
}

// ---------------------------------------------------------------------------
// 12. Non-numeric amount → nullopt
// ---------------------------------------------------------------------------

TEST(test_non_numeric_amount) {
    EXPECT_FALSE(merlink::NfcReader::parse_payload("CATR-0xABCD1234-1711800000|abc").has_value());
}

// ---------------------------------------------------------------------------
// 13. Mock hardware injects tap → NfcReader pushes PaymentEvent to queue
// ---------------------------------------------------------------------------

TEST(test_mock_hardware_end_to_end) {
    merlink::RetryQueue      queue;
    merlink::NfcHardwareMock mock;
    merlink::NfcReader       reader(mock, queue);

    reader.start();
    mock.inject(VALID_PAYLOAD);

    // Give the reader thread time to process
    merlink::PaymentEvent event{};
    bool got = queue.pop(event, std::chrono::milliseconds(500));
    reader.stop();

    EXPECT_TRUE(got);
    EXPECT_TRUE(event.reference_code  == "CATR-0xABCD1234-1711800000");
    EXPECT_TRUE(event.amount_lempiras == 500.00);
    EXPECT_TRUE(event.source          == "nfc");
}

// ---------------------------------------------------------------------------
// 14. Malformed tap is silently dropped — queue remains empty
// ---------------------------------------------------------------------------

TEST(test_malformed_tap_dropped) {
    merlink::RetryQueue      queue;
    merlink::NfcHardwareMock mock;
    merlink::NfcReader       reader(mock, queue);

    reader.start();
    mock.inject("GARBAGE_PAYLOAD");

    // Queue should stay empty — bad tap is discarded
    merlink::PaymentEvent event{};
    bool got = queue.pop(event, std::chrono::milliseconds(200));
    reader.stop();

    EXPECT_FALSE(got);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

int main() {
    setvbuf(stdout, nullptr, _IONBF, 0);
    printf("\n=== nfc_reader_test ===\n\n");

    RUN(test_valid_payload);
    RUN(test_missing_pipe);
    RUN(test_empty_payload);
    RUN(test_zero_amount);
    RUN(test_negative_amount);
    RUN(test_invalid_reference_prefix);
    RUN(test_reference_missing_timestamp);
    RUN(test_reference_missing_wallet);
    RUN(test_wallet_extraction);
    RUN(test_source_is_nfc);
    RUN(test_received_at_format);
    RUN(test_non_numeric_amount);
    RUN(test_mock_hardware_end_to_end);
    RUN(test_malformed_tap_dropped);

    printf("\n=== %d/%d tests passed ===\n\n", tests_passed, tests_run);
    return (tests_passed == tests_run) ? 0 : 1;
}
