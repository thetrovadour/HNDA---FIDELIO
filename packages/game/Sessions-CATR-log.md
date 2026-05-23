# CATR — Session Log Archive

Append-only chronological record of every Claude Code session on the CATR project. Newest sessions at the top.

**Purpose:** Narrative continuity between sessions. The *what happened and why* that doesn't fit in `CLAUDE.md` (rules) or `CATR-GAME-DESIGN.md` (design truth).

**Companion files:**
- `CLAUDE.md` — behavioral rules + Decision Log (terse, append-only).
- `CATR-GAME-DESIGN.md` — game design source of truth.
- `Sessions-CATR-log.md` — *this file*, the running session narrative.

---

## Session Entry Template

```
## YYYY-MM-DD — [Session Title]
**Phase:** G1 / G2 / ... / cross-cutting
**Duration:** ~Xh (optional)
**Participants:** Cristian, Claude

### Goal
What we set out to do this session.

### What Happened
Chronological notes — decisions, detours, blockers, surprises.

### Decisions Made
- Short bullets. Mirror anything important into `CLAUDE.md` §11 Decision Log.

### Artifacts Touched
- `path/to/file` — what changed and why.

### Open Threads
Things left unresolved, to pick up next session.

### Next Session Starts With
A clear, actionable opener for the next session.
```

---

## 2026-05-23 — G1 Warmup Patch + `MistController` Shipped
**Phase:** G1 (75% — three of four modules live)
**Participants:** Cristian, Claude

### Goal
Two surgical pieces: (1) fix the warmup-player-cell color leak so column 0 stays uniformly black until commit; (2) ship `MistController` so trailing columns auto-consume on a timer and the engine's existing GameOver path actually triggers in play.

