using System;
using System.Collections.Generic;

namespace Catr.GridEngine
{
    public sealed class GridWorld
    {
        public int RowCount { get; }
        public GridCoord PlayerPosition { get; private set; }
        public GamePhase Phase { get; private set; }

        public event Action<GridCoord> PlayerMoved;
        public event Action<GridCoord> CellRevealed;
        public event Action<int> ColumnConsumed;
        public event Action<GridCoord> TileConsumed;
        public event Action<int> RatchetClimbed;
        public event Action<float> TimeRemainingChanged;
        public event Action<GameOverReason> GameOver;

        public int BaseTier { get; }
        public int PlayerTier { get; private set; }
        public int Tier5AnsweredCount { get; private set; }
        public float TimeRemaining { get; private set; }
        public int MistFrontX { get; private set; }

        // Tunable in G3 — kept internal so a single edit retunes the ratchet.
        internal const float WildcardPCap = 0.25f;
        internal const float WildcardK = 0.02f;
        internal const float InitialTimeSeconds = 10f;
        internal const float CorrectBonusSeconds = 1f;

        private readonly int seed;
        private readonly HashSet<int> consumedColumns = new HashSet<int>();
        private readonly HashSet<GridCoord> spentCells = new HashSet<GridCoord>();
        private readonly Queue<float> lastAnswerTimes = new Queue<float>();
        private readonly Dictionary<GridCoord, TileMetadata> frontierMetadata = new Dictionary<GridCoord, TileMetadata>();
        private int maxRevealedColumn;

        public GridWorld(int rowCount, int seed) : this(rowCount, seed, baseTier: 1) { }

        public GridWorld(int rowCount, int seed, int baseTier)
        {
            if (rowCount < 3) throw new ArgumentException("rowCount must be >= 3", nameof(rowCount));
            if (baseTier < 1 || baseTier > 5) throw new ArgumentException("baseTier must be in [1,5]", nameof(baseTier));
            RowCount = rowCount;
            this.seed = seed;
            BaseTier = baseTier;
            PlayerTier = baseTier;
            TimeRemaining = InitialTimeSeconds;
            MistFrontX = -1;
            PlayerPosition = new GridCoord(0, rowCount / 2);
            Phase = GamePhase.Warmup;
            maxRevealedColumn = 1;
            SnapshotFrontierMetadata();
        }

        public void Tick(float deltaSeconds)
        {
            if (Phase == GamePhase.GameOver) return;
            if (deltaSeconds <= 0) return;
            TimeRemaining = Math.Max(0f, TimeRemaining - deltaSeconds);
            TimeRemainingChanged?.Invoke(TimeRemaining);
            AdvanceMistToMatchTime();
            if (Phase == GamePhase.GameOver) return;
            if (TimeRemaining <= 0f)
            {
                Phase = GamePhase.GameOver;
                GameOver?.Invoke(GameOverReason.MistContact);
            }
        }

        private void AdvanceMistToMatchTime()
        {
            int target = PlayerPosition.X - (int)Math.Floor(TimeRemaining);
            while (MistFrontX < target)
            {
                MistFrontX++;
                ConsumeColumn(MistFrontX);
                if (Phase == GamePhase.GameOver) return;
            }
        }

        public bool TryWarmupMove(VerticalDir dir)
        {
            if (Phase != GamePhase.Warmup) return false;
            int newY = PlayerPosition.Y + (dir == VerticalDir.Up ? -1 : 1);
            if (newY < 0 || newY >= RowCount) return false;
            PlayerPosition = new GridCoord(0, newY);
            PlayerMoved?.Invoke(PlayerPosition);
            SnapshotFrontierMetadata();
            return true;
        }

        public bool TryWarmupMoveTo(int y)
        {
            if (Phase != GamePhase.Warmup) return false;
            if (y < 0 || y >= RowCount) return false;
            if (y == PlayerPosition.Y) return true;
            PlayerPosition = new GridCoord(0, y);
            PlayerMoved?.Invoke(PlayerPosition);
            SnapshotFrontierMetadata();
            return true;
        }

        public IEnumerable<GridCoord> ChoosableCells()
        {
            if (Phase == GamePhase.GameOver) yield break;
            int x = PlayerPosition.X + 1;
            for (int dy = -1; dy <= 1; dy++)
            {
                int y = PlayerPosition.Y + dy;
                if (y < 0 || y >= RowCount) continue;
                yield return new GridCoord(x, y);
            }
        }

        public CellView GetCellView(GridCoord c)
        {
            if (c.Y < 0 || c.Y >= RowCount)
                return new CellView(VisualState.Unrevealed, null);

            if (consumedColumns.Contains(c.X))
                return new CellView(VisualState.Consumed, CategoryFor(c.X, c.Y));

            if (Phase == GamePhase.Warmup && c.X == 0)
                return new CellView(VisualState.WarmupBlack, null);

            if (c == PlayerPosition)
                return new CellView(VisualState.Entered, CategoryFor(c.X, c.Y));

            // A frontier tile killed by a wrong answer: render it consumed (black), not as a
            // live choosable tile. Without this it stays category-colored and the wrong answer
            // looks like it had no effect.
            if (frontierMetadata.TryGetValue(c, out var fmd) && fmd.Consumed)
                return new CellView(VisualState.Consumed, CategoryFor(c.X, c.Y));

            if (IsChoosable(c))
                return new CellView(VisualState.Revealed, CategoryFor(c.X, c.Y));

            if (spentCells.Contains(c))
                return new CellView(VisualState.Spent, CategoryFor(c.X, c.Y));

            return new CellView(VisualState.Unrevealed, null);
        }

