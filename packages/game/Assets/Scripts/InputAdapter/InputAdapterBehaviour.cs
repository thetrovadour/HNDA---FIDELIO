using UnityEngine;
using UnityEngine.InputSystem;
using Catr.GridEngine;
using Catr.GridRenderer;
using Catr.QuestionEngine;

namespace Catr.InputAdapter
{
    public class InputAdapterBehaviour : MonoBehaviour
    {
        [SerializeField] private GridRendererBehaviour gridRenderer;

        private QuestionFlow _flow;

        public void Bind(QuestionFlow flow)
        {
            _flow = flow;
        }

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

        private void HandleRunningClick(GridWorld e, GridCoord target)
        {
            if (!IsFrontier(e, target)) return;

            // Black trap tile: instant wrong-answer path, no question fetch.
            if (e.CategoryFor(target.X, target.Y) == CellCategory.Black)
            {
                SafeCall(() => e.AttemptPuzzle(target, correct: false, answerTimeSeconds: 0f));
                return;
            }

            if (_flow == null)
            {
                Debug.LogWarning("[InputAdapter] No QuestionFlow bound; ignoring frontier click.");
                return;
            }

            _ = _flow.RequestQuestion(target);
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