### What Happened
1. Session-start ritual: confirmed Game track, summarized the last 3 sessions, proposed warmup-patch-then-MistController order. Approved.
2. **Warmup patch.** Root cause in `GridWorld.GetCellView`: the `c == PlayerPosition → Entered` check ran *before* the `Phase == Warmup && c.X == 0 → WarmupBlack` check, so the player's column-0 cell leaked its underlying category color. Swapped the two `if` blocks. Updated `Spawn_PlayerAtMiddleRowOfColumnZero_PhaseWarmup` to assert all 9 column-0 rows are `WarmupBlack` (removed the `y == 4` skip).
3. **Sidecar `dotnet test` verification.** No standalone csproj lives in the repo; recreated a temp NUnit project under `/tmp/catr-gridengine-test`, copied the 7 engine sources + test file, pinned `NUnit 3.14.0` (Unity ships NUnit 3; `dotnet new nunit` pulls NUnit 4 which dropped classic `Assert.AreEqual`). **11/11 green.** First attempt failed with a zsh `no matches found: *` glob — fixed by removing the pre-clean `rm -rf *` and just deleting the dir wholesale.
4. **MistController plan-before-code.** Defined the module boundary tightly: knows only `Engine.PlayerPosition.X` (read), `Engine.ConsumeColumn(x)` (write), and `Time.deltaTime`. Does NOT know about rendering, puzzles, or input. Renderer's existing `ColumnConsumed` subscription paints consumed columns black with zero renderer changes — clean validation of the Modularity Mandate.
5. **Wrote `MistController`** — 2 files, ~25 lines total: `MistController.asmdef` (references `GridEngine` + `GridRenderer`) and `MistControllerBehaviour.cs`. Activates only in `Running`, ticks every `intervalSeconds`, calls `ConsumeColumn(mistFrontX++)`. No acceleration curve, no pause, no visual fog — pure G1 placeholder.
6. **Sandbox cleanup.** Removed the now-redundant `M` hotkey (manual `ConsumeColumn`) from `G1SandboxDriver`; mist supersedes it. Removed the `.gitkeep` placeholder from `Assets/Scripts/MistController/`.
7. **Pacing dialogue.** Started at 5.0s — Cristian called it "too slow." Walked through the live-edit workflow (Inspector serialized field, Play-mode edits are discarded on Stop, edit-while-stopped + save scene to persist). Cristian settled on **2.3s** with the explicit observation: *"the real definition of that comes when adding the questions and the answers."* Filed as a G3 retuning task.
8. **End-to-end verified by Cristian in Editor.** Column 0 is now uniformly black during Warmup (including the player's cell). Mist eventually reaches the player and Play stops responding to inputs — engine flipped to `GameOver` as designed.

### Decisions Made
*(Mirrored into `CLAUDE.md` §11 Decision Log)*
- **Warmup keeps player cell black until commit.** `WarmupBlack` check precedes `Entered` check in `GetCellView`. Test updated.
- **MistController shipped; interval = 2.3s placeholder.** Real pacing tuning deferred to G3 alongside trivia integration. Module is intentionally trivial so it can be replaced wholesale when difficulty/economy systems arrive.

### Artifacts Touched
- `packages/game/Assets/Scripts/GridEngine/GridEngine.cs` — reordered two `if` blocks in `GetCellView`.
- `packages/game/Assets/Scripts/GridEngine/Tests/GridEngineTests.cs` — `Spawn_PlayerAtMiddleRowOfColumnZero_PhaseWarmup` now asserts all 9 column-0 rows are `WarmupBlack`.
- `packages/game/Assets/Scripts/MistController/MistController.asmdef` — new, references `GridEngine` + `GridRenderer`.
- `packages/game/Assets/Scripts/MistController/MistControllerBehaviour.cs` — new, ~25 lines.
- `packages/game/Assets/Scripts/MistController/.gitkeep` — removed.
- `packages/game/Assets/Scripts/GridRenderer/Sandbox/G1SandboxDriver.cs` — removed `M` hotkey + header line.
- `packages/game/Assets/Scenes/G1_GridSandbox.unity` — Cristian added `MistController` GameObject, wired `GridRoot` into its `gridRenderer` field, set `intervalSeconds = 2.3`.
- `packages/game/CLAUDE.md` — 2 new Decision Log entries.
- `packages/game/Sessions-CATR-log.md` — this entry.

### Open Threads
- **Last G1 module empty:** `InputAdapter/` — replace the throwaway keyboard sandbox driver with the new Input System for click-to-pick-tile. Required before any non-Cristian playtest.
- **Mist interval (2.3s) is a placeholder** — real tuning happens in G3 when trivia cards add cognitive load (read + decide takes seconds, not key-mashing milliseconds).
- **Tests not yet runnable inside Unity Test Runner UI** — passing under sidecar `dotnet test`, but Test Runner asmdef wiring still unconfirmed.
- **Trivia question source still unresolved** (design doc §15.3).
- **GCA→HNL redemption** blocked pending Víctor's legal review.

### Next Session Starts With
G1 is now ~75% done. Final G1 module is **`InputAdapter`** — port the keyboard sandbox driver to the new Input System with click/tap-to-pick-tile, so a real human (mouse on desktop, finger on Android) can play without `1/2/3` hotkeys. After that, G1 is sealed and G2 (question engine) begins.

---

## 2026-05-23 — G1 First Modules: `GridEngine` + `GridRenderer` Playable
**Phase:** G1 (first real gameplay modules)
**Participants:** Cristian, Claude

### Goal
Write the first two G1 modules from scratch: a pure-C# `GridEngine` (the world model) and a Unity `GridRenderer` (the visualization), wire them in `G1_GridSandbox`, and prove the engine→renderer chain works end-to-end with a keyboard sandbox driver.

### What Happened
1. Picked up from prior session — Unity project skeleton in place, four empty module folders, no code.
2. **Plan-before-code negotiation on `GridEngine`.** Claude initially proposed a generic "infinite plane, player at origin, free 4-directional movement" model. Cristian rewrote the brief: 9 rows × ∞ columns, player starts on the left, only 3 forward-adjacent tiles ever choosable, no backwards movement, mist eats trailing columns. Resolved 6 ambiguities (wrong-answer behavior, adjacency definition, sideways movement, spawn position, grid-height ownership, starting row) before writing a line.
3. **Warmup-phase rule clarified.** Column 0 starts black; player can scroll up/down freely (no puzzles); the 3 forward-adjacent tiles in column 1 are colored *relative to current row* and slide with him; commit (tap any column-1 tile) ends warmup, column 0 becomes Spent, game starts.
4. **Critical determinism rule:** sliding the player vertically does NOT re-roll colors. Each `(x, y)` cell has a category fixed by a seeded integer hash. Cristian wanted memory-based strategy to actually work.
5. **Wrote `GridEngine` module:** 9 files in `Assets/Scripts/GridEngine/` — `GridCoord`, `CellCategory` (8 colors), `VisualState` (6-state cell lifecycle: WarmupBlack → Unrevealed → Revealed → Entered → Spent → Consumed), `GamePhase`, `VerticalDir`, `CellView` (read-only projection), `GridWorld` (the engine class), and an `.asmdef` with `noEngineReferences: true` — compile-time guarantee no rendering code can leak in.
6. **Wrote 11 unit tests** (NUnit) covering: spawn, warmup vertical move, top-edge clamping, sliding-doesn't-re-roll determinism, commit transition, correct/wrong puzzle resolution, edge-row frontier (2 cells instead of 3), per-seed reproducibility, column-consumption GameOver, and `PlayerMoved` event ordering.
7. **Verified the engine in isolation with `dotnet test`** (NUnit 3 pinned — Unity ships NUnit 3, `dotnet new nunit` pulls NUnit 4 which dropped the classic `Assert.AreEqual` API). 11/11 green. Caught one real bug pre-Unity: `h *= 0x846ca68b` failed because the literal exceeds `int.MaxValue` (interpreted as `uint`), even inside `unchecked`. Fixed with `unchecked((int)0x846ca68b)`.
8. **Plan-before-code on `GridRenderer`.** Renderer = `MonoBehaviour` that owns the `GridWorld`, subscribes to its 3 events, draws a sliding 9-row × 9-column window of `SpriteRenderer` quads, lerps totem + camera. Sprites generated procedurally in `Awake` (1×1 white square + procedurally rasterized circle) — no asset import required.
9. **Totem art digression.** Cristian floated "what if the totem is a 3D pawn?" Claude pushed back with a full implications analysis: URP 2D vs URP 3D (different render pipelines), top-down ortho camera + 3D pawn = pointless (you only see the top), 2D vs 2D-with-character vs tilted-isometric-3D are different *games* not different totems. Concluded: this is an **art-direction decision** that should wait until after G3 (mist + puzzles working) when there's playable material to react to. For G1: plain cyan circle. Logged as a deferred decision.
10. **Wrote `GridRenderer` module:** 4 files in `Assets/Scripts/GridRenderer/` — `CategoryPalette` (8 sandbox colors), `GridRendererBehaviour` (MonoBehaviour), `.asmdef` (references `GridEngine`, allows `UnityEngine`), `Sandbox/G1SandboxDriver.cs` (throwaway keyboard driver — header comment flags it for deletion when `InputAdapter` ships).
11. **Tried Unity batchmode compile to verify renderer syntax.** Unity exited after path-change because `-quit` without `-executeMethod` doesn't trigger an asset import. Skipped — Editor open is faster.
12. **Three real bugs surfaced once Cristian hit Play:**
    - `GridEngine.Tests.asmdef` had both `references: [..., "UnityEngine.TestRunner", "UnityEditor.TestRunner"]` AND legacy `optionalUnityReferences: ["TestAssemblies"]` → duplicate references. Removed the legacy field.
    - `Catr.GridEngine.GridEngine` — class name matches namespace, causes `CS0118: 'GridEngine' is a namespace but is used like a type`. Renamed class to `Grid`.
    - `Grid` collides with `UnityEngine.Grid` (Tilemap system) → `CS0104: ambiguous reference`. Final rename: `GridWorld`. Reads cleanly: `engine.Engine.PlayerPosition` via the renderer's public property.
13. **Self-inflicted process bug:** Claude used `Edit replace_all` for `Grid → GridWorld`, which greedily munged `GridCoord → GridWorldCoord` AND `namespace Catr.GridEngine → Catr.GridWorldEngine`. Reverted both. **Lesson logged: never `replace_all` short tokens.** Three fix-and-retest cycles consumed more time than the original rename would have.
14. **Unity 6 Input System gotcha:** Sandbox driver uses legacy `UnityEngine.Input.GetKeyDown`. Unity 6 defaults Active Input Handling to *Input System Package (New)* → 866 `InvalidOperationException` errors. Cristian flipped Player Settings → Active Input Handling to *Both*. Decided NOT to port the sandbox driver to the new Input System: it's throwaway code; the real `InputAdapter` will use the new system properly. Yellow warning persists, no errors.
15. **End-to-end success.** Cristian hit Play: 9 black tiles in column 0, cyan totem on middle, 3 colored frontier tiles to the right. W/S scrolls vertically with the frontier sliding. Space commits, column 0 dims to spent colors, totem jumps forward, new frontier appears. 1/2/3 advance correctly. Camera follows rightward. Cell hierarchy in Editor shows live spawn/despawn of `Cell (x, y)` GameObjects as the window slides.

### Decisions Made
*(Mirrored into `CLAUDE.md` §11 Decision Log)*
- **Engine class named `GridWorld`** (not `GridEngine`, not `Grid`) — avoids the namespace/class collision and the `UnityEngine.Grid` collision in one move. Module / folder / asmdef stay called `GridEngine`.
- **Totem art deferred to post-G3 art-direction review.** Three viable paths identified (flat 2D, 2D-with-character, tilted 3D iso). Decision blocked on having playable gameplay to react to.
- **Active Input Handling = `Both`** for the duration of G1 sandbox. Sandbox driver stays on legacy `Input.*` (throwaway); real `InputAdapter` post-G1 will use `UnityEngine.InputSystem`.
- **Per-coordinate categories are deterministic from `(seed, x, y)`** — sliding the player never re-rolls a cell's color. Confirmed via tests + Cristian's "memory-based strategy" rationale.

### Artifacts Touched
- `packages/game/Assets/Scripts/GridEngine/{GridCoord, CellCategory, VisualState, GamePhase, VerticalDir, CellView, GridEngine}.cs` — engine module, pure C#.
- `packages/game/Assets/Scripts/GridEngine/GridEngine.asmdef` — `noEngineReferences: true`.
- `packages/game/Assets/Scripts/GridEngine/Tests/GridEngineTests.cs` + `GridEngine.Tests.asmdef` — 11 NUnit tests.
- `packages/game/Assets/Scripts/GridRenderer/{GridRendererBehaviour, CategoryPalette}.cs` — renderer module.
- `packages/game/Assets/Scripts/GridRenderer/GridRenderer.asmdef` — references `GridEngine`.
- `packages/game/Assets/Scripts/GridRenderer/Sandbox/G1SandboxDriver.cs` — throwaway keyboard driver.
- `packages/game/Assets/Scenes/G1_GridSandbox.unity` — added `GridRoot` (with `GridRendererBehaviour`) and `SandboxDriver` (with `G1SandboxDriver`) GameObjects.
- `packages/game/ProjectSettings/ProjectSettings.asset` — Active Input Handling → Both.
- `packages/game/CLAUDE.md` — new Decision Log entries.
- `packages/game/Sessions-CATR-log.md` — this entry.

### Open Threads
- **Visual polish:** during Warmup, the player's column-0 cell shows its underlying category color (Entered state has highest priority in the engine) instead of staying `WarmupBlack` like the rest of column 0. Cosmetic, breaks the "column 0 is all black until commit" expectation. Trivial engine fix — defer Entered-over-WarmupBlack so column 0 stays uniformly black during Warmup.
- **Two G1 modules still empty:** `MistController/` and `InputAdapter/` — both have engine hooks ready (`ConsumeColumn`, `Phase`, `ChoosableCells`) but no code yet.
- **Tests not yet runnable inside Unity Test Runner UI** — they pass under standalone `dotnet test` with NUnit 3 pinned, but Cristian hasn't opened *Window → General → Test Runner* in Unity to confirm the asmdef wiring lets the Test Runner discover them.
- **Trivia question source still unresolved** (design doc §15.3).
- **GCA→HNL redemption** blocked pending Víctor's legal review.

### Next Session Starts With
G1 is now ~50% done: `GridEngine` + `GridRenderer` working. Two viable next steps:
- **`MistController`** — auto-consume the trailing column on a timer (or speed-curve), driving the GameOver condition the engine already supports. Clean continuation of the gameplay loop.
- **`InputAdapter`** — replace the keyboard sandbox driver with proper click-to-pick-tile input using the new Input System. Required before any non-Cristian playtest.

Cristian's call which comes first. Also: patch the warmup-player-cell color in a 5-line engine edit before moving on.

---

## 2026-05-23 — Phase G1 Kickoff & Unity Toolchain Install
**Phase:** G1 (initialization, no gameplay code yet)
**Participants:** Cristian, Claude

### Goal
Initialize Phase G1 — get the Unity toolchain installed and confirm the machine can carry the project end-to-end, so the next session can start writing the four G1 modules (`GridEngine`, `MistController`, `InputAdapter`, `GridRenderer`).

### What Happened
1. Confirmed track: Game (CATR!), not FIDELIO network.
2. Reviewed prior sessions (bootstrap + monorepo relocation). Confirmed pre-G1 status — no Unity project existed.
3. Claude proposed a G1 initialization plan: four independent modules per the Modularity Mandate, one smoke scene, `.gitignore`, no gameplay logic this session.
4. Plan approved. Detected Unity was not installed → forked into Option A (install Unity Hub now) vs Option B (scaffold-only). Cristian chose Option A.
5. Cristian installed Unity Hub 3.18.0 via the official apt repo (signed key added to `/usr/share/keyrings/Unity_Technologies_ApS.gpg`, source list at `/etc/apt/sources.list.d/unityhub.list`).
6. Discussed Unity version choice. Cristian questioned why not 6.4 ("Recommended"). Claude explained Tech Stream vs LTS: 6.4 = ~6mo patch window, 6.3 LTS = ~2yr. CATR is a shipping product, not a sandbox → **picked Unity 6.3 LTS (6000.3.16f1)**.
7. Module selection: ticked Android Build Support (+ OpenJDK + Android SDK/NDK), Linux Build Support (IL2CPP), Web Build Support (Unity 6 renamed WebGL → "Web"). Explicitly skipped iOS (Linux can't build iOS), visionOS, all Dedicated Server variants, Mac/Windows builds, language packs, offline Documentation.
8. Explained Dedicated Server module: produces headless server binaries for authoritative multiplayer (e.g. FPS anti-cheat). Not relevant — CATR is single-player from Unity's perspective; the FIDELIO Express backend already plays the authoritative-server role over HTTP.
9. Machine spec check vs Unity requirements: i7-10850H (12 threads), 30 GB RAM, 339 GB free, NVIDIA Quadro P620 + Intel UHD, Ubuntu 26.04 (newer than officially supported but Hub installed cleanly). Verdict: comfortably above all requirements; building a 2D grid is the lightest possible workload for the engine.
10. Install completed cleanly — Editor 6000.3.16f1 with Android + Linux IL2CPP + Web modules all green.
11. **Render pipeline reversal.** Hub showed a banner: "Built-In Render Pipeline deprecated from Unity 6.5, supported through 6.7 LTS." Re-evaluated earlier Built-In recommendation honestly — for a multi-year product, starting on a deprecated pipeline is manufactured tech debt. Switched to **Universal 2D (URP)** template. Perf delta invisible for flat colored quads.
12. **Folder vs brand split.** Cristian asked to name the project `CATR!`. Pushed back: (a) `!` triggers bash/zsh history expansion — would require single-quoting every path forever, including every Claude bash call; (b) `CLAUDE.md §7` pins the monorepo location as `packages/game/`. Resolved: folder stays `game/` (dev convention), brand `CATR!` lives in Unity Player Settings (`Product Name`) where users actually see it.
13. Hub blocked project creation because `packages/game/` already held the three doc files. Stashed docs to `/tmp/catr-docs-stash/`, let Hub create the project, restored docs to project root (Unity ignores arbitrary `.md` files at root).
14. Wrote `packages/game/.gitignore` (Unity template — excludes `Library/`, `Temp/`, `Logs/`, `UserSettings/`, `MemoryCaptures/`, generated `.csproj`/`.sln`, IDE folders, build artifacts). Root `.gitignore` had zero Unity coverage. Verified with `git status --ignored` + `git ls-files --others --exclude-standard`.
15. Scaffolded four module folders inside `Assets/Scripts/` with `.gitkeep` placeholders: `GridEngine/`, `MistController/`, `InputAdapter/`, `GridRenderer/`. Unity auto-generated `.meta` files for each.
16. Cristian created `Assets/Scenes/G1_GridSandbox.unity` in-Editor (deleted Unity's `SampleScene`), set `Product Name: CATR!`, `Company Name: HNDA`, registered `G1_GridSandbox` as scene index 0 in Build Profiles.
17. **Unity persistence quirk surfaced:** First verification pass showed Player + Build settings unchanged on disk despite the UI showing new values. Root cause: `Ctrl+S` saves only the *active scene* — project-level settings require **File → Save Project**. After explicit Save Project, filesystem confirmed all three values persisted.
18. **Root `.gitignore` quirk surfaced during commit:** `git add packages/game/.gitignore` was rejected — `git check-ignore -v` revealed root `.gitignore:30` is literally the line `.gitignore`, meaning the repo refuses to track any nested `.gitignore` file. Force-added ours with `git add -f` since the Unity-scoped gitignore is essential to keep `Library/` out of the repo. Flagged for a future session: that root rule is unusual and will block any future package that needs a scoped gitignore.
19. Committed as **`7a2d020 feat(game): bootstrap Unity 6.3 LTS project for Phase G1`** — 60 files, 6836 insertions. Single coherent commit covering the Unity project skeleton, scoped gitignore, module scaffolding, smoke scene, Player/Build settings, root CLAUDE.md Workflow Router, and all three doc updates.

### Decisions Made
*(Mirrored into `CLAUDE.md` §11 Decision Log)*
- **Unity 6.3 LTS (6000.3.16f1)** pinned for the G1–G7 lifecycle. No mid-project upgrade without an explicit Decision Log entry.
- **Module set:** Android (+ OpenJDK + SDK/NDK), Linux IL2CPP, Web. iOS deferred until Mac access; Mac/Windows builds deferred until G7; Dedicated Server variants skipped (FIDELIO Express backend already plays the authoritative-server role over HTTP).
- **Render pipeline = URP 2D** (Built-In rejected due to Unity 6.5+ deprecation signal).
- **Folder `game/`, brand `CATR!` in Player Settings** — split to avoid shell `!` history-expansion pain while preserving brand identity.
- G1 initialization sub-phase **complete**. Next session writes module code.

### Artifacts Touched
- System: Unity Hub 3.18.0 (apt). Unity 6.3 LTS Editor installed to `/home/nait/Unity/Hub/Editor/6000.3.16f1/`.
- `packages/game/` — full Unity project structure created via Hub (Universal 2D template).
- `packages/game/.gitignore` — new, Unity template.
- `packages/game/Assets/Scripts/{GridEngine,MistController,InputAdapter,GridRenderer}/.gitkeep` — module boundaries.
- `packages/game/Assets/Scenes/G1_GridSandbox.unity` — empty smoke scene, build scene 0.
- `packages/game/ProjectSettings/ProjectSettings.asset` — `productName: CATR!`, `companyName: HNDA`.
- `packages/game/ProjectSettings/EditorBuildSettings.asset` — `G1_GridSandbox` registered.
- `packages/game/CLAUDE.md` — 3 new Decision Log entries (Unity 6.3 LTS pin, URP-2D pick, folder/brand split).
- `packages/game/Sessions-CATR-log.md` — this entry.

### Open Threads
- Module code not yet written — the four `Assets/Scripts/*` folders are empty stubs.
- Trivia question source still unresolved (design doc §15.3).
- GCA→HNL redemption blocked pending Víctor's legal review.

### ⚠️ HIGHLY IMPORTANT — Watch-Out (NVIDIA Optimus / GPU switching on Linux laptops)
**This machine has dual graphics:** Intel UHD (CometLake integrated) + NVIDIA Quadro P620 (discrete). On Linux laptops with Optimus-style switching, Unity Editor sometimes binds to the Intel iGPU instead of the discrete Quadro. **Symptom:** black viewports in the Scene/Game window, missing shader previews, or sluggish Editor framerate that doesn't match the hardware.

**If this happens, launch Unity Hub (and through it, the Editor) with:**
```
__NV_PRIME_RENDER_OFFLOAD=1 __GLX_VENDOR_LIBRARY_NAME=nvidia unityhub &
```
This forces the NVIDIA prime offload path. Verify the Editor is using the Quadro by opening **Help → About Unity** (look for the GPU line) or running `nvidia-smi` while the Editor is open — `Unity` should appear in the process list.

Flagging preemptively because the symptom (black viewport) looks like a Unity bug or a corrupt project, and we'd waste hours chasing the wrong cause. **First thing to try if the Editor renders incorrectly: relaunch with the prime-offload env vars above.**

### Next Session Starts With
G1 initialization is done. Next session opens `G1_GridSandbox` and writes the first real module — **`GridEngine`** — per the Modularity Mandate. Plan first: define the data model for an infinite coordinate space (player at origin, cells generated on-demand, no rendering, no input — pure C# logic, MonoBehaviour-free so it's unit-testable). Then write it, then a sandbox MonoBehaviour in `GridRenderer/` that visualizes a fixed window of `GridEngine` state as colored quads so we can see it move.

---

## 2026-05-22 — Project Bootstrap & CLAUDE.md Authoring
**Phase:** Cross-cutting (pre-G1)
**Participants:** Cristian, Claude

### Goal
Bootstrap the CATR project workspace: lay down behavioral rules, project context, locked-in decisions, and a session log so future sessions have continuity.

### What Happened
1. Claude read `CATR-GAME-DESIGN.md` (v1.0) — the full game design document covering the grid, mist, color system, hidden time mechanic, The Light easter egg, CATR economy, GCA leaderboard rewards, Unity stack, monorepo location at `packages/game/`, build phases G1–G7, and open legal questions.
2. Cristian provided a starter `CLAUDE.md` containing four universal LLM-hygiene principles (Think Before Coding, Simplicity First, Surgical Changes, Goal-Driven Execution).
3. Claude proposed and Cristian approved appending six CATR-specific sections on top of the four principles — keeping the originals untouched.
4. Sections §5–§11 were appended: Project Identity, Session Start Ritual, Architectural Anchors, Hard Constraints, Modularity Mandate, Collaboration Rules (CATR Echo), and a Decision Log template.
5. The Decision Log (§11) was seeded with all 10 locked-in decisions from design doc §14, newest-first, dated 2026-05-22.
6. This session log file was created as the third companion document.

### Decisions Made
- `CLAUDE.md` structure: universal principles on top (§1–4), CATR-specific layer beneath (§5–11). Do not reorder.
- Decision Log lives inside `CLAUDE.md` §11, append-only, newest-first.
- Session narrative lives in `Sessions-CATR-log.md` (this file), separate from the terse Decision Log.
- `CATR-GAME-DESIGN.md` remains the single source of truth for game design.

### Artifacts Touched
- `CLAUDE.md` — appended §5–§11; seeded §11 with 10 baseline decisions.
- `Sessions-CATR-log.md` — created (this file).

### Open Threads
- Phase G1 (grid prototype) not started — no Unity project exists yet at `packages/game/`.
- Trivia question source still unresolved (design doc §15.3).
- GCA→HNL redemption blocked pending Víctor's legal review.
- CATR↔HNL exchange rate pending FIDELIO economics finalization.

### Next Session Starts With
Per the Session Start Ritual (`CLAUDE.md` §6): report current phase (still pre-G1), review this log, and propose a Phase G1 plan — infinite colored grid, single-cell movement, black mist consuming rows/columns behind the player, no blockchain. Plan first, approval, then code.
