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
3. **Check for an active phase plan.** If `packages/game/G{N}-plan.md` exists for the current phase, read it. Resume execution from the first unchecked progress item. If a plan does not exist for the current phase, the session likely opens with designing one.
4. **State what we are building today** and how it connects to the FIDELIO macro vision.
5. **Show the plan before writing any code.** Get approval. Then implement.

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

### 2026-05-26 — B1 design questions locked: (a)/(a)/(a)
**Decision:** Q1 mist motion: timer keeps ticking AND answers shove it (standing still = death). Q2 wildcard re-skin owner: `GridEngine`. Q3 tier-hint visibility owner: `GridEngine`.
**Why:** Wildcard and tier hints are gameplay-world properties — they change behavior, cell appearance, and player decisions. They belong in the engine. Renderer stays a pure paintbrush; `QuestionEngine` only fetches questions and reports outcomes. Standing-still-=-death keeps the survival metaphor intact ("player has to keep on playing").
**Phase:** G2 / B1.

### 2026-05-26 — B1 shipped: GridEngine extension for the question engine
**Decision:** `GridWorld` extended with `AttemptPuzzle(target, correct, answerTime)`, `ShoveMist(cells)`, `GetTileMetadata(target)`, ratchet (monotonic per-run, rolling-avg-3 speed, 4-band lookup), wildcard re-skin (off-ratchet, forces Tier=5, RNG stream keyed on `(seed, column, row, Tier5AnsweredCount)`), hint visibility (`0.20 + 0.15*(tier-1)`, truthful), mist runway (starts at 10, +1 correct, −2 wrong), frontier metadata snapshot at reveal, new `GameOverReason` enum (MistContact | FrontierExhausted). `ResolvePuzzle` kept as `[Obsolete]` shim until B5 rewires `InputAdapter`. Tuning constants (`WildcardPCap`, `WildcardK`, `InitialMistRunway`, ratchet bands) marked `internal const` for one-file G3 retuning. 21/21 tests green (11 G1 + 10 new).
**Why:** Engine boundary stays pure C# / no Unity deps / no network — gameplay-world state owned in one place, downstream modules just read via `GetTileMetadata` and write via `AttemptPuzzle`. Surgical extension: every existing G1 caller still works through the obsolete shim, every existing test still passes.
**Phase:** G2 / B1.

### 2026-05-23 — G2 plan approved; backend-first execution
**Decision:** Full G2 plan lives in `packages/game/G2-plan.md` (Track A backend → Track B Unity → C convergence). Approved as-is. Execution begins with A1 (Prisma schema). CLAUDE.md §6 updated to instruct future sessions to read `G{N}-plan.md` and resume from the first unchecked progress item.
**Why:** Plan-document size would otherwise crowd CLAUDE.md. Separating plan (in `G{N}-plan.md`) from rules+decisions (CLAUDE.md) keeps both readable. "Camina, las cargas se arreglan en el camino" — start moving, iterate against contact with reality.
**Phase:** G2 / cross-cutting (Session Start Ritual updated).

### 2026-05-23 — Question source: server-side delivery, curated catalog
**Decision:** Questions live in the FIDELIO Postgres DB and ship to the client one at a time via Express endpoints. Client never holds the catalog. Seed = ~100 hand-authored bilingual questions; local-AI pool maintenance deferred to G6.
**Why:** Static client-side catalogs leak via APK decompile (HQ Trivia, Trivia Crack pattern). Server delivery + curation is the industry standard for prize-money trivia. Also honors the Sovereignty principle — Honduran data on Honduran infrastructure.
**Phase:** G2.

