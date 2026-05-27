using UnityEngine;
using Catr.BackendClient;
using Catr.GridRenderer;
using Catr.InputAdapter;
using Catr.QuestionEngine;
using Catr.QuestionUI;

namespace Catr.GameBootstrap
{
    /// <summary>
    /// Composition root for the B5 mock-backed loop.
    /// Builds an in-memory pool, a MockBackendClient, a QuestionFlow,
    /// then injects them into QuestionUIController and InputAdapterBehaviour.
    /// </summary>
    public class GameBootstrapBehaviour : MonoBehaviour
    {
        [SerializeField] private GridRendererBehaviour gridRenderer;
        [SerializeField] private QuestionUIController uiController;
        [SerializeField] private InputAdapterBehaviour inputAdapter;
        [SerializeField] private int seed = 42;

        private void Start()
        {
            if (gridRenderer == null || gridRenderer.Engine == null)
            {
                Debug.LogError("[GameBootstrap] GridRenderer.Engine is null at Start.");
                return;
            }

            var lang = Application.systemLanguage == SystemLanguage.Spanish ? "es" : "en";
            var client = new MockBackendClient(BuildPool(lang));
            var flow = new QuestionFlow(gridRenderer.Engine, client, lang, seed);

            uiController.Bind(flow, gridRenderer.Engine);
            inputAdapter.Bind(flow);
        }

        private static QuestionPayload[] BuildPool(string lang)
        {
            bool es = lang == "es";
            return new[]
            {
                // Red / 1
                Mc(id: "mock-red-1",
                    promptEs: "¿Qué color resulta de mezclar rojo y blanco?",
                    promptEn: "Which color comes from mixing red and white?",
                    es: es,
                    answers: new[] { "Rosado", "Morado", "Naranja", "Café" },
                    answersEn: new[] { "Pink", "Purple", "Orange", "Brown" },
                    correct: 0,
                    category: QuestionCategory.RED, tier: 1),

                // Blue / 2
                Mc(id: "mock-blue-2",
                    promptEs: "¿Cuánto es 7 × 6?",
                    promptEn: "What is 7 × 6?",
                    es: es,
                    answers: new[] { "36", "42", "48", "54" },
                    answersEn: new[] { "36", "42", "48", "54" },
                    correct: 1,
                    category: QuestionCategory.BLUE, tier: 2),

                // Green / 3
                Mc(id: "mock-green-3",
                    promptEs: "¿En qué año se independizó Honduras de España?",
                    promptEn: "In what year did Honduras gain independence from Spain?",
                    es: es,
                    answers: new[] { "1810", "1821", "1838", "1865" },
                    answersEn: new[] { "1810", "1821", "1838", "1865" },
                    correct: 1,
                    category: QuestionCategory.GREEN, tier: 3),

                // Yellow / 2
                Mc(id: "mock-yellow-2",
                    promptEs: "¿Cuántos jugadores hay en un equipo de fútbol en cancha?",
                    promptEn: "How many players are on a soccer team on the field?",
                    es: es,
                    answers: new[] { "9", "10", "11", "12" },
                    answersEn: new[] { "9", "10", "11", "12" },
                    correct: 2,
                    category: QuestionCategory.YELLOW, tier: 2),

                // Purple / 4
                Mc(id: "mock-purple-4",
                    promptEs: "¿Cuál es el símbolo químico del oro?",
                    promptEn: "What is the chemical symbol for gold?",
                    es: es,
                    answers: new[] { "Go", "Au", "Ag", "Or" },
                    answersEn: new[] { "Go", "Au", "Ag", "Or" },
                    correct: 1,
                    category: QuestionCategory.PURPLE, tier: 4),

                // Orange / 1
                Mc(id: "mock-orange-1",
                    promptEs: "¿En qué continente está Honduras?",
                    promptEn: "On what continent is Honduras?",
                    es: es,
                    answers: new[] { "Europa", "Asia", "América", "África" },
                    answersEn: new[] { "Europe", "Asia", "Americas", "Africa" },
                    correct: 2,
                    category: QuestionCategory.ORANGE, tier: 1),

                // TF / Green / 3 (for TF injection path)
                Tf(id: "mock-tf-green-3",
                    promptEs: "Tegucigalpa es la capital de Honduras.",
                    promptEn: "Tegucigalpa is the capital of Honduras.",
                    es: es,
                    correct: true,
                    category: QuestionCategory.GREEN, tier: 3),

                // Wildcard / tier 5 / RED (for wildcard fetch path)
                Mc(id: "mock-wild-5",
                    promptEs: "¿Cuál es la moneda oficial de Honduras?",
                    promptEn: "What is the official currency of Honduras?",
                    es: es,
                    answers: new[] { "Quetzal", "Lempira", "Colón", "Peso" },
                    answersEn: new[] { "Quetzal", "Lempira", "Colón", "Peso" },
                    correct: 1,
                    category: QuestionCategory.RED, tier: 5, isWildcard: true),
            };
        }

        private static QuestionPayload Mc(
            string id, string promptEs, string promptEn, bool es,
            string[] answers, string[] answersEn,
            int correct, QuestionCategory category, int tier, bool isWildcard = false)
        {
            return new QuestionPayload(
                id: id,
                prompt: es ? promptEs : promptEn,
                answers: es ? answers : answersEn,
                correctIndex: correct,
                kind: QuestionKind.MC,
                category: category,
                tier: tier,
                isWildcard: isWildcard);
        }

        private static QuestionPayload Tf(
            string id, string promptEs, string promptEn, bool es,
            bool correct, QuestionCategory category, int tier)
        {
            var answersEs = new[] { "Verdadero", "Falso" };
            var answersEn = new[] { "True", "False" };
            return new QuestionPayload(
                id: id,
                prompt: es ? promptEs : promptEn,
                answers: es ? answersEs : answersEn,
                correctIndex: correct ? 0 : 1,
                kind: QuestionKind.TF,
                category: category,
                tier: tier,
                isWildcard: false);
        }
    }
}
