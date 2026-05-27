# G2 — Question Engine Implementation Plan

**Status:** Approved 2026-05-23. Plan-before-code rule satisfied. Execute step by step; tick items as A1 → C2 land.

**Companion files:**
- `CLAUDE.md` — behavioral rules + Decision Log (terse).
- `CATR-GAME-DESIGN.md` — game design source of truth.
- `Sessions-CATR-log.md` — running session narrative.

---

## Goal

Replace G1's `ResolvePuzzle(correct: true)` placeholder with a real Question Engine: server-side question delivery, in-grid card UI, difficulty ratchet, wildcard side-channel, tier hints, multi-attempt-per-frontier game-over path.

## Architecture Decisions (locked — full rationale in `CLAUDE.md` §11)

**Source & format**
- Server-side delivery from FIDELIO backend (Express + Postgres). No client-side catalog.
- MC-4 + T/F. No free-text. T/F injected randomly every ~5–8 questions (capped).
- Bilingual day one: `prompt_es` / `prompt_en`, mirrored answers.
- Seed: ~100 hand-authored bilingual questions. Local-AI pool maintenance deferred to G6.

**Difficulty system**
- 5 tiers.
- Ratchet: monotonic per-run, no turn-around.
- Speed metric: rolling average of last 3 answer times.
- Buy-in sets *base* difficulty (not ramp slope).
- Depletion fallback: controlled repeat within (category, tier) bucket; oldest-served first.

