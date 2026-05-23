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
            e.ResolvePuzzle(new GridCoord(2, 5), correct: true);

            Assert.AreEqual(3, positions.Count);
            Assert.AreEqual(new GridCoord(0, 5), positions[0]);
            Assert.AreEqual(new GridCoord(1, 5), positions[1]);
            Assert.AreEqual(new GridCoord(2, 5), positions[2]);
        }
    }
}
