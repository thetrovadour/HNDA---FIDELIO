

  ---
  Phase A Deployment — Step by Step

  What the script needs (5 values)

  ┌─────────────────────┬─────────────────────────────────────────────────────────┬──────────────────────────────────────────────┐
  │       Env var       │                       What it is                        │             Where it comes from              │
  ├─────────────────────┼─────────────────────────────────────────────────────────┼──────────────────────────────────────────────┤
  │ PRIVATE_KEY         │ The deployer wallet that pays gas and signs the         │ MetaMask → Account 1 → Export private key    │
  │                     │ deployment                                              │                                              │
  ├─────────────────────┼─────────────────────────────────────────────────────────┼──────────────────────────────────────────────┤
  │ TREASURY_ADDRESS    │ Where 65% of every commission goes                      │ MetaMask → Account 2 → copy address          │
  ├─────────────────────┼─────────────────────────────────────────────────────────┼──────────────────────────────────────────────┤
  │ REWARD_POOL_ADDRESS │ Where 35% of every commission goes                      │ MetaMask → Account 3 → copy address          │
  ├─────────────────────┼─────────────────────────────────────────────────────────┼──────────────────────────────────────────────┤
  │ ADMIN_ADDRESS       │ The VaultOp Gnosis Safe — controls pausing,             │ safe.global → create Safe → copy the Safe    │
  │                     │ blacklisting, role management                           │ contract address                             │
  ├─────────────────────┼─────────────────────────────────────────────────────────┼──────────────────────────────────────────────┤
  │ MINTER_ADDRESS      │ The bridge minter wallet — the only wallet allowed to   │ MetaMask → Account 4 (dedicated hot wallet)  │
  │                     │ call mint()                                             │ → copy address                               │
  └─────────────────────┴─────────────────────────────────────────────────────────┴──────────────────────────────────────────────┘

  Important distinction: PRIVATE_KEY is the deployer key — only used once to deploy. MINTER_ADDRESS is just the address of the bridge
   wallet; its private key goes into packages/merlink/bridge/.env later, not here.

  ---
  Step 1 — Set up MetaMask wallets

  4 accounts in MetaMask:

  ┌────────────────────────┬──────────────────────────────┬─────────────────────┐
  │        Account         │             Role             │     Needs ETH?      │
  ├────────────────────────┼──────────────────────────────┼─────────────────────┤
  │ Account 1 (deployer)   │ Pays for deployment gas      │ ~$10 in ETH on Base │
  ├────────────────────────┼──────────────────────────────┼─────────────────────┤
  │ Account 2 (treasury)   │ Receives 75% commissions     │ No                  │
  ├────────────────────────┼──────────────────────────────┼─────────────────────┤
  │ Account 3 (rewardPool) │ Receives 25% commissions     │ No                  │
  ├────────────────────────┼──────────────────────────────┼─────────────────────┤
  │ Account 4 (minter)     │ Signs every mint() call 24/7 │ ~$25 in ETH on Base │
  └────────────────────────┴──────────────────────────────┴─────────────────────┘

  Switch to Base network in MetaMask (add it if not there: chainId 8453, RPC https://mainnet.base.org). For testnet first: Base
  Sepolia (chainId 84532, RPC https://sepolia.base.org).

  ---
  Step 2 — Set up VaultOp (Gnosis Safe)

  1. Go to safe.global → select Base network → Create new Safe
  2. Add owners: your Account 1 address + Víctor's MetaMask address
  3. Threshold: 2 of 2
  4. Deploy the Safe (costs ~$2–3 in ETH)
  5. Copy the Safe contract address → this is your ADMIN_ADDRESS

  ---
  Step 3 — Fund the deployer and minter wallets

  Buy ETH on an exchange (Coinbase, Binance) and send to:
  - Account 1: ~$15 (covers deployment + a buffer)
  - Account 4: ~$25–50 (covers years of mint() gas)

  For Base Sepolia testnet first: no real ETH needed. Get free test ETH from the Base Sepolia faucet
  (faucet.quicknode.com/base/sepolia or Coinbase's faucet).

  ---
  Step 4 — Create packages/contracts/.env

  BASE_SEPOLIA_RPC_URL=https://sepolia.base.org
  PRIVATE_KEY=<Account 1 private key — never commit this>
  TREASURY_ADDRESS=<Account 2 address>
  REWARD_POOL_ADDRESS=<Account 3 address>
  ADMIN_ADDRESS=<Gnosis Safe contract address>
  MINTER_ADDRESS=<Account 4 address>

  ---
  Step 5 — Deploy to Base Sepolia (testnet first)

  cd packages/contracts
  npx hardhat run scripts/deploy.ts --network base_sepolia

  Output will be:
  Deploying CATRToken...
    Treasury:    0x...
    RewardPool:  0x...
    Admin:       0x...
    Minter:      0x...
  CATRToken deployed to: 0x<CONTRACT_ADDRESS>
  MINTER_ROLE granted to: 0x...

  Copy CONTRACT_ADDRESS → paste into packages/merlink/bridge/.env as CONTRACT_ADDRESS.

  ---
  Step 6 — Verify on Basescan

  Go to sepolia.basescan.org/address/<CONTRACT_ADDRESS> — the contract should be visible. We can also verify the source code there so
   anyone can read it (one extra command).

  ---
  Step 7 — Wire the bridge

  Update packages/merlink/bridge/.env:
  BASE_SEPOLIA_RPC_URL=https://sepolia.base.org
  PRIVATE_KEY=<Account 4 private key — the minter wallet>
  CONTRACT_ADDRESS=<deployed contract address>

  ---
  We do testnet first, confirm everything works, then repeat Steps 4–6 with base_mainnet and real ETH.

  ---
  When you have the 4 wallet addresses ready, come back and we'll fill in the .env together and run the deployment command. The code
  is ready — it's just waiting on those addresses.

✻ Sautéed for 34s

─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
❯ 
─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
  [OMC#4.9.3] | 5h:32%(4h22m) wk:9%(6d18h) | session:27m | ctx:46% | T:53
  ⏵⏵ accept edits on (shift+tab to cycle)
