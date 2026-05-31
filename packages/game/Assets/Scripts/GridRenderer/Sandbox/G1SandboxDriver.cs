// G1 DEBUG DRIVER — retired 2026-05-30. Replaced by InputAdapter + QuestionFlow.
// Kept as an inert MonoBehaviour so existing scene references don't break;
// safe to delete this file once the SandboxDriver GameObject is removed from the scene.

using UnityEngine;

namespace Catr.GridRenderer.Sandbox
{
    public class G1SandboxDriver : MonoBehaviour
    {
        [SerializeField] private GridRendererBehaviour gridRenderer;
    }
}
