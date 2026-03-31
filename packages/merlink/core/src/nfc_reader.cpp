#include "nfc_reader.h"

#include <chrono>
#include <condition_variable>
#include <cstring>
#include <ctime>
#include <mutex>
#include <queue>

namespace merlink {

// ---------------------------------------------------------------------------
// NfcHardwareMock implementation
// ---------------------------------------------------------------------------

struct NfcHardwareMock::Impl {
    std::queue<std::string>  taps;
    std::mutex               mutex;
    std::condition_variable  cv;
    bool                     cancelled{false};
};

NfcHardwareMock::NfcHardwareMock() : impl_(new Impl()) {}

NfcHardwareMock::~NfcHardwareMock() {
    cancel();
    delete impl_;
}

void NfcHardwareMock::inject(const std::string& payload) {
    {
        std::lock_guard<std::mutex> lock(impl_->mutex);
        impl_->taps.push(payload);
    }
    impl_->cv.notify_one();
}

std::string NfcHardwareMock::read_tap() {
    std::unique_lock<std::mutex> lock(impl_->mutex);
    impl_->cv.wait(lock, [this] {
        return !impl_->taps.empty() || impl_->cancelled;
    });
    if (impl_->cancelled && impl_->taps.empty()) return {};
    std::string payload = impl_->taps.front();
    impl_->taps.pop();
    return payload;
}

void NfcHardwareMock::cancel() {
    {
        std::lock_guard<std::mutex> lock(impl_->mutex);
        impl_->cancelled = true;
    }
    impl_->cv.notify_all();
}

// ---------------------------------------------------------------------------
// NfcReader — construction / destruction
// ---------------------------------------------------------------------------

NfcReader::NfcReader(NfcHardware& hardware, RetryQueue& queue)
    : hardware_(hardware), queue_(queue) {}

NfcReader::~NfcReader() {
    stop();
}

// ---------------------------------------------------------------------------
// Lifecycle
// ---------------------------------------------------------------------------

void NfcReader::start() {
    if (running_) return;
    running_ = true;
    thread_ = std::thread(&NfcReader::read_loop, this);
}

void NfcReader::stop() {
    if (!running_) return;
    running_ = false;
    hardware_.cancel();
    if (thread_.joinable()) thread_.join();
}

// ---------------------------------------------------------------------------
// Read loop
// ---------------------------------------------------------------------------

void NfcReader::read_loop() {
    while (running_) {
        std::string raw = hardware_.read_tap();
        if (raw.empty()) continue;

        auto event = parse_payload(raw);
        if (event) {
            queue_.push(*event);
        }
    }
}

// ---------------------------------------------------------------------------
// Core parsing logic — static, fully testable without hardware
// ---------------------------------------------------------------------------

std::optional<PaymentEvent> NfcReader::parse_payload(const std::string& payload) {
    if (payload.empty()) return std::nullopt;

    // Expected format: "CATR-0xABCD1234-1711800000|500.00"
    auto pipe = payload.find('|');
    if (pipe == std::string::npos) return std::nullopt;

    std::string reference = payload.substr(0, pipe);
    std::string amount_str = payload.substr(pipe + 1);

    if (reference.empty() || amount_str.empty()) return std::nullopt;

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

    // --- Parse amount ---
    double amount = 0.0;
    try {
        std::size_t chars = 0;
        amount = std::stod(amount_str, &chars);
        if (chars == 0) return std::nullopt;
    } catch (...) {
        return std::nullopt;
    }
    if (amount <= 0.0) return std::nullopt;

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
    event.source          = "nfc";
    event.received_at     = time_str;

    return event;
}

} // namespace merlink
