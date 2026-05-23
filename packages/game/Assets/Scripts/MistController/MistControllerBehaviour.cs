using UnityEngine;
using Catr.GridEngine;
using Catr.GridRenderer;

namespace Catr.MistController
{
    public class MistControllerBehaviour : MonoBehaviour
    {
        [SerializeField] private GridRendererBehaviour gridRenderer;
        [SerializeField] private float intervalSeconds = 2.3f;

        private float timer;
        private int mistFrontX;

        private void Update()
        {
            if (gridRenderer == null || gridRenderer.Engine == null) return;
            var e = gridRenderer.Engine;
            if (e.Phase != GamePhase.Running) return;

            timer += Time.deltaTime;
            if (timer < intervalSeconds) return;
            timer = 0f;

            e.ConsumeColumn(mistFrontX);
            mistFrontX++;
        }
    }
}
