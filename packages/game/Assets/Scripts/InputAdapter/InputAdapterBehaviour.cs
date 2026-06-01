using UnityEngine;
using UnityEngine.EventSystems;
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
            if (EventSystem.current != null && EventSystem.current.IsPointerOverGameObject()) return;

            var e = gridRenderer.Engine;
            if (e.Phase == GamePhase.GameOver) return;

            var target = gridRenderer.ScreenToGridCoord(Pointer.current.position.ReadValue());
            if (target.Y < 0 || target.Y >= e.RowCount) return;

            if (e.Phase == GamePhase.Warmup)
                HandleWarmupClick(e, target);
            else
                HandleFrontierClick(e, target);
        }

        private void HandleWarmupClick(GridWorld e, GridCoord target)
        {
            if (target.X == 0)
            {
                SafeCall(() => e.TryWarmupMoveTo(target.Y));
                return;
            }
            if (target.X == 1 && IsFrontier(e, target))
                HandleFrontierClick(e, target);
        }

        private void HandleFrontierClick(GridWorld e, GridCoord target)
        {
            if (!IsFrontier(e, target)) return;

            // Already-consumed tile (a wrong answer or a black trap landed here): no re-attempt.
            // Re-querying would let the player retry the same tile until correct, defeating the
            // 3-strike frontier-exhaustion game-over. The only way forward is a different tile.
            if (e.TryGetTileMetadata(target, out var meta) && meta.Consumed) return;

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

            _ = RequestQuestionLogged(target);
        }

        private async System.Threading.Tasks.Task RequestQuestionLogged(GridCoord target)
        {
            try { await _flow.RequestQuestion(target); }
            catch (System.OperationCanceledException) { /* superseded by a newer click */ }
            catch (Catr.BackendClient.BackendException ex) when (ex.StatusCode == 404)
            {
                // Empty (category, tier) bucket — expected with a sparse seed, not a failure.
                // No card appears; the click is a no-op. Full coverage removes this in practice.
                Debug.LogWarning($"[InputAdapter] No question available for {target} ({ex.Message}).");
            }
            catch (System.Exception ex) { Debug.LogError($"[InputAdapter] RequestQuestion({target}) failed: {ex}"); }
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
