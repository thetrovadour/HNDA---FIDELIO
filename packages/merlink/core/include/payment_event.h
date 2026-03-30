#pragma once

#include <string>

namespace merlink {

/// Normalized payment trigger — produced by any input adapter (email, NFC, webhook).
/// The downstream pipeline (bloom filter → bridge → mint) only sees this struct,
/// never the raw source format.
struct PaymentEvent {
    std::string reference_code;   // "CATR-[wallet]-[timestamp]"
    double      amount_lempiras;  // transfer amount parsed from source
    std::string client_wallet;    // extracted from reference_code middle segment
    std::string source;           // "email" | "nfc" | "webhook"
    std::string received_at;      // ISO 8601 UTC timestamp of receipt
};

} // namespace merlink
