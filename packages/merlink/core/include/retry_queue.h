#pragma once

#include "payment_event.h"

#include <chrono>
#include <condition_variable>
#include <cstddef>
#include <mutex>
#include <queue>

namespace merlink {

/// Thread-safe FIFO queue of PaymentEvents.
///
/// The email parser (and later NFC/webhook adapters) push events here.
/// The Node.js bridge pops events and calls contract.mint().
///
/// Crash recovery is handled by PostgreSQL pending_mints — this queue
/// is intentionally in-memory only.
class RetryQueue {
public:
    /// Push an event onto the queue. Never blocks.
    void push(const PaymentEvent& event);

    /// Blocking pop. Waits up to `timeout` for an event.
    /// Returns true and fills `out` if an event was retrieved before timeout.
    bool pop(PaymentEvent& out,
             std::chrono::milliseconds timeout = std::chrono::milliseconds(1000));

    /// Non-blocking pop. Returns true and fills `out` if queue was non-empty.
    bool try_pop(PaymentEvent& out);

    std::size_t size() const;
    bool        empty() const;

private:
    std::queue<PaymentEvent>  queue_;
    mutable std::mutex        mutex_;
    std::condition_variable   cv_;
};

} // namespace merlink
