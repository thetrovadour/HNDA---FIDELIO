using UnityEngine;
using Catr.BackendClient;
using Catr.GridEngine;
using Catr.QuestionEngine;

namespace Catr.QuestionUI.Sandbox
{
    /// <summary>
    /// B4 dry-run. Press SPACE to show a fake question card; press H to hide.
    /// Delete this file once B5 wires the real flow.
    /// </summary>
    public class CardDryRun : MonoBehaviour
    {
        [SerializeField] private QuestionCardBehaviour card;
        [SerializeField] private Vector3 worldPos = new Vector3(0f, 0f, 0f);

        void Update()
        {
            var kb = UnityEngine.InputSystem.Keyboard.current;
            if (kb == null) return;

            if (kb.spaceKey.wasPressedThisFrame)
            {
                var payload = new QuestionPayload(
                    id: "dryrun-1",
                    prompt: "¿Cuál es la capital de Honduras?",
                    answers: new[] { "Tegucigalpa", "San Pedro Sula", "La Ceiba", "Choluteca" },
                    correctIndex: 0,
                    kind: Catr.BackendClient.QuestionKind.MC,
                    category: QuestionCategory.GREEN,
                    tier: 3,
                    isWildcard: false);
                var active = new ActiveQuestion(new GridCoord(1, 4), payload, isWildcard: false);
                card.Show(active, worldPos);
            }

            if (kb.hKey.wasPressedThisFrame)
            {
                card.Hide();
            }
        }
    }
}
