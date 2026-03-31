#pragma once

#include <atomic>
#include <chrono>
#include <functional>
#include <optional>
#include <string>
#include <thread>

namespace merlink {

// ---------------------------------------------------------------------------
// Data types
// ---------------------------------------------------------------------------

/// Snapshot of the on-chain CATR token state.
/// Populated by a VaultBackend implementation.
struct VaultState {
    double treasury_balance  = 0.0;  // HNDA treasury wallet balance (CATR)
    double reward_balance    = 0.0;  // Reward pool wallet balance (CATR)
    double total_supply      = 0.0;  // Total minted - total burned (CATR)
};

/// An anomaly detected by the vault monitor.
enum class AlertType {
    BALANCE_DRIFT,   // treasury or reward pool deviated beyond threshold
    UNEXPECTED_BURN, // supply dropped without a matching redemption request
    CAP_APPROACHING, // total_supply > 90% of 50,000,000 CATR
};

struct VaultAlert {
    AlertType   type;
    std::string message;
};

// ---------------------------------------------------------------------------
// VaultBackend — swappable data source
// ---------------------------------------------------------------------------

/// Abstract interface for reading on-chain vault state.
class VaultBackend {
public:
    virtual ~VaultBackend() = default;

    /// Fetch the current vault state from the data source.
    /// Returns std::nullopt if the backend is unavailable.
    virtual std::optional<VaultState> fetch() = 0;
};

/// Stub backend — returns a static healthy state.
/// Used until Phase A delivers the CATRToken contract address and ABI.
/// Replace with VaultBackendReal (Base RPC via ethers.js IPC) in Phase A.
class VaultBackendStub : public VaultBackend {
public:
    std::optional<VaultState> fetch() override;

    /// Override the state returned by fetch() — used in tests.
    void set_state(const VaultState& state);

private:
    VaultState state_{
        .treasury_balance = 1'000'000.0,
        .reward_balance   =   250'000.0,
        .total_supply     = 1'250'000.0,
    };
};

// ---------------------------------------------------------------------------
// VaultMonitor
// ---------------------------------------------------------------------------

/// Configuration for the vault monitor.
struct VaultMonitorConfig {
    std::chrono::seconds check_interval     = std::chrono::seconds(60);
    double               drift_threshold    = 0.05;   // 5% deviation triggers alert
    double               cap_warn_threshold = 0.90;   // 90% of supply cap triggers alert
    double               supply_cap         = 50'000'000.0;
};

/// Polls the vault backend on a background thread and fires alerts when
/// anomalies are detected.
///
/// Alert delivery is via a callback set with on_alert(). If no callback is
/// set, alerts are printed to stderr.
class VaultMonitor {
public:
    explicit VaultMonitor(VaultBackend& backend,
                          VaultMonitorConfig config = {});
    ~VaultMonitor();

    /// Register a callback to receive alerts. Called from the monitor thread.
    void on_alert(std::function<void(const VaultAlert&)> callback);

    /// Start the monitoring loop on a background thread.
    void start();

    /// Stop the loop and block until the thread exits.
    void stop();

    /// Run a single check cycle synchronously.
    /// Returns any alert generated, or std::nullopt if all is healthy.
    /// Exposed for unit testing without threading.
    std::optional<VaultAlert> check_once(const VaultState& current,
                                          const VaultState& previous) const;

private:
    void monitor_loop();

    VaultBackend&                          backend_;
    VaultMonitorConfig                     config_;
    std::function<void(const VaultAlert&)> alert_cb_;
    std::thread                            thread_;
    std::atomic<bool>                      running_{false};
    std::optional<VaultState>              last_state_;
};

} // namespace merlink