        public TileMetadata GetTileMetadata(GridCoord target)
        {
            if (!frontierMetadata.TryGetValue(target, out var md))
                throw new ArgumentException($"No frontier metadata for {target}.", nameof(target));
            return md;
        }

        public bool TryGetTileMetadata(GridCoord target, out TileMetadata md)
        {
            return frontierMetadata.TryGetValue(target, out md);
        }

        public void Commit(GridCoord target)
        {
            if (Phase != GamePhase.Warmup)
                throw new InvalidOperationException("Commit only valid during Warmup.");
            if (!IsChoosable(target))
                throw new ArgumentException($"Target {target} is not choosable.", nameof(target));

            Phase = GamePhase.Running;
            MarkOtherChoosablesSpent(target);
            for (int y = 0; y < RowCount; y++)
                spentCells.Add(new GridCoord(0, y));
            spentCells.Remove(target);

            PlayerPosition = target;
            maxRevealedColumn = target.X + 1;
            PlayerMoved?.Invoke(PlayerPosition);
            SnapshotFrontierMetadata();
            RaiseRevealedForFrontier();
        }

        // Legacy G1 API — kept for the sandbox driver until B5 rewires InputAdapter.
        [Obsolete("Use AttemptPuzzle(target, correct, answerTimeSeconds).")]
        public void ResolvePuzzle(GridCoord target, bool correct)
        {
            AttemptPuzzle(target, correct, answerTimeSeconds: 3.0f);
        }

        public void AttemptPuzzle(GridCoord target, bool correct, float answerTimeSeconds)
        {
            if (Phase == GamePhase.GameOver)
                throw new InvalidOperationException("AttemptPuzzle not valid after GameOver.");
            if (!IsChoosable(target))
                throw new ArgumentException($"Target {target} is not choosable.", nameof(target));
            if (!frontierMetadata.TryGetValue(target, out var md))
                throw new InvalidOperationException($"No frontier metadata for {target}; reveal first.");
            if (md.Consumed)
                throw new InvalidOperationException($"Tile {target} already consumed.");

            if (Phase == GamePhase.Warmup)
            {
                if (!correct)
                {
                    // Wrong on the warm-up question: consume the tile, do NOT start the run.
                    // No advance, no commit — the run only begins on a correct answer (you earn
                    // your start). The player picks another column-1 tile, or moves along
                    // column 0 to re-roll the frontier.
                    frontierMetadata[target] = md.WithConsumed(true);
                    TileConsumed?.Invoke(target);
                    return;
                }

                // Correct: this is the click-to-start commit.
                PushAnswerTime(answerTimeSeconds);
                Commit(target);
                TimeRemaining += CorrectBonusSeconds;
                TimeRemainingChanged?.Invoke(TimeRemaining);
                AdvanceMistToMatchTime();
                return;
            }

            if (!correct)
            {
                frontierMetadata[target] = md.WithConsumed(true);
                TileConsumed?.Invoke(target);

                if (AllFrontierConsumed())
                {
                    Phase = GamePhase.GameOver;
                    GameOver?.Invoke(GameOverReason.FrontierExhausted);
                    return;
                }

                ShoveMist(2);
                return;
            }

            PushAnswerTime(answerTimeSeconds);
            if (md.Tier == 5) Tier5AnsweredCount++;

            int oldTier = PlayerTier;
            RecomputePlayerTier();
            if (PlayerTier > oldTier) RatchetClimbed?.Invoke(PlayerTier);

            MarkOtherChoosablesSpent(target);
            spentCells.Add(PlayerPosition);
            spentCells.Remove(target);

            PlayerPosition = target;
            maxRevealedColumn = target.X + 1;
            TimeRemaining += CorrectBonusSeconds;
            TimeRemainingChanged?.Invoke(TimeRemaining);
            PlayerMoved?.Invoke(PlayerPosition);

            SnapshotFrontierMetadata();
            RaiseRevealedForFrontier();
            AdvanceMistToMatchTime();
        }

        // Returns true if time hit zero → GameOver(MistContact).
        public bool ShoveMist(int cells)
        {
            if (cells <= 0) return false;
            if (Phase == GamePhase.GameOver) return true;
            TimeRemaining = Math.Max(0f, TimeRemaining - cells);
            TimeRemainingChanged?.Invoke(TimeRemaining);
            AdvanceMistToMatchTime();
            if (Phase == GamePhase.GameOver) return true;
            if (TimeRemaining <= 0f)
            {
                Phase = GamePhase.GameOver;
                GameOver?.Invoke(GameOverReason.MistContact);
                return true;
            }
            return false;
        }

