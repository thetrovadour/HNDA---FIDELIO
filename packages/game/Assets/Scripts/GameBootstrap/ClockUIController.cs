using TMPro;
using UnityEngine;
using Catr.GridEngine;
using Catr.GridRenderer;

namespace Catr.GameBootstrap
{
    /// <summary>
    /// HUD clock that displays GridWorld.TimeRemaining as integer seconds.
    /// Drop on a GameObject with a TMP_Text child (or assign one in inspector).
    /// </summary>
    public class ClockUIController : MonoBehaviour
    {
        [SerializeField] private GridRendererBehaviour gridRenderer;
        [SerializeField] private TMP_Text label;
        [SerializeField] private string format = "{0}s";

        private GridWorld engine;

        private void Start()
        {
            if (gridRenderer == null || gridRenderer.Engine == null)
            {
                Debug.LogError("[ClockUI] GridRenderer.Engine is null.");
                enabled = false;
                return;
            }
            if (label == null)
            {
                Debug.LogError("[ClockUI] Label is not assigned.");
                enabled = false;
                return;
            }
            engine = gridRenderer.Engine;
            engine.TimeRemainingChanged += OnTimeChanged;
            Render(engine.TimeRemaining);
        }

        private void Update()
        {
            if (engine == null) return;
            Render(engine.TimeRemaining);
        }

        private void OnDestroy()
        {
            if (engine != null) engine.TimeRemainingChanged -= OnTimeChanged;
        }

        private void OnTimeChanged(float t) => Render(t);

        private void Render(float t) => label.text = string.Format(format, Mathf.CeilToInt(t));
    }
}
