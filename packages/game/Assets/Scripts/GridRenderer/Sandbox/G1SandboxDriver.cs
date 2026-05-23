// G1 SANDBOX ONLY — delete when InputAdapter + MistController land.
// Drives GridEngine with keyboard hotkeys so we can see the renderer respond.
//   W / S         → warmup move up / down (column 0 only)
//   Space         → commit center-forward cell (ends warmup)
//   1 / 2 / 3     → ResolvePuzzle correct on up-right / right / down-right
//   0             → ResolvePuzzle wrong (no-op verification)
//   M             → manually consume column (playerX - 2)

using UnityEngine;
using Catr.GridEngine;

namespace Catr.GridRenderer.Sandbox
{
    public class G1SandboxDriver : MonoBehaviour
    {
        [SerializeField] private GridRendererBehaviour gridRenderer;

        private void Update()
        {
            if (gridRenderer == null || gridRenderer.Engine == null) return;
            var e = gridRenderer.Engine;

            if (Input.GetKeyDown(KeyCode.W)) e.TryWarmupMove(VerticalDir.Up);
            if (Input.GetKeyDown(KeyCode.S)) e.TryWarmupMove(VerticalDir.Down);

            if (Input.GetKeyDown(KeyCode.Space) && e.Phase == GamePhase.Warmup)
            {
                var fwd = new GridCoord(e.PlayerPosition.X + 1, e.PlayerPosition.Y);
                SafeCall(() => e.Commit(fwd));
            }

            if (e.Phase == GamePhase.Running)
            {
                if (Input.GetKeyDown(KeyCode.Alpha1)) Resolve(+1, true);
                if (Input.GetKeyDown(KeyCode.Alpha2)) Resolve( 0, true);
                if (Input.GetKeyDown(KeyCode.Alpha3)) Resolve(-1, true);
                if (Input.GetKeyDown(KeyCode.Alpha0)) Resolve( 0, false);
            }

            if (Input.GetKeyDown(KeyCode.M))
                SafeCall(() => e.ConsumeColumn(e.PlayerPosition.X - 2));
        }

        private void Resolve(int dy, bool correct)
        {
            var e = gridRenderer.Engine;
            var target = new GridCoord(e.PlayerPosition.X + 1, e.PlayerPosition.Y + dy);
            SafeCall(() => e.ResolvePuzzle(target, correct));
        }

        private static void SafeCall(System.Action a)
        {
            try { a(); } catch (System.Exception ex) { Debug.LogWarning(ex.Message); }
        }
    }
}