        public void ConsumeColumn(int x)
        {
            if (consumedColumns.Add(x))
            {
                for (int y = 0; y < RowCount; y++)
                    spentCells.Remove(new GridCoord(x, y));
                if (PlayerPosition.X == x)
                {
                    Phase = GamePhase.GameOver;
                    GameOver?.Invoke(GameOverReason.MistContact);
                }
                ColumnConsumed?.Invoke(x);
            }
        }

        private bool IsChoosable(GridCoord c)
        {
            if (c.X != PlayerPosition.X + 1) return false;
            if (c.Y < 0 || c.Y >= RowCount) return false;
            int dy = c.Y - PlayerPosition.Y;
            return dy >= -1 && dy <= 1;
        }

        private void MarkOtherChoosablesSpent(GridCoord chosen)
        {
            foreach (var c in ChoosableCells())
                if (c != chosen) spentCells.Add(c);
        }

        private void RaiseRevealedForFrontier()
        {
            if (CellRevealed == null) return;
            foreach (var c in ChoosableCells())
                CellRevealed.Invoke(c);
        }

        private void SnapshotFrontierMetadata()
        {
            frontierMetadata.Clear();
            int frontierColumn = PlayerPosition.X + 1;
            foreach (var c in ChoosableCells())
            {
                bool isWildcard = RollWildcard(frontierColumn, c);
                int tier = isWildcard ? 5 : PlayerTier;
                var category = CategoryFor(c.X, c.Y);
                var kind = RollKind(c);
                bool hint = RollHintVisible(c, tier);
                frontierMetadata[c] = new TileMetadata(category, tier, kind, hint, isWildcard, consumed: false);
            }
        }

        private bool RollWildcard(int frontierColumn, GridCoord c)
        {
            float speed = RollingAvgAnswerTime();
            float speedFactor = speed <= 0 ? 1.0f : Math.Min(2.0f, 3.0f / speed);
            float p = Math.Min(WildcardPCap, WildcardK * Tier5AnsweredCount * speedFactor);
            if (p <= 0) return false;
            float r = UnitRandom(MixHash(seed, frontierColumn, c.Y, Tier5AnsweredCount, unchecked((int)0xA1B2C3D4)));
            return r < p;
        }

        private QuestionKind RollKind(GridCoord c)
        {
            // T/F injection cadence is driven by QuestionEngine in B3; engine defaults to MC.
            // Hash-mix here gives QuestionEngine a deterministic seed if it later wants engine-side cadence.
            return QuestionKind.MC;
        }

        private bool RollHintVisible(GridCoord c, int tier)
        {
            float p = 0.20f + 0.15f * (tier - 1);
            float r = UnitRandom(MixHash(seed, c.X, c.Y, tier, unchecked((int)0xC0DEFA11)));
            return r < p;
        }

        private void PushAnswerTime(float t)
        {
            lastAnswerTimes.Enqueue(t);
            while (lastAnswerTimes.Count > 3) lastAnswerTimes.Dequeue();
        }

        private float RollingAvgAnswerTime()
        {
            if (lastAnswerTimes.Count < 3) return 0f;
            float sum = 0f;
            foreach (var t in lastAnswerTimes) sum += t;
            return sum / lastAnswerTimes.Count;
        }

        private void RecomputePlayerTier()
        {
            float avg = RollingAvgAnswerTime();
            if (avg <= 0) return; // not enough samples; tier stays at BaseTier
            int steps;
            if (avg < 2.0f) steps = 4;
            else if (avg < 3.0f) steps = 3;
            else if (avg < 5.0f) steps = 2;
            else if (avg < 8.0f) steps = 1;
            else steps = 0;
            int candidate = BaseTier + steps;
            if (candidate > 5) candidate = 5;
            if (candidate > PlayerTier) PlayerTier = candidate; // monotonic
        }

        private bool AllFrontierConsumed()
        {
            int count = 0;
            foreach (var kv in frontierMetadata)
            {
                count++;
                if (!kv.Value.Consumed) return false;
            }
            return count > 0;
        }

        public CellCategory CategoryFor(int x, int y)
        {
            unchecked
            {
                int h = seed;
                h = h * 31 + x;
                h = h * 31 + y;
                h ^= h >> 16;
                h *= unchecked((int)0x7feb352d);
                h ^= h >> 15;
                h *= unchecked((int)0x846ca68b);
                h ^= h >> 16;
                int count = System.Enum.GetValues(typeof(CellCategory)).Length;
                int idx = (int)((uint)h % (uint)count);
                return (CellCategory)idx;
            }
        }

        private static int MixHash(int a, int b, int c, int d, int salt)
        {
            unchecked
            {
                int h = salt;
                h = h * 31 + a;
                h = h * 31 + b;
                h = h * 31 + c;
                h = h * 31 + d;
                h ^= h >> 16;
                h *= unchecked((int)0x7feb352d);
                h ^= h >> 15;
                h *= unchecked((int)0x846ca68b);
                h ^= h >> 16;
                return h;
            }
        }

        private static float UnitRandom(int h)
        {
            uint u = (uint)h;
            return (u & 0xFFFFFF) / (float)0x1000000;
        }
    }
}
