using UnityEngine;
using Catr.GridEngine;
using Catr.GridRenderer;

namespace Catr.MistController
{
    /// <summary>
    /// Drives the unified time/mist clock. Each real second feeds the engine
    /// via Tick(dt) — the engine decrements TimeRemaining and advances the
    /// mist front to match. Only ticks during Running.
    /// </summary>
    public class MistControllerBehaviour : MonoBehaviour
    {
        [SerializeField] private GridRendererBehaviour gridRenderer;

        private void Update()
        {
            if (gridRenderer == null || gridRenderer.Engine == null) return;
            var e = gridRenderer.Engine;
            if (e.Phase != GamePhase.Running) return;
            e.Tick(Time.deltaTime);
        }
    }
}
