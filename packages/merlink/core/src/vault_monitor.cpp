#include "vault_monitor.h"
// for the future.
#include <cstdio>
#include <cmath>

namespace merlink {

// ---------------------------------------------------------------------------
// VaultBackendStub
// ---------------------------------------------------------------------------

std::optional<VaultState> VaultBackendStub::fetch() {
    return state_;
}

void VaultBackendStub::set_state(const VaultState& state) {
    state_ = state;
}

// ---------------------------------------------------------------------------
// VaultMonitor — construction / destruction
// ---------------------------------------------------------------------------

VaultMonitor::VaultMonitor(VaultBackend& backend, VaultMonitorConfig config)
    : backend_(backend), config_(config) {}

VaultMonitor::~VaultMonitor() {
    stop();
}

void VaultMonitor::on_alert(std::function<void(const VaultAlert&)> callback) {
    alert_cb_ = std::move(callback);
}

// ---------------------------------------------------------------------------
// Lifecycle, should not resurrect from the dead.
// ---------------------------------------------------------------------------

void VaultMonitor::start() {
    if (running_) return;
    running_ = true;
    thread_ = std::thread(&VaultMonitor::monitor_loop, this);
}

void VaultMonitor::stop() {
    if (!running_) return;
    running_ = false;
    if (thread_.joinable()) thread_.join();
}

// ---------------------------------------------------------------------------
// Monitor loop
// ---------------------------------------------------------------------------

void VaultMonitor::monitor_loop() {
    while (running_) {
        auto state = backend_.fetch();
        if (state) {
            if (last_state_) {
                auto alert = check_once(*state, *last_state_);
                if (alert) {
                    if (alert_cb_) {
                        alert_cb_(*alert);
                    } else {
                        std::fprintf(stderr, "[VaultMonitor] ALERT: %s\n",
                                     alert->message.c_str());
                    }
                }
            }
            last_state_ = state;
        }

        // Interruptible sleep — checks running_ every second
        for (int i = 0; i < config_.check_interval.count() && running_; ++i) {
            std::this_thread::sleep_for(std::chrono::seconds(1));
        }
    }
}

// ---------------------------------------------------------------------------
// check_once — core logic, static-style, fully testable, I mean, this can be tested.
// ---------------------------------------------------------------------------

std::optional<VaultAlert> VaultMonitor::check_once(const VaultState& current,
                                                     const VaultState& previous) const {
    // --- Supply cap approaching ---
    if (current.total_supply >= config_.supply_cap * config_.cap_warn_threshold) {
        return VaultAlert{
            AlertType::CAP_APPROACHING,
            "CATR total supply has exceeded " +
                std::to_string(static_cast<int>(config_.cap_warn_threshold * 100)) +
                "% of the 50M cap"
        };
    }

    // --- Unexpected burn ---
    // Supply should only decrease when a redemption has been processed.
    // The monitor has no access to the redemption table here, so any supply
    // decrease is flagged for the backend to correlate.
    if (current.total_supply < previous.total_supply) {
        double burned = previous.total_supply - current.total_supply;
        return VaultAlert{
            AlertType::UNEXPECTED_BURN,
            "Total supply decreased by " + std::to_string(burned) +
                " CATR — verify against pending redemptions"
        };
    }

    // --- Balance drift ---
    // Flag if treasury or reward pool moved by more than drift_threshold
    // relative to their previous values.
    auto drifted = [&](double current_val, double previous_val) -> bool {
        if (previous_val == 0.0) return false;
        return std::fabs(current_val - previous_val) / previous_val
               > config_.drift_threshold;
    };

    if (drifted(current.treasury_balance, previous.treasury_balance)) {
        return VaultAlert{
            AlertType::BALANCE_DRIFT,
            "Treasury balance drifted beyond threshold"
        };
    }

    if (drifted(current.reward_balance, previous.reward_balance)) {
        return VaultAlert{
            AlertType::BALANCE_DRIFT,
            "Reward pool balance drifted beyond threshold"
        };
    }

    return std::nullopt;
}

} 
