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
