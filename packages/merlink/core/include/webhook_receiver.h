#pragma once

#include "payment_event.h"
#include "retry_queue.h"

#include <atomic>
#include <optional>
#include <string>
#include <thread>

namespace merlink {

/// HTTP server configuration for the webhook endpoint.
struct WebhookConfig {
    int         port           = 8080;
    std::string host           = "0.0.0.0";
    std::string secret_token;  // optional — if set, requests must include
                               // "X-Webhook-Token: <secret>" header
};

/// Listens for HTTP POST /payment requests from BAC Credomatic (Etapa 2).
/// Parses the JSON body into a PaymentEvent and pushes it into a RetryQueue.
///
/// The parsing logic (parse_body) is exposed as a static method so tests
/// can verify it without starting an HTTP server.
///
/// Expected JSON body:
///   {
///     "reference_code":  "CATR-0xABCD1234-1711800000",
///     "amount_lempiras": 500.00,
///     "client_wallet":   "0xABCD1234"
///   }
class WebhookReceiver {
public:
    explicit WebhookReceiver(WebhookConfig config, RetryQueue& queue);
    ~WebhookReceiver();

    /// Start the HTTP listener on a background thread.
    void start();

    /// Stop the HTTP listener and block until it exits.
    void stop();

    /// Parse a JSON webhook body and extract a PaymentEvent.
    /// Returns std::nullopt if the body is malformed, missing required fields,
    /// or contains invalid values. Exposed as static for unit testing.
    static std::optional<PaymentEvent> parse_body(const std::string& body);

private:
    WebhookConfig      config_;
    RetryQueue&        queue_;
    std::thread        thread_;
    std::atomic<bool>  running_{false};
};

} // namespace merlink
