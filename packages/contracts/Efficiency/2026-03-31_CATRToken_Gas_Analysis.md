# CATRToken.sol — Gas Efficiency Analysis

**Date:** 2026-03-31
**Contract:** CATRToken.sol (ERC20Capped + AccessControl, OpenZeppelin v5)
**Compiler:** Solidity 0.8.20, optimizer enabled (200 runs)
**Chain target:** Base (Ethereum L2)

---

## 1. Contract Size

| Metric | Value | Limit | Usage |
|---|---|---|---|
| Deployed bytecode | 3,649 bytes | 24,576 bytes (EIP-170) | **14.8%** |

**Verdict: No concern.** The contract is small. Far below the deployment size limit. OpenZeppelin v5's modular design keeps the footprint tight.

---

## 2. Gas Costs Per Operation

Measured via Hardhat gas reporter on a local EVM (block limit: 60,000,000 gas).

| Operation | Gas Used | % of Block |
|---|---|---|
| **Deployment** | 928,938 | 1.5% |
| **mint** | 71,261 | 0.12% |
| **burn** | 29,499 | 0.05% |
| **transfer** (with commission) | 96,874 | 0.16% |
| **grantRole** | 51,498 | 0.09% |

---

## 3. USD Cost Estimates

### Per Operation

| Operation | Base Mainnet (typical) | Base Mainnet (congested) | Ethereum Mainnet (comparison) |
|---|---|---|---|
| Deployment | **$0.002** | $0.12 | $69.67 |
| Mint | **$0.0002** | $0.009 | $5.34 |
| Burn | **$0.00007** | $0.004 | $2.21 |
| Transfer | **$0.0002** | $0.012 | $7.27 |
| grantRole | **$0.0001** | $0.006 | $3.86 |

*Assumptions: Base typical = 0.001 gwei, Base congested = 0.05 gwei, Ethereum = 30 gwei, ETH = $2,500.*

### Reina Pilot Scenario (5,000 CATR/day, ~16 transactions of ~300 CATR)

| Period | Base Mainnet (typical) | Base Mainnet (congested) |
|---|---|---|
| **Daily** (~16 mints + ~16 transfers) | **$0.007** | $0.34 |
| **Monthly** (30 days) | **$0.20** | $10.09 |

**Verdict: Gas costs are negligible on Base.** Even in the worst congestion scenario, operating Reina's full pilot for a month costs roughly $10. Under normal conditions, it's twenty cents a month.

---

## 4. The One Hot Spot: Transfer Commission Logic

This is the only area where CATRToken uses more gas than a standard ERC-20.

| Transfer type | Gas | Why |
|---|---|---|
| Standard ERC-20 `transfer` | ~51,000 | 1 balance update (2 SSTOREs) |
| **CATRToken `transfer`** | **96,874** | 3 balance updates (6 SSTOREs) |
| **Overhead** | **+45,874 (~90%)** | Commission split to treasury + rewardPool |

### Why it costs more

Every CATRToken transfer triggers three `_update` calls inside the overridden function:

```
1. sender → recipient    (net amount after commission)
2. sender → treasury     (65% of 1.8% commission)
3. sender → rewardPool   (35% of 1.8% commission)
```

Each `_update` writes two storage slots (sender balance down, receiver balance up). Storage writes (`SSTORE`) cost 5,000 gas (warm) to 20,000 gas (cold) each. Three updates = six storage writes = the bulk of the overhead.

### Should we optimize this?

**No. Here's why:**

1. **The absolute cost is still tiny.** On Base, 96,874 gas costs $0.0002 per transfer. Even at 50x congestion, it's $0.01. The commission logic adds fractions of a cent.

2. **The alternative is worse.** You could batch commission into a single address and split later off-chain. This saves ~15,000 gas per transfer but introduces:
   - A new off-chain job to split funds (more code, more failure modes)
   - A delay between commission collection and treasury/rewardPool distribution
   - Trust assumptions — someone has to run the splitter

3. **On-chain correctness > marginal gas savings.** The whole point of FIDELIO is that the commission split is transparent, automatic, and verifiable. Moving it off-chain to save $0.0001 per transaction undermines the trust model.

4. **The overhead is linear, not quadratic.** It doesn't get worse with larger amounts — 300 CATR and 3,000 CATR cost the same gas. This scales fine.

---

## 5. Deployment Cost — One-Time

| Scenario | Cost |
|---|---|
| Base Sepolia (testnet) | Free (testnet ETH) |
| Base Mainnet (typical) | **$0.002** |
| Base Mainnet (congested) | $0.12 |
| Ethereum Mainnet | $69.67 |

