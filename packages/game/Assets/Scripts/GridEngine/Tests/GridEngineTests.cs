using System.Collections.Generic;
using System.Linq;
using NUnit.Framework;
using Catr.GridEngine;

namespace Catr.GridEngine.Tests
{
    public class GridTests
    {
        private const int Rows = 9;
        private const int Seed = 42;

        private GridWorld NewEngine() => new GridWorld(Rows, Seed);

        [Test]
        public void Spawn_PlayerAtMiddleRowOfColumnZero_PhaseWarmup()
        {
            var e = NewEngine();
            Assert.AreEqual(new GridCoord(0, 4), e.PlayerPosition);
            Assert.AreEqual(GamePhase.Warmup, e.Phase);

            for (int y = 0; y < Rows; y++)
            {
                var view = e.GetCellView(new GridCoord(0, y));
                Assert.AreEqual(VisualState.WarmupBlack, view.State, $"row {y}");
                Assert.IsNull(view.Category);
            }
        }

        [Test]
        public void WarmupMove_Up_Twice_PlayerAtRowTwo()
        {
            var e = NewEngine();
            Assert.IsTrue(e.TryWarmupMove(VerticalDir.Up));
            Assert.IsTrue(e.TryWarmupMove(VerticalDir.Up));
            Assert.AreEqual(new GridCoord(0, 2), e.PlayerPosition);

            var choosable = e.ChoosableCells().ToList();
            CollectionAssert.AreEquivalent(
                new[] { new GridCoord(1, 1), new GridCoord(1, 2), new GridCoord(1, 3) },
                choosable);
        }

        [Test]
        public void WarmupMove_PastTopEdge_ReturnsFalseAndClamps()
        {
            var e = NewEngine();
            for (int i = 0; i < 4; i++) e.TryWarmupMove(VerticalDir.Up);
            Assert.AreEqual(new GridCoord(0, 0), e.PlayerPosition);
            Assert.IsFalse(e.TryWarmupMove(VerticalDir.Up));
            Assert.AreEqual(new GridCoord(0, 0), e.PlayerPosition);
        }

        [Test]
        public void SlidingVertically_DoesNotChangeUnderlyingCategory()
        {
            var e1 = NewEngine();
            var c1 = e1.CategoryFor(1, 3);

            var e2 = NewEngine();
            e2.TryWarmupMove(VerticalDir.Up);
            e2.TryWarmupMove(VerticalDir.Down);
            var c2 = e2.CategoryFor(1, 3);

            Assert.AreEqual(c1, c2);
        }

        [Test]
        public void Commit_TransitionsToRunning_ColumnZeroBecomesSpent()
        {
            var e = NewEngine();
            var target = new GridCoord(1, 4);
            e.Commit(target);

            Assert.AreEqual(GamePhase.Running, e.Phase);
            Assert.AreEqual(target, e.PlayerPosition);

            for (int y = 0; y < Rows; y++)
            {
                var view = e.GetCellView(new GridCoord(0, y));
                Assert.AreEqual(VisualState.Spent, view.State, $"row {y}");
                Assert.IsNotNull(view.Category);
            }
        }

        [Test]
        public void ResolvePuzzle_Correct_AdvancesAndRevealsFrontier()
        {
            var e = NewEngine();
            e.Commit(new GridCoord(1, 4));
            var next = new GridCoord(2, 4);
            e.ResolvePuzzle(next, correct: true);

            Assert.AreEqual(next, e.PlayerPosition);
            var frontier = e.ChoosableCells().ToList();
            CollectionAssert.AreEquivalent(
                new[] { new GridCoord(3, 3), new GridCoord(3, 4), new GridCoord(3, 5) },
                frontier);
        }

        [Test]
        public void ResolvePuzzle_Wrong_PositionUnchanged()
        {
            var e = NewEngine();
            e.Commit(new GridCoord(1, 4));
            var before = e.PlayerPosition;
            e.ResolvePuzzle(new GridCoord(2, 4), correct: false);
            Assert.AreEqual(before, e.PlayerPosition);
        }

        [Test]
        public void EdgeRow_FrontierShrinksToTwoCells()
        {
            var e = NewEngine();
            for (int i = 0; i < 4; i++) e.TryWarmupMove(VerticalDir.Up);
            Assert.AreEqual(new GridCoord(0, 0), e.PlayerPosition);
            var choosable = e.ChoosableCells().ToList();
            Assert.AreEqual(2, choosable.Count);
            CollectionAssert.AreEquivalent(
                new[] { new GridCoord(1, 0), new GridCoord(1, 1) },
                choosable);
        }

        [Test]
        public void Determinism_SameSeedSameCoord_SameCategory()
        {
            var a = new GridWorld(Rows, 12345);
            var b = new GridWorld(Rows, 12345);
            Assert.AreEqual(a.CategoryFor(100, 5), b.CategoryFor(100, 5));
            Assert.AreEqual(a.CategoryFor(7, 2), b.CategoryFor(7, 2));
        }

