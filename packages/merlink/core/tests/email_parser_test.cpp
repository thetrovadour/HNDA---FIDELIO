#include "email_parser.h"

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
#define EXPECT_EQ(a,b)     EXPECT_TRUE((a) == (b))

// ---------------------------------------------------------------------------
// Realistic Atlántida mock email body
// ---------------------------------------------------------------------------

static const std::string VALID_BODY =
    "Estimado HNDA,\n"
    "\n"
    "Banco Atlántida le informa que ha recibido la siguiente transferencia:\n"
    "\n"
    "Monto recibido: L. 500.00\n"
    "Referencia de pago: CATR-0xABCD1234-1711800000\n"
    "Nombre del ordenante: Juan Carlos Pérez\n"
    "Fecha: 30/03/2026 14:35:22\n"
    "\n"
    "Este es un mensaje automático. No responda a este correo.\n";

// ---------------------------------------------------------------------------
// 1. Valid email body parses correctly
// ---------------------------------------------------------------------------

TEST(test_valid_body_parses) {
    auto result = merlink::EmailParser::parse_body(VALID_BODY);
    EXPECT_TRUE(result.has_value());
    EXPECT_TRUE(result->reference_code  == "CATR-0xABCD1234-1711800000");
    EXPECT_TRUE(result->amount_lempiras == 500.00);
    EXPECT_TRUE(result->client_wallet   == "0xABCD1234");
    EXPECT_TRUE(result->source          == "email");
    EXPECT_FALSE(result->received_at.empty());
}

// ---------------------------------------------------------------------------
// 2. Missing amount line → nullopt
// ---------------------------------------------------------------------------

TEST(test_missing_amount) {
    std::string body =
        "Referencia de pago: CATR-0xABCD1234-1711800000\n";
    auto result = merlink::EmailParser::parse_body(body);
    EXPECT_FALSE(result.has_value());
}

// ---------------------------------------------------------------------------
// 3. Missing reference line → nullopt
// ---------------------------------------------------------------------------

TEST(test_missing_reference) {
    std::string body =
        "Monto recibido: L. 250.00\n";
    auto result = merlink::EmailParser::parse_body(body);
    EXPECT_FALSE(result.has_value());
}

// ---------------------------------------------------------------------------
// 4. Zero amount → nullopt
// ---------------------------------------------------------------------------

TEST(test_zero_amount) {
    std::string body =
        "Monto recibido: L. 0.00\n"
        "Referencia de pago: CATR-0xABCD1234-1711800000\n";
    auto result = merlink::EmailParser::parse_body(body);
    EXPECT_FALSE(result.has_value());
}

// ---------------------------------------------------------------------------
// 5. Negative amount → nullopt
// ---------------------------------------------------------------------------

TEST(test_negative_amount) {
    std::string body =
        "Monto recibido: L. -100.00\n"
        "Referencia de pago: CATR-0xABCD1234-1711800000\n";
    auto result = merlink::EmailParser::parse_body(body);
    EXPECT_FALSE(result.has_value());
}

// ---------------------------------------------------------------------------
// 6. Reference missing CATR- prefix → nullopt
// ---------------------------------------------------------------------------

TEST(test_invalid_reference_prefix) {
    std::string body =
        "Monto recibido: L. 100.00\n"
        "Referencia de pago: XREF-0xABCD1234-1711800000\n";
    auto result = merlink::EmailParser::parse_body(body);
    EXPECT_FALSE(result.has_value());
}

// ---------------------------------------------------------------------------
// 7. Reference missing timestamp segment → nullopt
// ---------------------------------------------------------------------------

TEST(test_reference_missing_timestamp) {
    std::string body =
        "Monto recibido: L. 100.00\n"
        "Referencia de pago: CATR-0xABCD1234\n";
    auto result = merlink::EmailParser::parse_body(body);
    EXPECT_FALSE(result.has_value());
}

// ---------------------------------------------------------------------------
// 8. Reference missing wallet segment → nullopt
// ---------------------------------------------------------------------------

TEST(test_reference_missing_wallet) {
    std::string body =
        "Monto recibido: L. 100.00\n"
        "Referencia de pago: CATR--1711800000\n";
    auto result = merlink::EmailParser::parse_body(body);
    EXPECT_FALSE(result.has_value());
}

// ---------------------------------------------------------------------------
// 9. Wallet is correctly extracted from reference code
// ---------------------------------------------------------------------------

TEST(test_wallet_extraction) {
    std::string body =
        "Monto recibido: L. 1250.75\n"
        "Referencia de pago: CATR-0xDEADBEEF-1711999999\n";
    auto result = merlink::EmailParser::parse_body(body);
    EXPECT_TRUE(result.has_value());
    EXPECT_TRUE(result->client_wallet == "0xDEADBEEF");
    EXPECT_TRUE(result->amount_lempiras == 1250.75);
}

// ---------------------------------------------------------------------------
// 10. Amount with no decimal part parses correctly
// ---------------------------------------------------------------------------

TEST(test_amount_no_decimal) {
    std::string body =
        "Monto recibido: L. 300\n"
        "Referencia de pago: CATR-0xABCD1234-1711800000\n";
    auto result = merlink::EmailParser::parse_body(body);
    EXPECT_TRUE(result.has_value());
    EXPECT_TRUE(result->amount_lempiras == 300.0);
}

// ---------------------------------------------------------------------------
// 11. Extra whitespace / trailing content doesn't break parsing
// ---------------------------------------------------------------------------

TEST(test_extra_content_ignored) {
    std::string body =
        "Estimado HNDA,\n\n"
        "Información adicional que no nos importa.\n\n"
        "Monto recibido: L. 750.00\n"
        "Referencia de pago: CATR-0xCAFE1234-1712000000\n"
        "Cuenta destino: xxxx-5678\n"
        "Fecha: 30/03/2026\n";
    auto result = merlink::EmailParser::parse_body(body);
    EXPECT_TRUE(result.has_value());
    EXPECT_TRUE(result->reference_code == "CATR-0xCAFE1234-1712000000");
    EXPECT_TRUE(result->amount_lempiras == 750.00);
}

// ---------------------------------------------------------------------------
// 12. received_at is a non-empty ISO 8601 string
// ---------------------------------------------------------------------------

TEST(test_received_at_format) {
    auto result = merlink::EmailParser::parse_body(VALID_BODY);
    EXPECT_TRUE(result.has_value());
    // Must be at least "YYYY-MM-DDTHH:MM:SSZ" = 20 chars
    EXPECT_TRUE(result->received_at.size() >= 20);
    // Must contain 'T' separator and 'Z' suffix
    EXPECT_TRUE(result->received_at.find('T') != std::string::npos);
    EXPECT_TRUE(result->received_at.back() == 'Z');
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

int main() {
    setvbuf(stdout, nullptr, _IONBF, 0); // unbuffered — output survives abort()
    printf("\n=== email_parser_test ===\n\n");

    RUN(test_valid_body_parses);
    RUN(test_missing_amount);
    RUN(test_missing_reference);
    RUN(test_zero_amount);
    RUN(test_negative_amount);
    RUN(test_invalid_reference_prefix);
    RUN(test_reference_missing_timestamp);
    RUN(test_reference_missing_wallet);
    RUN(test_wallet_extraction);
    RUN(test_amount_no_decimal);
    RUN(test_extra_content_ignored);
    RUN(test_received_at_format);

    printf("\n=== %d/%d tests passed ===\n\n", tests_passed, tests_run);
    return (tests_passed == tests_run) ? 0 : 1;
}