**Verdict: Deployment is essentially free on Base.** This is a one-time cost. Even on Ethereum mainnet it would be under $70, but on Base it's less than a penny.

---

## 6. Optimizer Settings

Currently set to **200 runs**. This is the right default.

| Runs | Effect |
|---|---|
| 1 | Smaller deployment, more expensive per call |
| 200 (current) | **Balanced** — good deployment size, good per-call cost |
| 10,000+ | Slightly cheaper per call, larger deployment |

Since our operations are cheap already and deployment is a one-time cost of $0.002, there's no reason to change the optimizer setting.

---

## 7. Potential Future Optimizations (Not Needed Now)

These are documented for reference, not recommended for implementation:

| Optimization | Gas Saved | Trade-off | Recommendation |
|---|---|---|---|
| Batch commission to one address, split off-chain | ~15,000/transfer | Adds off-chain job, delay, trust assumptions | **Don't do it** |
| Use `ERC20` instead of `ERC20Capped` | ~2,000/mint | Lose on-chain cap enforcement | **Don't do it** — cap is a non-negotiable invariant |
| Remove `AccessControl`, use `Ownable` | ~5,000 deployment | Lose role granularity (MINTER_ROLE vs admin) | **Don't do it** — need separate minter and admin roles |
| Increase optimizer runs to 1000+ | ~500/call | Larger bytecode | **Negligible benefit** — not worth the added deployment size |
| Pack treasury + rewardPool into one slot | ~2,100/transfer | Requires address packing hacks, less readable | **Don't do it** — addresses are 20 bytes, can't fit two in one slot cleanly |

---

## 8. Summary

| Dimension | Rating | Notes |
|---|---|---|
| Contract size | Excellent | 14.8% of limit — plenty of room |
| Deployment cost | Excellent | $0.002 on Base (one-time) |
| Mint cost | Excellent | $0.0002 per mint |
| Burn cost | Excellent | $0.00007 per burn |
| Transfer cost | Good | $0.0002 — 90% overhead from commission, but still fractions of a cent |
| Optimizer config | Correct | 200 runs, balanced |
| Pilot viability | Excellent | Reina's scenario: $0.20/month under normal conditions |

**Bottom line: CATRToken.sol is gas-efficient for Base L2. The commission logic is the only overhead, and it costs fractions of a cent per transaction. No changes needed before pilot testing. The contract is ready to deploy.**

---

*Analysis performed with Hardhat gas reporter, Solidity 0.8.20, optimizer enabled (200 runs). USD estimates assume ETH at $2,500.*

---

## 9. Phase A Deployment Budget (added 2026-04-06)

### One-time deployment costs (Base mainnet)

| Item | Cost (typical) | Cost (congested) |
|---|---|---|
| CATRToken.sol deployment | $0.002 | $0.12 |
| VaultOp (Gnosis Safe setup) | ~$1–3 | ~$5–10 |
| `grantRole` (bridge minter wallet) | $0.0001 | $0.006 |
| Config transactions | ~$0.01 | ~$0.10 |
| **Total deployment** | **~$2–4** | **~$10–15** |

Gnosis Safe is the biggest line item: it deploys a proxy contract, sets owners (Cristian + Víctor), and sets the 2-of-2 threshold — 2–3 transactions.

### Bridge minter wallet — ongoing gas budget

| Scenario | Daily mints | Daily cost | Monthly cost |
|---|---|---|---|
| Reina pilot | ~16 | $0.003 | $0.10 |
| 10× Reina | ~160 | $0.03 | $1.00 |
| Full network (100 merchants) | ~1,600 | $0.32 | $10.00 |

### Wallet funding requirements

| Wallet | Needs ETH? | Recommended starting amount |
|---|---|---|
| Bridge minter wallet | Yes — pays gas per mint | $25 |
| Treasury wallet | No — receives CATR commissions | $0 |
| RewardPool wallet | No — receives CATR commissions | $0 |
| VaultOp (Gnosis Safe) | Tiny — occasional approval txs | $5 |

### Total budget

| Category | Recommended | Cristian's target (2×) |
|---|---|---|
| Deployment (one-time) | $5–15 | $30 |
| Minter wallet gas reserve | $25 | $50 |
| VaultOp operational reserve | $5 | $10 |
| **Total** | **$35–45** | **$90** |

At ETH ~$2,500: recommended = ~0.018 ETH / Cristian's target = ~0.036 ETH.

*At Reina's pilot volume (~16 mints/day), $25 in the minter wallet covers approximately 16–25 years of gas at typical Base prices.*