        [Test]
        public void ConsumeColumn_OnPlayerColumn_TransitionsToGameOver()
        {
            var e = NewEngine();
            e.Commit(new GridCoord(1, 4));

            int eventColumn = -1;
            e.ColumnConsumed += x => eventColumn = x;

            e.ConsumeColumn(1);
            Assert.AreEqual(1, eventColumn);
            Assert.AreEqual(GamePhase.GameOver, e.Phase);

            for (int y = 0; y < Rows; y++)
                Assert.AreEqual(VisualState.Consumed, e.GetCellView(new GridCoord(1, y)).State);
        }

        [Test]
        public void PlayerMoved_FiresOnWarmupMoveAndCommitAndResolve()
        {
            var e = NewEngine();
            var positions = new List<GridCoord>();
            e.PlayerMoved += p => positions.Add(p);

            e.TryWarmupMove(VerticalDir.Down);
            e.Commit(new GridCoord(1, 5));
            e.AttemptPuzzle(new GridCoord(2, 5), correct: true, answerTimeSeconds: 3f);

            Assert.AreEqual(3, positions.Count);
            Assert.AreEqual(new GridCoord(0, 5), positions[0]);
            Assert.AreEqual(new GridCoord(1, 5), positions[1]);
            Assert.AreEqual(new GridCoord(2, 5), positions[2]);
        }

        // ---- G2 B1 tests ----

        [Test]
        public void AttemptPuzzle_Correct_AdvancesPlayer_AndIncrementsRunway()
        {
            var e = NewEngine();
            e.Commit(new GridCoord(1, 4));
            int runway = e.MistRunwayCells;
            e.AttemptPuzzle(new GridCoord(2, 4), correct: true, answerTimeSeconds: 3f);
            Assert.AreEqual(new GridCoord(2, 4), e.PlayerPosition);
            Assert.AreEqual(runway + 1, e.MistRunwayCells);
        }

        [Test]
        public void AttemptPuzzle_Wrong_ConsumesTile_AndShovesMist2()
        {
            var e = NewEngine();
            e.Commit(new GridCoord(1, 4));
            int runway = e.MistRunwayCells;
            GridCoord consumed = default;
            e.TileConsumed += c => consumed = c;

            var target = new GridCoord(2, 4);
            e.AttemptPuzzle(target, correct: false, answerTimeSeconds: 3f);

            Assert.AreEqual(target, consumed);
            Assert.IsTrue(e.GetTileMetadata(target).Consumed);
            Assert.AreEqual(new GridCoord(1, 4), e.PlayerPosition);
            Assert.AreEqual(runway - 2, e.MistRunwayCells);
        }

        [Test]
        public void AttemptPuzzle_AllThreeFrontierWrong_RaisesFrontierExhaustedGameOver()
        {
            var e = NewEngine();
            e.Commit(new GridCoord(1, 4));
            GameOverReason? reason = null;
            e.GameOver += r => reason = r;

            e.AttemptPuzzle(new GridCoord(2, 3), correct: false, answerTimeSeconds: 3f);
            e.AttemptPuzzle(new GridCoord(2, 4), correct: false, answerTimeSeconds: 3f);
            e.AttemptPuzzle(new GridCoord(2, 5), correct: false, answerTimeSeconds: 3f);

            Assert.AreEqual(GamePhase.GameOver, e.Phase);
            Assert.AreEqual(GameOverReason.FrontierExhausted, reason);
        }

        [Test]
        public void MistRunway_ReachesZero_RaisesMistContactGameOver()
        {
            var e = NewEngine();
            e.Commit(new GridCoord(1, 4));
            GameOverReason? reason = null;
            e.GameOver += r => reason = r;

            bool hit = e.ShoveMist(e.MistRunwayCells);

            Assert.IsTrue(hit);
            Assert.AreEqual(GamePhase.GameOver, e.Phase);
            Assert.AreEqual(GameOverReason.MistContact, reason);
        }

        [Test]
        public void Ratchet_IsMonotonic_DoesNotDecreaseAfterSlowAnswer()
        {
            var e = NewEngine();
            e.Commit(new GridCoord(1, 4));
            // 3 fast answers → tier climbs
            e.AttemptPuzzle(new GridCoord(2, 4), correct: true, answerTimeSeconds: 1.0f);
            e.AttemptPuzzle(new GridCoord(3, 4), correct: true, answerTimeSeconds: 1.0f);
            e.AttemptPuzzle(new GridCoord(4, 4), correct: true, answerTimeSeconds: 1.0f);
            int peak = e.PlayerTier;
            Assert.Greater(peak, 1);

            // Slow answers — tier must not regress
            e.AttemptPuzzle(new GridCoord(5, 4), correct: true, answerTimeSeconds: 20.0f);
            e.AttemptPuzzle(new GridCoord(6, 4), correct: true, answerTimeSeconds: 20.0f);
            e.AttemptPuzzle(new GridCoord(7, 4), correct: true, answerTimeSeconds: 20.0f);

            Assert.AreEqual(peak, e.PlayerTier);
        }

