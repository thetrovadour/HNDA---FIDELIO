#include "retry_queue.h"

namespace merlink {

void RetryQueue::push(const PaymentEvent& event) {
    {
        std::lock_guard<std::mutex> lock(mutex_);
        queue_.push(event);
    }
    cv_.notify_one();
}

bool RetryQueue::pop(PaymentEvent& out, std::chrono::milliseconds timeout) {
    std::unique_lock<std::mutex> lock(mutex_);
    bool got_event = cv_.wait_for(lock, timeout, [this] {
        return !queue_.empty();
    });
    if (!got_event) return false;
    out = queue_.front();
    queue_.pop();
    return true;
}

bool RetryQueue::try_pop(PaymentEvent& out) {
    std::lock_guard<std::mutex> lock(mutex_);
    if (queue_.empty()) return false;
    out = queue_.front();
    queue_.pop();
    return true;
}

std::size_t RetryQueue::size() const {
    std::lock_guard<std::mutex> lock(mutex_);
    return queue_.size();
}

bool RetryQueue::empty() const {
    std::lock_guard<std::mutex> lock(mutex_);
    return queue_.empty();
}

} // namespace merlink
