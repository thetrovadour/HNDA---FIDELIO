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

        private readonly int seed;
        private readonly HashSet<int> consumedColumns = new HashSet<int>();
        private readonly HashSet<GridCoord> spentCells = new HashSet<GridCoord>();
        private int maxRevealedColumn;

        public GridWorld(int rowCount, int seed)
        {
            if (rowCount < 3) throw new ArgumentException("rowCount must be >= 3", nameof(rowCount));
            RowCount = rowCount;
            this.seed = seed;
            PlayerPosition = new GridCoord(0, rowCount / 2);
            Phase = GamePhase.Warmup;
            maxRevealedColumn = 1;
        }

        public bool TryWarmupMove(VerticalDir dir)
        {
            if (Phase != GamePhase.Warmup) return false;
            int newY = PlayerPosition.Y + (dir == VerticalDir.Up ? -1 : 1);
            if (newY < 0 || newY >= RowCount) return false;
            PlayerPosition = new GridCoord(0, newY);
            PlayerMoved?.Invoke(PlayerPosition);
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

            if (c == PlayerPosition)
                return new CellView(VisualState.Entered, CategoryFor(c.X, c.Y));

            if (Phase == GamePhase.Warmup && c.X == 0)
                return new CellView(VisualState.WarmupBlack, null);

            if (IsChoosable(c))
                return new CellView(VisualState.Revealed, CategoryFor(c.X, c.Y));

            if (spentCells.Contains(c))
                return new CellView(VisualState.Spent, CategoryFor(c.X, c.Y));

            return new CellView(VisualState.Unrevealed, null);
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
            RaiseRevealedForFrontier();
        }

        public void ResolvePuzzle(GridCoord target, bool correct)
        {
            if (Phase != GamePhase.Running)
                throw new InvalidOperationException("ResolvePuzzle only valid during Running.");
            if (!IsChoosable(target))
                throw new ArgumentException($"Target {target} is not choosable.", nameof(target));
            if (!correct) return;

            MarkOtherChoosablesSpent(target);
            spentCells.Add(PlayerPosition);
            spentCells.Remove(target);

            PlayerPosition = target;
            maxRevealedColumn = target.X + 1;
            PlayerMoved?.Invoke(PlayerPosition);
            RaiseRevealedForFrontier();
        }

        public void ConsumeColumn(int x)
        {
            if (consumedColumns.Add(x))
            {
                for (int y = 0; y < RowCount; y++)
                    spentCells.Remove(new GridCoord(x, y));
                if (PlayerPosition.X == x)
                    Phase = GamePhase.GameOver;
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
    }
}
