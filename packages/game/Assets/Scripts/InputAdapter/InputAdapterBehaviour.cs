using UnityEngine;
using UnityEngine.InputSystem;
using Catr.GridEngine;
using Catr.GridRenderer;

namespace Catr.InputAdapter
{
    public class InputAdapterBehaviour : MonoBehaviour
    {
        [SerializeField] private GridRendererBehaviour gridRenderer;

        private void Update()
        {
            if (gridRenderer == null || gridRenderer.Engine == null) return;
            if (Pointer.current == null) return;
            if (!Pointer.current.press.wasPressedThisFrame) return;

            var e = gridRenderer.Engine;
            if (e.Phase == GamePhase.GameOver) return;

            var target = gridRenderer.ScreenToGridCoord(Pointer.current.position.ReadValue());
            if (target.Y < 0 || target.Y >= e.RowCount) return;

            if (e.Phase == GamePhase.Warmup)
                HandleWarmupClick(e, target);
            else
                HandleRunningClick(e, target);
        }

        private static void HandleWarmupClick(GridWorld e, GridCoord target)
        {
            if (target.X == 0)
            {
                int dy = target.Y - e.PlayerPosition.Y;
                if (dy == -1) e.TryWarmupMove(VerticalDir.Up);
                else if (dy == 1) e.TryWarmupMove(VerticalDir.Down);
                return;
            }
            if (target.X == 1 && IsFrontier(e, target))
                SafeCall(() => e.Commit(target));
        }

        private static void HandleRunningClick(GridWorld e, GridCoord target)
        {
            if (!IsFrontier(e, target)) return;
            SafeCall(() => e.ResolvePuzzle(target, correct: true));
        }

        private static bool IsFrontier(GridWorld e, GridCoord c)
        {
            if (c.X != e.PlayerPosition.X + 1) return false;
            int dy = c.Y - e.PlayerPosition.Y;
            return dy >= -1 && dy <= 1;
        }

        private static void SafeCall(System.Action a)
        {
            try { a(); } catch (System.Exception ex) { Debug.LogWarning(ex.Message); }
        }
    }
}