**Wildcard**
- Cell category deterministic per `(seed, x, y)`; wildcards override at frontier-reveal as a *player-state-driven* re-skin (two players + same seed → different white-tile placement).
- Off-ratchet (doesn't feed the difficulty climb).
- Always tier 5.
- Reward = CATR + Time combo (CATR amount = G4 economy concern; for G2 emit `WildcardCorrect` event with abstract reward token).
- Frequency = `min(P_cap, k × N_tier5_answered × speed_factor)`. Constants tuned in G3.
- *The Light* is now gold/silver (not white), briefly stops the mist — revises the 2026-05-22 entry.

**Wrong-answer mechanic**
- −2s (mist jumps forward 2 cells; **mist is the source of truth**, clock is visualization).
- Tile consumed within current frontier.
- All 3 frontier tiles wrong → run lost (second game-over path alongside mist contact).

**UI**
- In-grid card on click. Just-in-time question fetch (no pre-fetch).
- Mist keeps ticking during the question.

**Tier hints**
- Always-visible badge on each frontier tile when `HintVisible == true`.
- Hint probability rises with current tier (high stakes deserve high signal).
- Tier only (no kind, no special flags). Always truthful.
- Tile tier locks at frontier-reveal time (snapshot), not at click time.

**Modules**
- `QuestionEngine/` (Unity, pure C#) — runtime question orchestration.
- `BackendClient/` (Unity) — `IBackendClient` + `HttpBackendClient` + `MockBackendClient`.
- `QuestionUI/` (Unity MonoBehaviours + Canvas) — in-grid card.
- `GridEngine/` (extended in place) — new state + new API.
- `InputAdapter/` (rewired) — routes through `QuestionEngine`.

---

## Track A — Backend (engineering)

### A1 — Postgres schema + Prisma migration

Two new tables in `packages/backend/prisma/schema.prisma`:

```
model GameQuestion {
  id            String              @id @default(uuid())
  category      GameQuestionCategory
  tier          Int                 // 1..5
  kind          GameQuestionKind
  prompt_es     String
  prompt_en     String
  answers_es    Json                // ["...", "...", "...", "..."] for MC; ["Verdadero","Falso"] for TF
  answers_en    Json                // mirrored
  correct_index Int
  active        Boolean             @default(true)
  created_at    DateTime            @default(now())
  updated_at    DateTime            @updatedAt
  serves        QuestionServe[]

  @@index([category, tier, active])
  @@index([active])
}

model QuestionServe {
  id           String       @id @default(uuid())
  player_id    String
  question_id  String
  served_at    DateTime     @default(now())
  was_correct  Boolean?
  player       User         @relation(fields: [player_id], references: [id])
  question     GameQuestion @relation(fields: [question_id], references: [id])

  @@index([player_id, question_id])
  @@index([player_id, served_at])
}

enum GameQuestionCategory { RED BLUE GREEN YELLOW PURPLE ORANGE }
enum GameQuestionKind { MC TF }
```

No separate `wildcard` category: wildcard fetches are "random category, tier=5" — handled at query time.

**Verify A1:** `npx prisma migrate dev` runs clean; `psql` shows both new tables; existing 11 FIDELIO tables untouched; existing 44 backend tests still green.

### A2 — Express endpoints

**Security correction:** `playerId` is **never** in the request body. It derives from the JWT user token via `userAuth` middleware (mirrors the FIDELIO `transactions.ts` pattern). The original plan listed it in the body — that was wrong.

```
POST /api/game/questions/next   (userAuth)
  body: { category, tier, kind: "MC"|"TF"|"ANY", lang, wildcard?: bool }
  → 200 { data: { id, prompt, answers, correctIndex, kind, category, tier, isWildcard } }
  → 404 when bucket is truly empty for that filter

POST /api/game/questions/resolve   (userAuth)
  body: { questionId, wasCorrect }
  → 200 { data: { ok: true } }
  → 404 when no unresolved serve exists for (player, questionId)
```

`/next` enforces per-player no-repeat; **marks served at `/next` time** (not at `/resolve`). When the bucket is exhausted, controlled-repeat returns the oldest-served question. Wildcard requests ignore the body's `category` and force `tier=5`, with the server randomly picking from the 6 categories. `kind="ANY"` omits the kind filter; explicit `MC`/`TF` applies it (T/F injection is driven by the Unity-side `QuestionEngine` occasionally requesting `TF`).

**Architecture:** `src/services/question_service.ts` owns the algorithm; `src/routes/game_questions.ts` is the thin route layer. Mounted at `/api/game/questions` in `app.ts`.

**Verify A2:** 17 new Jest tests (10 service, 7 route) — happy path, controlled-repeat fallback, bucket-empty 404, wildcard randomization, kind filter, lang localization, auth, validation. Full backend suite: 73 → **90/90** green.

### A3 — Seed file (scaffold)

`prisma/seed-game-questions.ts` loads from `seed-questions.json`. JSON ships with ~10 placeholder bilingual questions to unblock end-to-end testing. Real 100-question content sprint = separate sitting (C2).

**Verify A3:** seed runs clean; `SELECT COUNT(*) FROM "GameQuestion"` → 10.

---

## Track B — Unity (engineering)

### B1 — Open design questions (resolve before code)

Three clarifications need a decision before implementation. Each has my instinct flagged; Cristian gets the call next session.

**B1-Q1 — How does the mist move now?**
- (a) Mist still ticks on G1's 2.3s timer **AND** answers shove it: correct = player +1 col (runway extends), wrong = mist +2 cols (runway shrinks). Standing still = death (timer still ticks). **← my instinct**
- (b) Mist only moves via answers (no timer). Standing still = invulnerable. Breaks the survival metaphor.
- (c) G1 timer only, answers don't affect mist. Wrong answers only consume the tile, no time cost.

**B1-Q2 — Who owns the wildcard re-skin?**
- (a) `GridEngine` owns `Tier5AnsweredCount` + rolling speed + the probability roll. On frontier-reveal, flags tiles as `IsWildcard`. `GetTileMetadata` exposes it. Renderer + InputAdapter just read. **← my instinct**
- (b) `QuestionEngine` owns the override at question-fetch time. Engine exposes raw category, QuestionEngine overrides en route to backend.

**B1-Q3 — Who owns tier-hint visibility?**
- (a) `GridEngine` rolls `HintVisible` per frontier-tile at reveal, based on player's current ratchet. Renderer just paints what `GetTileMetadata` says. **← my instinct**
- (b) `GridRenderer` decides; engine exposes raw tier.

**Reasoning for the (a)/(a)/(a) triple:** wildcard and tier hints are *gameplay-world* properties (they change behavior + cell appearance + player decisions), not visualization or question-fetch concerns. They belong in the engine. Renderer stays a pure paintbrush; `QuestionEngine` only fetches questions with given params and reports outcomes back.

### B1 — Extend `GridEngine`

New state:
- `Tier` (1–5, snapshotted at reveal)
- `Kind` (MC | TF)
- `HintVisible` (bool, from tier-driven probability)
- `TileState` within frontier: `Available → Consumed`
- `PlayerTier` — current ratchet level
- `LastAnswerTimes[3]` — rolling speed window
- `Tier5AnsweredCount`
- `MistRunwayCells` — starts at 10; `+1` on correct, `−2` on wrong

New API:
```csharp
AttemptPuzzle(GridCoord target, bool correct, float answerTimeSeconds)
GetTileMetadata(GridCoord target) → { Category, Tier, Kind, HintVisible, IsWildcard }
```

New events:
- `TileConsumed(GridCoord)`
- `RatchetClimbed(int newTier)`
- `MistRunwayChanged(int newRunway)`
- `GameOver(reason: MistContact | FrontierExhausted)` (extends existing)

**Engine boundary:** still pure C#, no Unity deps, no network calls. Questions are *injected* before `AttemptPuzzle` is called.

**Verify B1:** ~10 new NUnit tests (ratchet climb, wrong-answer consume, frontier-exhaustion game-over, mist runway math, tier snapshot at reveal). 11/11 G1 tests still green.

### B2 — `BackendClient/` module

- `IBackendClient` interface.
- `HttpBackendClient` — `UnityWebRequest` against the A2 endpoints.
- `MockBackendClient` — in-memory questions for offline unit tests.

**Verify B2:** unit-test the mock; manual play with real backend confirms `/next` returns a question.

### B3 — `QuestionEngine/` module

Pure C#, no Unity deps. Holds an `IBackendClient`. Owns:
- `RequestQuestion(GridCoord tile, language)` → fetches via client.
- `ResolveAnswer(int answerIndex, float elapsedSeconds)` → resolves locally, calls `/resolve`, then calls `GridEngine.AttemptPuzzle(...)`.
- Wildcard detection (tile flagged wildcard → fetch random-category tier-5 + emit `WildcardCorrect` on success).
- T/F injection cadence (every ~5–8 questions, capped).

**Verify B3:** unit tests with `MockBackendClient`.

### B4 — `QuestionUI/` module

Unity Canvas + in-grid card prefab. Renders prompt + answers, captures click, fires resolve event.

**Verify B4:** visual — card appears on frontier-tile click, accepts answer, dismisses.

### B5 — `InputAdapter` rewire

Remove the G1 placeholder. Frontier click → `QuestionEngine.RequestQuestion(tile)` → on resolve → `GridEngine.AttemptPuzzle(...)`.

**Verify B5:** click frontier → card appears → wrong = tile consumed, mist −2 → 3 wrong = run lost; correct = advance, mist +1, ratchet updates.

### B6 — `GridRenderer` hint badges

Small text badge on each frontier tile when `HintVisible == true`. Probability lives in engine; renderer reads via `GetTileMetadata`.

**Verify B6:** visual — badges appear stochastically; rate climbs with tier.

---

## Convergence

### C1 — End-to-end Cristian playtest

Full loop in Editor against real backend with 10 seed questions. Confirms hint badges, click-to-question flow, ratchet climb, mist mechanic, depletion fallback (fires fast with only 10 questions — fine for testing).

### C2 — Content sprint (separate sitting)

Co-author the 100 bilingual questions. Pure content, no engineering.

---

## Order of Execution

`A1 → A2 → A3` (backend done, 10 placeholder questions live)
`→ B1` (engine extension; can run parallel to backend after A1's schema is locked)
`→ B2 → B3 → B4 → B5 → B6` (Unity stack bottom-up)
`→ C1` (end-to-end verification → G2 sealed)
`→ C2` (content) as a separate session

**Estimated:** 4–6 engineering sessions, 1–2 content sessions.

---

## Progress

- [x] A1 — Postgres schema + Prisma migration
- [x] A2 — Express endpoints (`/api/game/questions/next` + `/resolve`, 90/90 tests green)
- [x] A3 — Seed file scaffold (10 bilingual placeholder questions, idempotent upsert, `npm run db:seed:game`)
- [x] B1 — `GridEngine` extension (AttemptPuzzle / ShoveMist / GetTileMetadata + ratchet + wildcard/hint rolls; 21/21 tests green)
- [x] B2 — `BackendClient/` module (`IBackendClient` + DTOs + `MockBackendClient` + `HttpBackendClient`; 6/6 mock tests green)
- [ ] B3 — `QuestionEngine/` module
- [ ] B4 — `QuestionUI/` module
- [ ] B5 — `InputAdapter` rewire
- [ ] B6 — `GridRenderer` hint badges
- [ ] C1 — End-to-end playtest
- [ ] C2 — Content sprint (100 bilingual questions)
