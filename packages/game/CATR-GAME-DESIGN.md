# CATR — The Game
## Design Document & Claude Code Briefing
**Project:** HNDA / FIDELIO Ecosystem  
**Author:** Cristian Rodriguez  
**Version:** 1.0

---

## 1. What Is CATR The Game?

CATR is an infinite grid survival game built for **mobile and PC simultaneously** (Unity). It is named after the real CATR utility token used inside FIDELIO — Honduras Nativa Digital Answers' loyalty and payment ecosystem running on Base (Ethereum L2).

The game is a **user acquisition and token demand engine** for FIDELIO. Players buy real CATR to play, earn CATR back through skill, and discover the FIDELIO merchant network organically.

---

## 2. Core Game Loop

```
BUY CATR → ENTER GRID → MOVE, ANSWER, SURVIVE → EARN CATR BACK
                              ↑
                    (pay CATR to continue)
```

1. Player buys CATR (real token, promotes FIDELIO)
2. Player enters an infinite colored grid
3. Every cell entered = points
4. Every cell has a color-coded trivia/challenge
5. Answer correctly → move forward
6. Answer wrong → black mist accelerates
7. Answer faster than previous answer → gain time
8. Get trapped or timer hits zero → pay CATR to continue
9. Win streaks / leaderboard → earn CATR rewards
10. Top 100 leaderboard → earn GCA token (burnable for HNL)

---

## 3. The Grid

### Visual Identity
- **Appearance:** Sudoku-style grid (think clean numeric grid, but colored cells)
- **Infinite:** The grid extends infinitely in all directions
- **Dark theme:** Deep black background, glowing colored cells, mist rendered as dark fog

### Movement Rules
- Player moves **one cell at a time** in any direction
- Once a cell is left behind, **the entire row/column behind the player disappears** consumed by the black mist
- **No going back** — every decision is permanent
- Player is always moving forward into uncharted territory

### The Black Mist
- Always present, always approaching from behind
- **Starts slow** — forgiving for new players
- **Accelerates** when player answers wrong
- **Slows slightly** when player answers correctly
- **Baseline speed increases** as score grows (harder the longer you survive)
- When mist catches the player → game over (unless CATR is spent to continue)

---

## 4. Cell Color System

Each cell has a color that tells the player what type of challenge awaits:

| Color | Category | Notes |
|-------|----------|-------|
| 🔴 Red | Pop Culture (celebrities, music, movies, TV) | |
| 🔵 Blue | Math / Logic | |
| 🟢 Green | History | |
| 🟡 Yellow | Sports | |
| 🟣 Purple | Science / Technology | |
| 🟠 Orange | Geography | |
| ⚪ White | Wildcard (random any category) | |
| ⬛ Black | Trap cell — no puzzle, instant time penalty | |

### Difficulty Scaling
- Questions scale in difficulty as **score grows**
- Early game = easy trivia anyone can answer
- Late game = expert-level questions in every category
- Players develop **color preferences** based on their strengths — this is intentional personality design

---

## 5. The Time Mechanic (Hidden Rule)

This is the game's **hidden depth mechanic** — players must discover it themselves:

- Each cell gives the player **10 seconds** to answer at game start
- **If the player answers faster than their previous answer → they gain time**
- **If the player answers slower → nothing happens, mist keeps closing**
- This rule is **never explained** in the UI — players crack it organically
- Creates viral "wait did you know about the time thing?" community moments

### CATR Time Purchase
- Players can spend CATR to **buy extra seconds** when running low
- This is a core monetization moment — tension is high, decision is emotional

---

## 6. Easter Egg — The Light

Deep in the infinite grid, rare and hard to reach:

- After surviving long enough (exact trigger is secret), a **glowing white tile** appears
- Entering The Light → **point multiplier activated**
- The mist **briefly stops** when The Light appears — dramatic moment
- Rare enough to feel legendary
- Creates **viral recording/screenshot moments**
- Could be tied to hidden movement patterns nobody publicly knows

---

## 7. CATR Economy Integration

### Spending CATR (In-Game Store)

| Perk | Cost (CATR) | Description |
|------|-------------|-------------|
| +10 seconds | 5 CATR | Adds time when running low |
| Hint | 10 CATR | Reveals the correct answer |
| Cell Preview | 8 CATR | See one cell's color/type ahead |
| Mist Freeze | 15 CATR | Freezes mist for 3 seconds |
| Continue | 20 CATR | Revive after game over |
| Point Multiplier | 25 CATR | Temporarily boosts points earned |

### Earning CATR (Rewards)

| Achievement | Reward |
|-------------|--------|
| Win 5 rounds in a row | Small CATR reward |
| Reach personal best score | CATR bonus |
| Weekly top 100 leaderboard | GCA token reward |
| All-time top 100 | GCA token reward (larger) |
| Discover The Light (Easter egg) | Surprise CATR drop |