### 2026-05-23 — Question format: MC-4 + T/F, no free-text, bilingual
**Decision:** Two formats. MC-4 is the standard load; T/F injected randomly every ~5–8 questions (capped, can't be farmed). No free-text (brutal on mobile). Bilingual day one: `prompt_es` / `prompt_en`, mirrored answer arrays.
**Why:** MC-4 is mobile-native and skill-legible. T/F gives a perceived breather but still carries risk (wrong T/F still costs). Bilingual is cheap now, painful to retrofit later.
**Phase:** G2.

### 2026-05-23 — Difficulty ratchet: monotonic per-run, driven by speed
**Decision:** 5 tiers. Ratchet is monotonic per-run with no turn-around. Speed metric = rolling average of last 3 answer times. Buy-in sets *base* difficulty (not ramp slope). Tile tier locks at frontier-reveal time (snapshot), not at click time.
**Why:** "Treadmill where the incline is your own sprint." Punishes greedy speedrunning; rewards self-pacing. Per-run reset keeps every run interesting. Base-by-buy-in keeps low-stake runs accessible (practice mode); ramp-slope-by-buy-in would burn out high-stake players unfairly. Snapshot at reveal preserves the truthfulness of tier hints.
**Phase:** G2 (formula constants tuned in G3).

### 2026-05-23 — Depletion fallback: controlled repeat within bucket
**Decision:** When (category, tier) bucket is exhausted for a player, serve the oldest-served question from that same bucket. No cross-category substitution. No tier promotion/demotion.
**Why:** Category is absolute (cell color = pool, no lying to the player). Tier is absolute (no cheapening the ratchet). Controlled repeat is the only honest escape valve. Brutal hard-fail would also work but pushes the local-AI workload artificially earlier.
**Phase:** G2.

### 2026-05-23 — Wildcard side-channel
**Decision:** Cell category stays deterministic per `(seed, x, y)`; wildcards override at frontier-reveal as a *player-state-driven* re-skin. Wildcard tiles are off-ratchet, always tier 5, random category, reward = CATR + Time combo. Frequency = `min(P_cap, k × N_tier5_answered × speed_factor)`. Constants tuned in G3.
**Why:** Two players with the same seed get different wildcard placements, but the underlying world (categories) is still deterministic — memory-strategy invariant preserved. Off-ratchet keeps wildcard as a pure side-channel (greedy hunting doesn't compound the difficulty climb). Tying frequency to (tier-5 answers × speed) means sustained tier-5 fluency is the gateway to bonus rewards — "the climb pays for itself."
**Phase:** G2 (constants in G3).

### 2026-05-23 — The Light revised: gold/silver tile, stops mist briefly
**Decision:** *The Light* (rare easter-egg tile from 2026-05-22) is now gold/silver, not white. On entry: briefly stops the mist (a "break"). Visually distinct from Wildcard (which stays white).
**Why:** Both being white collapsed the visual language. Renaming The Light by color separates the two channels cleanly: white = bonus-currency wildcard; gold/silver = legendary break. Revises the 2026-05-22 entry.
**Phase:** G3.

### 2026-05-23 — Wrong-answer mechanic: −2s, tile consumed, 3-strike fail
**Decision:** Wrong answer → mist jumps forward 2 cells (mist is the source of truth, clock is visualization) + the chosen frontier tile is consumed. If all 3 frontier tiles are consumed → run lost (second game-over path alongside mist contact).
**Why:** Spatial-mist-as-source-of-truth means there's no separate clock to desync from gameplay; player sees their remaining budget at all times. Tile consumption gives the wrong-answer act a visible permanent cost. Three-strike fail caps frontier dwell time without needing a per-frontier timer.
**Phase:** G2.

### 2026-05-23 — UI: in-grid card, just-in-time fetch, mist keeps ticking
**Decision:** Question card appears in-grid (above the clicked tile), not as a modal overlay or side panel. Clicking another frontier tile dismisses the current card and shows that tile's card. Fetch is just-in-time per click (no pre-fetch). Mist keeps ticking during the question.
**Why:** In-grid keeps the player's eyes on the threat (mist). Just-in-time avoids 3× catalog drain that pre-fetching all 3 frontier questions would cause; the player must commit to a tile before seeing its question, which is itself a strategic decision under time pressure. Pausing mist would neuter the survival pressure.
**Phase:** G2.

### 2026-05-23 — Tier hints: always-visible badge, truthful, more at high tier
**Decision:** Each frontier tile shows a small tier badge (e.g., "T3") when `HintVisible == true`. Probability of `HintVisible` rises with current tier (high stakes deserve high signal). Tier only — no kind/wildcard flags. Always truthful (no misleading hints). Black trap tiles get no extra hint; the color is the warning.
**Why:** Surfaces partial info, lets the community discover the ratchet pattern through play — same philosophy as the hidden time mechanic. Truthful hints preserve the trust contract; misleading hints would collapse into ignored noise. Higher hint density at high tier rewards the player who climbed with situational awareness.
**Phase:** G2.

### 2026-05-23 — InputAdapter shipped; single-step warmup, click = correct in G1
**Decision:** `InputAdapter` is a MonoBehaviour that polls `Pointer.current` (new Input System), maps screen→grid via a new public `GridRendererBehaviour.ScreenToGridCoord` helper, and routes clicks: Warmup → single-step `TryWarmupMove` if `dy == ±1` on column 0, or `Commit` if clicking column-1 frontier; Running → `ResolvePuzzle(target, correct: true)` for any frontier click. Sandbox keyboard driver demoted to "debug driver" — kept until the question engine arrives because mouse can't express "wrong answer."
**Why:** Decouples intent from input device. Same `GridWorld` is now driven by mouse on desktop and finger on Android with zero branching (`Pointer.current` resolves to whichever is active). Single-step warmup chosen over free-jump because it (a) preserves the engine's existing API contract, (b) matches W/S parity, and (c) Cristian wants Warmup to feel like deliberate exploration, not teleportation. "Click = correct" is a G1 placeholder; G2 will route clicks into the question engine, which then calls `ResolvePuzzle` with the real outcome.
**Phase:** G1.

### 2026-05-23 — Renderer maps engine row 0 to world-top (Y-flip)
**Decision:** `GridRendererBehaviour.CellWorldPos` now uses `(rowCount - 1 - c.Y) * cellSize` for the Y component, so engine row 0 renders at the top of the world and row N-1 at the bottom. Camera centering unchanged (range is identical). Also added a `if (Engine == null) return;` guard at the top of `LateUpdate` to survive Unity's assembly hot-reload during Play.
**Why:** Engine treats Y=0 as the top row (`TryWarmupMove(Up) → Y - 1`); the original renderer mapped Y=0 to world-bottom, so W moved the totem visually down and S moved it visually up. Inverting the mapping at the renderer keeps the engine untouched — Y semantics stay "row index from the top," which is how the engine, tests, and design doc all read. Null guard fixed a NullReferenceException at line 65 after a hot-recompile nuked the `Engine` field mid-Play.
**Phase:** G1.

### 2026-05-23 — MistController shipped; interval = 2.3s placeholder
**Decision:** `MistController` is a thin MonoBehaviour that ticks every `intervalSeconds` and calls `GridWorld.ConsumeColumn(mistFrontX++)` while `Phase == Running`. Default interval = **2.3s**, explicitly a placeholder pending trivia integration. Real tuning happens in G3 when questions add cognitive load.
**Why:** Without puzzles, 5s feels sluggish and 2s feels frantic; 2.3s is a sane placeholder. The right pacing is a function of how long a player needs to read+answer a trivia card — undefined until G3. Module is intentionally trivial (no acceleration curve, no pause, no visual fog) so it can be replaced wholesale when the economy/difficulty system arrives.
**Phase:** G1 / retuned in G3.

### 2026-05-23 — Warmup keeps player cell black until commit
**Decision:** `GridWorld.GetCellView` now checks `WarmupBlack` (Phase==Warmup && X==0) **before** the `Entered` (cell == PlayerPosition) check. Column 0 is now uniformly black during Warmup, including the player's tile.
**Why:** Previous order leaked the player's underlying category color through `Entered`, breaking the "column 0 is unrevealed scaffolding until you commit" invariant. The `Entered` state only matters once Running starts (column 0 is gone by then), so reordering is safe. Test `Spawn_PlayerAtMiddleRowOfColumnZero_PhaseWarmup` updated to assert all 9 rows of column 0 are `WarmupBlack` (no more `y == 4` skip). 11/11 NUnit green.
**Phase:** G1.

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
