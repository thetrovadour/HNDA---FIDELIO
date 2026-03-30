#pragma once

#include "payment_event.h"
#include "retry_queue.h"

#include <atomic>
#include <condition_variable>
#include <mutex>
#include <optional>
#include <string>
#include <thread>
#include <vector>

namespace merlink {

/// IMAP connection configuration for the dedicated HNDA Gmail inbox.
struct ImapConfig {
    std::string host                 = "imaps://imap.gmail.com";
    int         port                 = 993;
    std::string username;            // full Gmail address
    std::string password;            // Gmail App Password (not the account password)
    std::string sender_filter;       // only process emails from this address (e.g. "notificaciones@atlantida.hn")
    int         poll_interval_seconds = 60;
};

/// Polls a Gmail inbox via IMAP, parses Atlántida bank notification emails,
/// and pushes PaymentEvent objects into a RetryQueue.
///
/// The parsing logic (parse_body) is exposed as a static method so tests
/// can verify it without an IMAP connection.
class EmailParser {
public:
    explicit EmailParser(ImapConfig config, RetryQueue& queue);
    ~EmailParser();

    /// Start the background polling thread.
    void start();

    /// Stop the polling thread and block until it exits.
    void stop();

    /// Parse a plain-text email body and extract a PaymentEvent.
    /// Returns std::nullopt if the body does not match the expected format
    /// or contains invalid data. Exposed as static for unit testing.
    ///
    /// Expected body format (Atlántida mock):
    ///   Monto recibido: L. 500.00
    ///   Referencia de pago: CATR-0xABCD1234-1711800000
    static std::optional<PaymentEvent> parse_body(const std::string& body);

private:
    void poll_loop();
    void poll_once();

    std::vector<std::string> fetch_unseen_uids() const;
    std::string              fetch_email_body(const std::string& uid) const;
    void                     mark_as_read(const std::string& uid) const;
    std::string              imap_url(const std::string& path = "") const;

    static std::string extract_raw_body(const std::string& raw_email);
    static std::string extract_header(const std::string& raw_email,
                                      const std::string& header_name);

    ImapConfig         config_;
    RetryQueue&        queue_;
    std::thread        thread_;
    std::atomic<bool>  running_{false};
    std::condition_variable cv_;
    std::mutex         cv_mutex_;
};

} // namespace merlink
