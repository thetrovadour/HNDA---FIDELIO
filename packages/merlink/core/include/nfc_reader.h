#pragma once

#include "payment_event.h"
#include "retry_queue.h"

#include <atomic>
#include <optional>
#include <string>
#include <thread>

namespace merlink {

// ---------------------------------------------------------------------------
// NFC hardware abstraction — swappable between mock (tests) and real (prod)
// ---------------------------------------------------------------------------

/// Interface representing a physical NFC reader.
/// Implementations block on read_tap() until a tap arrives.
class NfcHardware {
public:
    virtual ~NfcHardware() = default;

    /// Block until an NFC tap is detected and return the raw NDEF payload.
    /// Returns an empty string if the reader is stopped or an error occurs.
    virtual std::string read_tap() = 0;

    /// Signal the hardware to unblock any pending read_tap() call.
    virtual void cancel() = 0;
};

/// Mock NFC hardware for unit testing.
/// Taps are injected programmatically via inject(); read_tap() returns them
/// in FIFO order and blocks until one is available or cancel() is called.
class NfcHardwareMock : public NfcHardware {
public:
    NfcHardwareMock();
    ~NfcHardwareMock() override;

    /// Inject a raw NDEF payload as if a card was tapped.
    void inject(const std::string& payload);

    std::string read_tap() override;
    void        cancel()   override;

private:
    struct Impl;
    Impl* impl_;
};

// ---------------------------------------------------------------------------
// NFC reader
// ---------------------------------------------------------------------------

/// Reads NFC tap events from hardware, parses the NDEF payload into a
/// PaymentEvent, and pushes it into a RetryQueue.
///
/// Expected NDEF payload format (pipe-delimited):
///   CATR-0xABCD1234-1711800000|500.00
///   ^-- reference_code ------^ ^amount^
///
/// The parsing logic (parse_payload) is exposed as a static method so tests
/// can verify it without hardware.
class NfcReader {
public:
    explicit NfcReader(NfcHardware& hardware, RetryQueue& queue);
    ~NfcReader();

    /// Start the tap-listening loop on a background thread.
    void start();

    /// Stop the loop and block until the thread exits.
    void stop();

    /// Parse a raw NDEF payload string and extract a PaymentEvent.
    /// Returns std::nullopt if the payload is malformed or invalid.
    /// Exposed as static for unit testing.
    static std::optional<PaymentEvent> parse_payload(const std::string& payload);

private:
    void read_loop();

    NfcHardware&       hardware_;
    RetryQueue&        queue_;
    std::thread        thread_;
    std::atomic<bool>  running_{false};
};

} // namespace merlink