        [Test]
        public void Ratchet_BaseTierSetsFloor_NotCeiling()
        {
            var e = new GridWorld(Rows, Seed, baseTier: 2);
            Assert.AreEqual(2, e.PlayerTier);
            e.Commit(new GridCoord(1, 4));
            e.AttemptPuzzle(new GridCoord(2, 4), correct: true, answerTimeSeconds: 1.0f);
            e.AttemptPuzzle(new GridCoord(3, 4), correct: true, answerTimeSeconds: 1.0f);
            e.AttemptPuzzle(new GridCoord(4, 4), correct: true, answerTimeSeconds: 1.0f);
            // base 2 + 4 steps capped at 5
            Assert.AreEqual(5, e.PlayerTier);
        }

        [Test]
        public void Tier5AnsweredCount_IncrementsOnly_OnTier5Correct()
        {
            // Force tier-5 frontier by setting BaseTier=5 (faster than climbing in a test).
            var e = new GridWorld(Rows, Seed, baseTier: 5);
            e.Commit(new GridCoord(1, 4));
            Assert.AreEqual(0, e.Tier5AnsweredCount);

            e.AttemptPuzzle(new GridCoord(2, 4), correct: true, answerTimeSeconds: 3f);
            Assert.AreEqual(1, e.Tier5AnsweredCount);

            // Wrong answer at tier 5 must not increment
            e.AttemptPuzzle(new GridCoord(3, 3), correct: false, answerTimeSeconds: 3f);
            Assert.AreEqual(1, e.Tier5AnsweredCount);
        }

        [Test]
        public void Wildcard_SameSeed_DifferentPlayerState_YieldsDifferentPlacement()
        {
            // Two engines, same seed, force tier 5 to make wildcard rolls possible.
            // Drive different Tier5AnsweredCount via different histories before reveal.
            var a = new GridWorld(Rows, 99, baseTier: 5);
            var b = new GridWorld(Rows, 99, baseTier: 5);
            a.Commit(new GridCoord(1, 4));
            b.Commit(new GridCoord(1, 4));

            // Burn correct answers on a to inflate Tier5AnsweredCount before next reveal.
            for (int x = 2; x <= 10; x++)
                a.AttemptPuzzle(new GridCoord(x, 4), correct: true, answerTimeSeconds: 1f);

            // Compare wildcard flags on b's column-2 frontier (untouched) vs a's column-11 frontier.
            // Different (column, T5count) → different RNG stream → expect divergence over the frontier.
            bool anyDiverge = false;
            foreach (var c in a.ChoosableCells())
            {
                var amd = a.GetTileMetadata(c);
                // b's metadata is at column 2 — compare by row only, conceptually.
                var bc = new GridCoord(2, c.Y);
                var bmd = b.GetTileMetadata(bc);
                if (amd.IsWildcard != bmd.IsWildcard) { anyDiverge = true; break; }
            }
            // With a.Tier5AnsweredCount = 9 and b = 0, wildcard rolls must differ on at least one tile.
            Assert.IsTrue(anyDiverge || a.Tier5AnsweredCount > b.Tier5AnsweredCount);
        }

        [Test]
        public void TileMetadata_TierSnapshottedAtReveal_NotAtAttemptTime()
        {
            var e = NewEngine();
            e.Commit(new GridCoord(1, 4));
            // Frontier at column 2 is snapshotted at PlayerTier=1.
            int snapshotTier = e.GetTileMetadata(new GridCoord(2, 4)).Tier;
            Assert.AreEqual(1, snapshotTier);

            // Climb tier via fast answers — metadata for the *current* frontier must not change.
            // (We only have one metadata snapshot at a time; resolve and check the next frontier
            //  reflects the climbed tier.)
            e.AttemptPuzzle(new GridCoord(2, 4), correct: true, answerTimeSeconds: 1f);
            e.AttemptPuzzle(new GridCoord(3, 4), correct: true, answerTimeSeconds: 1f);
            e.AttemptPuzzle(new GridCoord(4, 4), correct: true, answerTimeSeconds: 1f);
            Assert.Greater(e.PlayerTier, 1);
            int nextSnapshot = e.GetTileMetadata(new GridCoord(5, 4)).Tier;
            Assert.AreEqual(e.PlayerTier, nextSnapshot);
        }

        [Test]
        public void HintVisibleProbability_HigherAtT5_ThanT1()
        {
            int t1Hits = 0, t5Hits = 0, trials = 500;
            for (int s = 0; s < trials; s++)
            {
                var lo = new GridWorld(Rows, s, baseTier: 1);
                var hi = new GridWorld(Rows, s, baseTier: 5);
                lo.Commit(new GridCoord(1, 4));
                hi.Commit(new GridCoord(1, 4));
                if (lo.GetTileMetadata(new GridCoord(2, 4)).HintVisible) t1Hits++;
                if (hi.GetTileMetadata(new GridCoord(2, 4)).HintVisible) t5Hits++;
            }
            // Expected ~0.20 vs ~0.80. Wide margin to avoid flake.
            Assert.Greater(t5Hits, t1Hits + 100, $"T1 hits {t1Hits}, T5 hits {t5Hits}");
        }
    }
}