### GCA Token — The Big Prize
- **Top 100 players** on leaderboard earn **GCA** (FIDELIO's growth participation token)
- Players can **burn GCA for real HNL (Honduran Lempiras)**
- This creates a real-money incentive for skilled players
- **LEGAL NOTE FOR VÍCTOR:** This mechanic requires legal review — GCA burn for fiat may have regulatory implications in Honduras. Do not implement GCA→HNL redemption until cleared.

### HNDA Revenue
- **1.8% commission** on all CATR that flows through the game
- Consistent with FIDELIO merchant commission rate
- Revenue scales entirely with player activity and transaction volume

---

## 8. Ranking System

| Leaderboard | Reset | Prize |
|-------------|-------|-------|
| 🏆 All-Time Global | Never | GCA (largest) |
| 📅 Weekly | Every Sunday | GCA (medium) |
| 🎨 Best Per Color Category | Monthly | CATR bonus |
| 👥 Friends | Never | Bragging rights |

---

## 9. FIDELIO Integration Points

The game connects to the real FIDELIO backend:

1. **Player custodial wallet** — same wallet architecture as FIDELIO merchant network. Players don't need MetaMask or crypto knowledge. HNDA manages wallets.
2. **CATR purchase flow** — player buys CATR through FIDELIO's existing payment gateway (BAC Credomatic / manual transfer)
3. **In-game CATR spend** → MerL1nk detects "game_payment" event type → processes as a new event category alongside merchant payments
4. **Reward distribution** → existing reward pool logic handles CATR payouts
5. **GCA rewards** → new event type in backend for leaderboard-triggered GCA minting
6. **1.8% cut** → flows to HNDA treasury wallet automatically

---

## 10. Technical Stack

### Game Engine
- **Unity** — cross-platform (iOS, Android, PC, Mac, WebGL)
- Handles both mobile touch and PC keyboard/mouse natively

### Platform Targets
- iOS (App Store)
- Android (Google Play)
- PC (Steam or standalone)
- WebGL (browser version for discovery)

### Blockchain Integration
- **Base (Ethereum L2)** — same chain as FIDELIO
- **ethers.js** in a bridge layer (same pattern as MerL1nk Bridge)
- Custodial wallets — HNDA manages private keys, players see balances only
- **No MetaMask required** — zero crypto friction for players

### Backend Integration
- New game API routes added to existing FIDELIO Express backend
- New PostgreSQL tables: `game_sessions`, `game_transactions`, `leaderboard`
- MerL1nk gets new event type: `GAME_PAYMENT`
- GCA minting triggered by leaderboard engine (new backend service)

---

## 11. Monorepo Location

Following FIDELIO's Turborepo structure, the game lives at:

```
HNDA/
├── packages/
│   ├── contracts/          # Existing — CATRToken.sol, GCAToken.sol
│   ├── merlink/            # Existing — add GAME_PAYMENT event type
│   ├── backend/            # Existing — add game routes + leaderboard service
│   ├── web/                # Existing — add game portal
│   └── game/               # NEW — Unity project
│       ├── Assets/
│       │   ├── Scripts/    # C# game logic
│       │   ├── Scenes/
│       │   ├── Prefabs/
│       │   └── UI/
│       ├── Packages/
│       └── ProjectSettings/
```

---

## 12. Build Phases

| Phase | What | Deliverable |
|-------|------|-------------|
| **Phase G1** | Grid prototype | Infinite colored grid, movement, mist, no blockchain |
| **Phase G2** | Question engine | Color-coded trivia system, difficulty scaling, timer mechanic |
| **Phase G3** | Hidden mechanics | Time gain rule, The Light Easter egg |
| **Phase G4** | CATR integration | Wallet connect, spend CATR in-game, testnet |
| **Phase G5** | Rewards + Leaderboard | Win streaks, rankings, CATR payouts |
| **Phase G6** | GCA integration | Top 100 GCA rewards (pending legal clearance) |
| **Phase G7** | Polish + Launch | Mobile builds, PC build, App Store submission |

---

## 13. Session Start Ritual (for Claude Code)

Before every session:
1. Report current game build phase (G1 through G7)
2. Review last session's decisions in CLAUDE.md
3. State what we are building today and why it connects to FIDELIO macro vision
4. Show plan before writing any code

---

## 14. Key Decisions Already Made

| Decision | Rationale |
|----------|-----------|
| Game named "CATR" | Marketing fusion — game and token are inseparable |
| Unity engine | Best cross-platform (mobile + PC) for a grid game |
| 1.8% commission | Consistent with FIDELIO merchant rate — one unified ecosystem rate |
| Custodial wallets | Zero crypto friction — players don't need wallets or MetaMask |
| Hidden time mechanic | Creates organic discovery and community discussion |
| GCA for top 100 | Creates real-money incentive — pending Víctor legal review |
| No gambling mechanics | Skill-based only — legally safer, by design |
| Color-coded cells | Visual language players learn — replayability and personality |
| Black trap cells | Risk/reward navigation — no puzzle, just penalty |
| The Light Easter egg | Viral moment, legendary status, community mystery |

---

## 15. Open Questions (Do Not Build Until Resolved)

1. **GCA → HNL burn redemption:** Needs Víctor (lawyer) legal clearance before implementation
2. **CATR price in HNL:** Exchange rate determines real-world value of rewards — pending FIDELIO economics finalization
3. **Trivia question database:** Where do questions come from? Manual curation? API? (Suggestion: Open Trivia DB API as starting point)
4. **App Store policies:** Apple and Google have specific rules about crypto/token purchases in apps — needs research before Phase G7

---

*This document is the source of truth for CATR The Game. Update after every Claude Code session with decisions made.*
