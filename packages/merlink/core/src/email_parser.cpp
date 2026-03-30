#include "email_parser.h"

#include <chrono>
#include <cstdio>
#include <cstring>
#include <ctime>
#include <curl/curl.h>
#include <sstream>
#include <stdexcept>

namespace merlink {

// ---------------------------------------------------------------------------
// libcurl write callback — accumulates response data into a std::string
// ---------------------------------------------------------------------------

static size_t write_callback(void* ptr, size_t size, size_t nmemb, std::string* data) {
    data->append(static_cast<char*>(ptr), size * nmemb);
    return size * nmemb;
}

// ---------------------------------------------------------------------------
// Construction / destruction
// ---------------------------------------------------------------------------

EmailParser::EmailParser(ImapConfig config, RetryQueue& queue)
    : config_(std::move(config)), queue_(queue) {}

EmailParser::~EmailParser() {
    stop();
}

// ---------------------------------------------------------------------------
// Lifecycle
// ---------------------------------------------------------------------------

void EmailParser::start() {
    if (running_) return;
    running_ = true;
    thread_ = std::thread(&EmailParser::poll_loop, this);
}

void EmailParser::stop() {
    if (!running_) return;
    {
        std::lock_guard<std::mutex> lock(cv_mutex_);
        running_ = false;
    }
    cv_.notify_all();
    if (thread_.joinable()) thread_.join();
}

// ---------------------------------------------------------------------------
// Poll loop
// ---------------------------------------------------------------------------

void EmailParser::poll_loop() {
    while (running_) {
        poll_once();
        std::unique_lock<std::mutex> lock(cv_mutex_);
        cv_.wait_for(lock,
                     std::chrono::seconds(config_.poll_interval_seconds),
                     [this] { return !running_; });
    }
}

void EmailParser::poll_once() {
    auto uids = fetch_unseen_uids();
    for (const auto& uid : uids) {
        std::string raw = fetch_email_body(uid);
        if (raw.empty()) continue;

        // Filter by sender if configured
        if (!config_.sender_filter.empty()) {
            std::string from = extract_header(raw, "From");
            if (from.find(config_.sender_filter) == std::string::npos) {
                mark_as_read(uid); // not from Atlántida — mark read and skip
                continue;
            }
        }

        std::string body = extract_raw_body(raw);
        auto event = parse_body(body);
        if (event) {
            queue_.push(*event);
            mark_as_read(uid);
            // If parse fails, leave unread so it can be investigated manually
        }
    }
}

// ---------------------------------------------------------------------------
// IMAP operations (libcurl)
// ---------------------------------------------------------------------------

std::string EmailParser::imap_url(const std::string& path) const {
    std::string url = config_.host;
    if (url.back() != '/') url += '/';
    url += path;
    return url;
}

std::vector<std::string> EmailParser::fetch_unseen_uids() const {
    CURL* curl = curl_easy_init();
    if (!curl) return {};

    std::string response;
    std::string url = imap_url("INBOX");

    curl_easy_setopt(curl, CURLOPT_URL,            url.c_str());
    curl_easy_setopt(curl, CURLOPT_USERNAME,        config_.username.c_str());
    curl_easy_setopt(curl, CURLOPT_PASSWORD,        config_.password.c_str());
    curl_easy_setopt(curl, CURLOPT_CUSTOMREQUEST,   "SEARCH UNSEEN");
    curl_easy_setopt(curl, CURLOPT_WRITEFUNCTION,   write_callback);
    curl_easy_setopt(curl, CURLOPT_WRITEDATA,       &response);

    CURLcode res = curl_easy_perform(curl);
    curl_easy_cleanup(curl);

    if (res != CURLE_OK) return {};

    // Response format: "* SEARCH 1 3 7\r\n"
    std::vector<std::string> uids;
    auto pos = response.find("* SEARCH");
    if (pos == std::string::npos) return uids;

    std::istringstream iss(response.substr(pos + 8)); // skip "* SEARCH"
    std::string token;
    while (iss >> token) {
        if (!token.empty() && std::isdigit(static_cast<unsigned char>(token[0]))) {
            uids.push_back(token);
        }
    }
    return uids;
}

std::string EmailParser::fetch_email_body(const std::string& uid) const {
    CURL* curl = curl_easy_init();
    if (!curl) return {};

    std::string response;
    std::string url = imap_url("INBOX;MAILINDEX=" + uid);

    curl_easy_setopt(curl, CURLOPT_URL,           url.c_str());
    curl_easy_setopt(curl, CURLOPT_USERNAME,       config_.username.c_str());
    curl_easy_setopt(curl, CURLOPT_PASSWORD,       config_.password.c_str());
    curl_easy_setopt(curl, CURLOPT_WRITEFUNCTION,  write_callback);
    curl_easy_setopt(curl, CURLOPT_WRITEDATA,      &response);

    CURLcode res = curl_easy_perform(curl);
    curl_easy_cleanup(curl);

    if (res != CURLE_OK) return {};
    return response;
}

void EmailParser::mark_as_read(const std::string& uid) const {
    CURL* curl = curl_easy_init();
    if (!curl) return;

    std::string url = imap_url("INBOX");
    std::string cmd = "STORE " + uid + " +FLAGS (\\Seen)";

    curl_easy_setopt(curl, CURLOPT_URL,           url.c_str());
    curl_easy_setopt(curl, CURLOPT_USERNAME,       config_.username.c_str());
    curl_easy_setopt(curl, CURLOPT_PASSWORD,       config_.password.c_str());
    curl_easy_setopt(curl, CURLOPT_CUSTOMREQUEST,  cmd.c_str());

    curl_easy_perform(curl);
    curl_easy_cleanup(curl);
}

// ---------------------------------------------------------------------------
// Email parsing helpers
// ---------------------------------------------------------------------------

std::string EmailParser::extract_raw_body(const std::string& raw_email) {
    // Headers end at the first blank line (CRLF CRLF or LF LF)
    auto pos = raw_email.find("\r\n\r\n");
    if (pos != std::string::npos) return raw_email.substr(pos + 4);
    pos = raw_email.find("\n\n");
    if (pos != std::string::npos) return raw_email.substr(pos + 2);
    return raw_email;
}

std::string EmailParser::extract_header(const std::string& raw_email,
                                         const std::string& header_name) {
    std::string search = header_name + ": ";
    auto pos = raw_email.find(search);
    if (pos == std::string::npos) return {};
    auto end = raw_email.find('\n', pos);
    std::string value = raw_email.substr(pos + search.size(),
                                          end - pos - search.size());
    if (!value.empty() && value.back() == '\r') value.pop_back();
    return value;
}

// ---------------------------------------------------------------------------
// Core parsing logic — static, fully testable without IMAP
// ---------------------------------------------------------------------------

std::optional<PaymentEvent> EmailParser::parse_body(const std::string& body) {
    // --- Extract amount ---
    // Expected line: "Monto recibido: L. 500.00"
    const std::string amount_marker = "Monto recibido: L. ";
    auto amount_pos = body.find(amount_marker);
    if (amount_pos == std::string::npos) return std::nullopt;

    double amount = 0.0;
    try {
        std::size_t chars_consumed = 0;
        amount = std::stod(body.substr(amount_pos + amount_marker.size()),
                           &chars_consumed);
        if (chars_consumed == 0) return std::nullopt;
    } catch (...) {
        return std::nullopt;
    }
    if (amount <= 0.0) return std::nullopt;

    // --- Extract reference code ---
    // Expected line: "Referencia de pago: CATR-0xABCD1234-1711800000"
    const std::string ref_marker = "Referencia de pago: ";
    auto ref_pos = body.find(ref_marker);
    if (ref_pos == std::string::npos) return std::nullopt;

    std::string ref_tail = body.substr(ref_pos + ref_marker.size());
    auto ref_end = ref_tail.find_first_of(" \t\r\n");
    std::string reference = (ref_end != std::string::npos)
                                ? ref_tail.substr(0, ref_end)
                                : ref_tail;

    // --- Validate reference format: CATR-[wallet]-[timestamp] ---
    if (reference.size() < 7 || reference.substr(0, 5) != "CATR-")
        return std::nullopt;

    auto first_dash  = reference.find('-', 4); // dash between "CATR" and wallet
    if (first_dash == std::string::npos) return std::nullopt;
    auto second_dash = reference.find('-', first_dash + 1); // dash between wallet and timestamp
    if (second_dash == std::string::npos) return std::nullopt;

    std::string wallet    = reference.substr(first_dash + 1,
                                              second_dash - first_dash - 1);
    std::string timestamp = reference.substr(second_dash + 1);
    if (wallet.empty() || timestamp.empty()) return std::nullopt;

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
    event.source          = "email";
    event.received_at     = time_str;

    return event;
}

} // namespace merlink
