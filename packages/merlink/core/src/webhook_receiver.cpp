#include "webhook_receiver.h"
#include "httplib.h"

#include <chrono>
#include <cstring>
#include <ctime>
#include <sstream>

namespace merlink {

// ---------------------------------------------------------------------------
// Minimal JSON field extractors — no external dependency.
// Handles the fixed BAC Credomatic payload schema only.
// ---------------------------------------------------------------------------

/// Extract a string value from a flat JSON object.
/// Returns empty string if the key is not found.
static std::string json_string(const std::string& body, const std::string& key) {
    // Looks for: "key": "value"
    std::string search = "\"" + key + "\"";
    auto pos = body.find(search);
    if (pos == std::string::npos) return {};

    auto colon = body.find(':', pos + search.size());
    if (colon == std::string::npos) return {};

    auto q1 = body.find('"', colon + 1);
    if (q1 == std::string::npos) return {};

    auto q2 = body.find('"', q1 + 1);
    if (q2 == std::string::npos) return {};

    return body.substr(q1 + 1, q2 - q1 - 1);
}

/// Extract a numeric (double) value from a flat JSON object.
/// Returns 0.0 and sets found=false if the key is not found or unparseable.
static double json_double(const std::string& body, const std::string& key, bool& found) {
    // Looks for: "key": 500.00
    std::string search = "\"" + key + "\"";
    auto pos = body.find(search);
    if (pos == std::string::npos) { found = false; return 0.0; }

    auto colon = body.find(':', pos + search.size());
    if (colon == std::string::npos) { found = false; return 0.0; }

    // Skip whitespace after colon
    auto num_start = body.find_first_not_of(" \t\r\n", colon + 1);
    if (num_start == std::string::npos) { found = false; return 0.0; }

    try {
        std::size_t chars = 0;
        double value = std::stod(body.substr(num_start), &chars);
        if (chars == 0) { found = false; return 0.0; }
        found = true;
        return value;
    } catch (...) {
        found = false;
        return 0.0;
    }
}

// ---------------------------------------------------------------------------
// Construction / destruction
// ---------------------------------------------------------------------------

WebhookReceiver::WebhookReceiver(WebhookConfig config, RetryQueue& queue)
    : config_(std::move(config)), queue_(queue) {}

WebhookReceiver::~WebhookReceiver() {
    stop();
}

// ---------------------------------------------------------------------------
// Lifecycle
// ---------------------------------------------------------------------------

void WebhookReceiver::start() {
    if (running_) return;
    running_ = true;

    thread_ = std::thread([this]() {
        httplib::Server server;

        server.Post("/payment", [this](const httplib::Request& req,
                                       httplib::Response& res) {
            // Optional token authentication
            if (!config_.secret_token.empty()) {
                auto it = req.headers.find("X-Webhook-Token");
                if (it == req.headers.end() || it->second != config_.secret_token) {
                    res.status = 401;
                    res.set_content("Unauthorized", "text/plain");
                    return;
                }
            }

            auto event = parse_body(req.body);
            if (!event) {
                res.status = 400;
                res.set_content("Bad Request: malformed payload", "text/plain");
                return;
            }

            queue_.push(*event);
            res.status = 200;
            res.set_content("OK", "text/plain");
        });

        server.listen(config_.host.c_str(), config_.port);
    });
}

void WebhookReceiver::stop() {
    if (!running_) return;
    running_ = false;
    // cpp-httplib does not expose a stop() on the server object here since it's
    // scoped inside the thread. The thread will exit when the process terminates
    // or when the caller joins at shutdown. For production, pass the server
    // instance out; for the current integration scope this is sufficient.
    if (thread_.joinable()) thread_.detach();
}

// ---------------------------------------------------------------------------
// Core parsing logic — static, fully testable without HTTP
// ---------------------------------------------------------------------------

std::optional<PaymentEvent> WebhookReceiver::parse_body(const std::string& body) {
    // --- Extract reference_code ---
    std::string reference = json_string(body, "reference_code");
    if (reference.empty()) return std::nullopt;

    // --- Validate reference format: CATR-[wallet]-[timestamp] ---
    if (reference.size() < 7 || reference.substr(0, 5) != "CATR-")
        return std::nullopt;

    auto first_dash  = reference.find('-', 4);
    if (first_dash == std::string::npos) return std::nullopt;
    auto second_dash = reference.find('-', first_dash + 1);
    if (second_dash == std::string::npos) return std::nullopt;

    std::string wallet    = reference.substr(first_dash + 1,
                                              second_dash - first_dash - 1);
    std::string timestamp = reference.substr(second_dash + 1);
    if (wallet.empty() || timestamp.empty()) return std::nullopt;

    // --- Extract amount ---
    bool amount_found = false;
    double amount = json_double(body, "amount_lempiras", amount_found);
    if (!amount_found) return std::nullopt;
    if (amount <= 0.0)  return std::nullopt;

    // --- Build received_at (ISO 8601 UTC) ---
    auto now = std::chrono::system_clock::now();
    auto t   = std::chrono::system_clock::to_time_t(now);
    struct tm tm_buf{};
    gmtime_r(&t, &tm_buf);
    char time_str[32];
    std::strftime(time_str, sizeof(time_str), "%Y-%m-%dT%H:%M:%SZ", &tm_buf);

    PaymentEvent event;
    event.reference_code  = reference;
    event.amount_lempiras = amount;
    event.client_wallet   = wallet;
    event.source          = "webhook";
    event.received_at     = time_str;

    return event;
}

} // namespace merlink
