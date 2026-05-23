# CLAUDE.md

Behavioral guidelines to reduce common LLM coding mistakes. Merge with project-specific instructions as needed.

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

## 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:
- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

## 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

## 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

## 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:
- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:
```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

---

**These guidelines are working if:** fewer unnecessary changes in diffs, fewer rewrites due to overcomplication, and clarifying questions come before implementation rather than after mistakes.

---

# CATR — Project-Specific Context

The four principles above are universal. Everything below is CATR-specific.

## 5. Project Identity

**CATR The Game** is an infinite Sudoku-style grid survival game built in Unity for mobile + PC. It is a **user acquisition and token demand engine** for **FIDELIO** — HNDA's closed-loop HNL loyalty/payment network on **Base (Ethereum L2)**.

The game and the CATR token are inseparable by design: playing requires real CATR, skill earns real CATR back, top-100 leaderboards earn GCA (burnable for HNL, pending legal clearance).

Source of truth for game design: `CATR-GAME-DESIGN.md`. Update it after every session with decisions made.

## 6. Session Start Ritual

Before writing any code in a session:

1. **Report current build phase** (G1 through G7 — see design doc §12).
2. **Review last session's decisions** appended to this file's Decision Log.
3. **State what we are building today** and how it connects to the FIDELIO macro vision.
4. **Show the plan before writing any code.** Get approval. Then implement.

## 7. Architectural Anchors

- **Engine:** Unity (C#) — cross-platform iOS / Android / PC / WebGL from a single codebase.
- **Monorepo location:** `HNDA---FIDELIO/packages/game/` inside the existing FIDELIO Turborepo (sibling to `backend`, `contracts`, `e2e`, `merlink`, `web`). Do not create a separate repo. The earlier `HNDA-CATR/` scratch folder has been retired.
- **Chain:** Base (Ethereum L2) — same as FIDELIO. No other chains.
- **Wallets:** Custodial. HNDA manages keys. Players never see MetaMask, seed phrases, or gas.
- **Bridge layer:** ethers.js, mirroring the MerL1nk Bridge pattern. Do not invent a new pattern.
- **Backend:** Extend the existing FIDELIO Express backend. New PostgreSQL tables: `game_sessions`, `game_transactions`, `leaderboard`.
- **Event bus:** MerL1nk gets a **new event type `GAME_PAYMENT`** — do not overload existing merchant event types.

**Naming rule (from global CLAUDE.md):** name things for what they operate, not what implements them. `LeaderboardEngine`, not `PostgresLeaderboardService`.

## 8. Hard Constraints — Do Not Violate

- **No GCA → HNL redemption code** until Víctor (lawyer) clears it. Stub the interface, do not implement the burn-to-fiat path.
- **No gambling mechanics.** Skill-based only. This is a legal moat — do not propose features that erode it.
- **1.8% HNDA commission is fixed** — same rate as FIDELIO merchants. Do not parameterize it without explicit approval.
- **Hidden time mechanic stays hidden.** Never surface "answer faster to gain time" in UI, tooltips, tutorials, or help text. This is intentional.
- **Custodial-only.** Do not add MetaMask, WalletConnect, or any self-custody flow without explicit approval.
- **Do not build items in design doc §15 (Open Questions)** until they are resolved.

## 9. Modularity Mandate

From global collaboration rules: **modularity is the core principle.** For CATR specifically:

- Grid logic, question engine, mist controller, economy/wallet bridge, leaderboard, and rendering must be independently buildable, testable, and replaceable.
- A change to the question engine must not require touching grid movement code.
- A change to the CATR economy must not require touching gameplay code.
- If a module cannot be restarted in isolation, the boundary is wrong.

## 10. Collaboration Rules (CATR Echo)

Reinforcing the global rules in project context:

- **Plan before code** — always. Even for "small" Unity scripts.
- **Explanation before action** — justify the decision before implementing it.
- **ELI5** when explaining abstract systems (blockchain bridges, MerL1nk events, leaderboard logic).
- **Decision report after each decision** — append to the Decision Log below, concise: what + why.

## 11. Decision Log

Append-only. Newest entries at the top. Format:

```
### YYYY-MM-DD — [Short title]
**Decision:** What was decided.
**Why:** Reasoning.
**Phase:** G1 / G2 / ... / cross-cutting.
```

<!-- New entries go here -->

### 2026-05-23 — Engine class named `GridWorld` (not `GridEngine`, not `Grid`)
**Decision:** The world/state class is `Catr.GridEngine.GridWorld`. Module / folder / asmdef stay called `GridEngine`.
**Why:** Class name `GridEngine` collided with its own namespace (`CS0118: namespace used like a type`). Renamed to `Grid` — but `UnityEngine.Grid` exists (Tilemap system), triggering `CS0104: ambiguous reference`. `GridWorld` is descriptive (it IS the world state), reads cleanly (`engine.Engine.PlayerPosition`), and collides with neither. Lesson: never name a class identically to its containing namespace.
**Phase:** G1.

### 2026-05-23 — Totem art deferred to post-G3 art-direction review
**Decision:** G1 totem = plain cyan circle. Final character/pawn art is **not** decided now.
**Why:** Cristian asked about 3D pawn. Implications analysis surfaced that this is an art-direction decision, not a totem-swap: 2D-flat / 2D-with-character / tilted-isometric-3D are different *games* with different camera setups, different render pipelines (URP 2D vs URP 3D), and different asset pipelines. Decision blocked on having playable gameplay (post-G3, after mist + puzzles) to react to. Three paths identified, all viable.
**Phase:** G5 / G7 (art).

### 2026-05-23 — Active Input Handling = `Both` for G1 sandbox
**Decision:** Unity Player Settings → Active Input Handling = *Both* during the G1 sandbox phase. Sandbox driver stays on legacy `UnityEngine.Input.*`.
**Why:** Unity 6 defaults to the new Input System Package; legacy `Input.GetKeyDown` throws every frame under that setting. Two options: port the throwaway sandbox driver (~30 extra lines for code we'll delete) or flip the project to `Both` (one setting, zero new code). Chose `Both` because the real `InputAdapter` module (post-G1) will use the new system properly — polishing throwaway code is wasted work. Yellow deprecation warning is acceptable; zero errors. Revisit when sandbox is deleted.
**Phase:** G1 / cross-cutting.

### 2026-05-23 — Folder name `game/` vs branded name `CATR!`
**Decision:** Unity project folder stays `packages/game/` (Linux path, monorepo convention, no shell-escaping pain). The branded identity `CATR!` lives in Unity's Player Settings (`Product Name: CATR!`, `Company Name: HNDA`) — the name users see on phone home screens, Steam library, window titles.
**Why:** `!` triggers bash/zsh history expansion — every `cd packages/CATR!/...` command would require single-quoting forever, including every Claude bash call. Folder name = dev convention; display name = brand. Standard practice in shipped Unity projects.
**Phase:** G1 / cross-cutting.

### 2026-05-23 — Render pipeline: URP 2D (not Built-In)
**Decision:** Project created from the **Universal 2D** template. URP is active, Built-In Render Pipeline rejected.
**Why:** Initial plan was Built-In (leaner for flat-colored quads). Reversed on seeing Unity Hub's banner: Built-In is **deprecated from 6.5 onward, supported only through 6.7 LTS**. The wider Unity ecosystem (asset store, shader libraries, tutorials) is migrating off Built-In. Perf delta is invisible for 2D grid rendering. URP = no future migration debt for zero present cost. CATR is a multi-year product; starting on a deprecated pipeline = manufactured tech debt.
**Phase:** G1.

### 2026-05-23 — Pinned Unity 6.3 LTS (6000.3.16f1) for the project lifecycle
**Decision:** Use **Unity 6.3 LTS (6000.3.16f1)** as the Editor version for G1 through G7. Do not upgrade mid-project without an explicit Decision Log entry.
**Why:** LTS = ~2yr patch window, frozen feature set, bug-fix-only — what shipped games sit on. Rejected Unity 6.4 ("Recommended" by Hub) because it's Tech Stream — ~6mo patches then end-of-support, forcing mid-project upgrades. Rejected 6.0 LTS as older with no advantage. CATR is a product, not a sandbox.
**Phase:** Cross-cutting.

### 2026-05-23 — Game lives inside the FIDELIO monorepo
**Decision:** Moved game project files (`CATR-GAME-DESIGN.md`, `CLAUDE.md`, `Sessions-CATR-log.md`) into `HNDA---FIDELIO/packages/game/` as a sibling to `backend`, `contracts`, `e2e`, `merlink`, `web`. Retired the standalone `HNDA-CATR/` scratch folder. Updated §7 to reflect the real monorepo path.
**Why:** Honors the original "do not create a separate repo" constraint. Unity/C# cannot import TS directly anyway, so cross-stack sharing happens via HTTP API + on-chain contracts regardless of location — but co-location enables atomic commits when the backend's new `GAME_PAYMENT` event and the Unity bridge evolve together. Zero sunk cost since Unity wasn't installed yet.
**Phase:** Cross-cutting.

### 2026-05-22 — .NET 10 LTS as the SDK
**Decision:** Use **.NET 10 LTS** (system package `dotnet-sdk-10.0` on Ubuntu 26.04) for all C# tooling outside Unity. Initial plan was .NET 8 LTS as a conservative default; switched once we confirmed .NET 10 is LTS (Nov 2025 release, supported until Nov 2028) and ships natively in Ubuntu 26.04's main repos.
**Why:** Longer support window (2028 vs 2026), no need to add Microsoft's third-party apt repo, cleaner system. Unity bundles its own runtime so the SDK choice only affects tooling/IDE — newer is strictly better here.
**Phase:** Cross-cutting.

### 2026-05-22 — Language stack: C# / TypeScript / Solidity
**Decision:** Game code in **C#** (Unity's first-class language). Backend extensions in **TypeScript** (existing FIDELIO Express). New contracts in **Solidity** (existing pattern). Rust is explicitly rejected for the game.
**Why:** Unity does not support Rust as a scripting language — adopting it would mean fighting the engine. CATR's bottlenecks are gameplay feel, content, and economy integration, not raw performance. Keeping the ecosystem to three languages minimizes boundaries and matches existing FIDELIO conventions.
**Phase:** Cross-cutting.

### 2026-05-22 — The Light Easter egg
**Decision:** A rare glowing white tile appears deep in the grid; entering it activates a point multiplier and briefly freezes the mist.
**Why:** Creates a legendary, viral, screenshot-worthy moment and community mystery.
**Phase:** G3.

### 2026-05-22 — Black trap cells
**Decision:** Black cells carry no puzzle — only an instant time penalty.
**Why:** Adds risk/reward navigation without bloating the question system.
**Phase:** G1 / G2.

### 2026-05-22 — Color-coded cells (8 categories)
**Decision:** Cells are colored by trivia category (Red/Pop, Blue/Math, Green/History, Yellow/Sports, Purple/Sci-Tech, Orange/Geo, White/Wildcard, Black/Trap).
**Why:** Builds a visual language players learn; enables personality and replayability through color preference.
**Phase:** G1 / G2.

### 2026-05-22 — No gambling mechanics
**Decision:** The game is skill-based only. No chance-based wagering of CATR.
**Why:** Legally safer in Honduras and across app stores; protects FIDELIO's regulatory posture by design.
**Phase:** Cross-cutting.

### 2026-05-22 — GCA rewards for top 100
**Decision:** Top 100 leaderboard players earn GCA, FIDELIO's growth participation token. GCA→HNL burn is **pending Víctor's legal review** and must not be implemented yet.
**Why:** Real-money incentive for skilled players, but the fiat redemption path carries regulatory risk that requires clearance first.
**Phase:** G6.

### 2026-05-22 — Hidden time mechanic
**Decision:** Answering faster than the previous answer grants extra time. This rule is never explained in UI.
**Why:** Creates organic discovery, community discussion, and viral "did you know?" moments.
**Phase:** G3.

### 2026-05-22 — Custodial wallets
**Decision:** HNDA manages all player wallets and private keys. No MetaMask, no seed phrases, no gas.
**Why:** Zero crypto friction — onboarding non-crypto players is the entire user-acquisition thesis.
**Phase:** G4.

### 2026-05-22 — 1.8% HNDA commission
**Decision:** HNDA takes a 1.8% commission on all CATR flowing through the game.
**Why:** Consistent with the FIDELIO merchant commission rate — one unified ecosystem rate, no special cases.
**Phase:** Cross-cutting.

### 2026-05-22 — Unity engine
**Decision:** Build in Unity (C#) targeting iOS, Android, PC, Mac, and WebGL from one codebase.
**Why:** Best cross-platform option for a grid-based game; native handling of touch and keyboard/mouse.
**Phase:** Cross-cutting.

### 2026-05-22 — Game named "CATR"
**Decision:** The game shares its name with the CATR token.
**Why:** Marketing fusion — the game and the token are inseparable, every player interaction reinforces token awareness.
**Phase:** Cross-cutting.
