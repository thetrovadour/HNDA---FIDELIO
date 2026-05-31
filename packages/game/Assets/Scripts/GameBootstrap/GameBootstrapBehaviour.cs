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

                // RED — pop/culture — fill T2, T3, T4, T5
                Mc("mock-red-2", "¿Qué grupo cantó 'Bohemian Rhapsody'?", "Which band sang 'Bohemian Rhapsody'?", es,
                    new[] { "The Beatles", "Queen", "Led Zeppelin", "Pink Floyd" },
                    new[] { "The Beatles", "Queen", "Led Zeppelin", "Pink Floyd" }, 1, QuestionCategory.RED, 2),
                Mc("mock-red-3", "¿Quién dirigió la película 'Pulp Fiction'?", "Who directed 'Pulp Fiction'?", es,
                    new[] { "Scorsese", "Tarantino", "Spielberg", "Nolan" },
                    new[] { "Scorsese", "Tarantino", "Spielberg", "Nolan" }, 1, QuestionCategory.RED, 3),
                Mc("mock-red-4", "¿En qué año se lanzó el primer iPhone?", "What year was the first iPhone released?", es,
                    new[] { "2005", "2007", "2009", "2010" },
                    new[] { "2005", "2007", "2009", "2010" }, 1, QuestionCategory.RED, 4),
                Mc("mock-red-5", "¿Quién escribió 'Cien Años de Soledad'?", "Who wrote 'One Hundred Years of Solitude'?", es,
                    new[] { "Borges", "Cortázar", "García Márquez", "Vargas Llosa" },
                    new[] { "Borges", "Cortázar", "García Márquez", "Vargas Llosa" }, 2, QuestionCategory.RED, 5),

                // BLUE — math — fill T1, T3, T4, T5
                Mc("mock-blue-1", "¿Cuánto es 9 + 6?", "What is 9 + 6?", es,
                    new[] { "13", "14", "15", "16" },
                    new[] { "13", "14", "15", "16" }, 2, QuestionCategory.BLUE, 1),
                Mc("mock-blue-3", "¿Cuál es la raíz cuadrada de 144?", "What is the square root of 144?", es,
                    new[] { "10", "11", "12", "13" },
                    new[] { "10", "11", "12", "13" }, 2, QuestionCategory.BLUE, 3),
                Mc("mock-blue-4", "¿Cuántos grados tiene un triángulo interior total?", "How many degrees in a triangle's interior angles total?", es,
                    new[] { "90", "180", "270", "360" },
                    new[] { "90", "180", "270", "360" }, 1, QuestionCategory.BLUE, 4),
                Mc("mock-blue-5", "¿Cuál es el valor aproximado de π hasta 3 decimales?", "What is π to 3 decimals?", es,
                    new[] { "3.141", "3.142", "3.144", "3.146" },
                    new[] { "3.141", "3.142", "3.144", "3.146" }, 1, QuestionCategory.BLUE, 5),

                // GREEN — history — fill T1, T2, T4, T5
                Mc("mock-green-1", "¿En qué continente cayó el Imperio Romano de Occidente?", "On what continent did the Western Roman Empire fall?", es,
                    new[] { "Asia", "África", "Europa", "América" },
                    new[] { "Asia", "Africa", "Europe", "Americas" }, 2, QuestionCategory.GREEN, 1),
                Mc("mock-green-2", "¿Quién fue el primer presidente de los Estados Unidos?", "Who was the first U.S. president?", es,
                    new[] { "Jefferson", "Washington", "Adams", "Lincoln" },
                    new[] { "Jefferson", "Washington", "Adams", "Lincoln" }, 1, QuestionCategory.GREEN, 2),
                Mc("mock-green-4", "¿En qué año cayó el Muro de Berlín?", "What year did the Berlin Wall fall?", es,
                    new[] { "1985", "1989", "1991", "1993" },
                    new[] { "1985", "1989", "1991", "1993" }, 1, QuestionCategory.GREEN, 4),
                Mc("mock-green-5", "¿Quién lideró la independencia centroamericana en 1821?", "Who led Central American independence in 1821?", es,
                    new[] { "Morazán", "Valle", "Bolívar", "San Martín" },
                    new[] { "Morazán", "Valle", "Bolívar", "San Martín" }, 1, QuestionCategory.GREEN, 5),

                // YELLOW — sports — fill T1, T3, T4, T5
                Mc("mock-yellow-1", "¿Con qué se juega al fútbol?", "What do you play soccer with?", es,
                    new[] { "Raqueta", "Bate", "Balón", "Palo" },
                    new[] { "Racket", "Bat", "Ball", "Stick" }, 2, QuestionCategory.YELLOW, 1),
                Mc("mock-yellow-3", "¿Cada cuántos años se celebra el Mundial de Fútbol?", "How often is the FIFA World Cup held?", es,
                    new[] { "2", "3", "4", "5" },
                    new[] { "2", "3", "4", "5" }, 2, QuestionCategory.YELLOW, 3),
                Mc("mock-yellow-4", "¿En qué deporte destacó Michael Jordan?", "In which sport did Michael Jordan excel?", es,
                    new[] { "Béisbol", "Baloncesto", "Fútbol Americano", "Tenis" },
                    new[] { "Baseball", "Basketball", "American Football", "Tennis" }, 1, QuestionCategory.YELLOW, 4),
                Mc("mock-yellow-5", "¿Quién ganó el Balón de Oro 2008?", "Who won the 2008 Ballon d'Or?", es,
                    new[] { "Messi", "Ronaldo (CR7)", "Kaká", "Iniesta" },
                    new[] { "Messi", "Ronaldo (CR7)", "Kaká", "Iniesta" }, 1, QuestionCategory.YELLOW, 5),

                // PURPLE — sci-tech — fill T1, T2, T3, T5
                Mc("mock-purple-1", "¿De qué color es el cielo en un día despejado?", "What color is the sky on a clear day?", es,
                    new[] { "Verde", "Azul", "Rojo", "Amarillo" },
                    new[] { "Green", "Blue", "Red", "Yellow" }, 1, QuestionCategory.PURPLE, 1),
                Mc("mock-purple-2", "¿Cuál es el planeta más cercano al Sol?", "Which planet is closest to the Sun?", es,
                    new[] { "Venus", "Mercurio", "Tierra", "Marte" },
                    new[] { "Venus", "Mercury", "Earth", "Mars" }, 1, QuestionCategory.PURPLE, 2),
                Mc("mock-purple-3", "¿Cuál es la velocidad de la luz aproximada (km/s)?", "What is the approximate speed of light (km/s)?", es,
                    new[] { "150,000", "200,000", "300,000", "500,000" },
                    new[] { "150,000", "200,000", "300,000", "500,000" }, 2, QuestionCategory.PURPLE, 3),
                Mc("mock-purple-5", "¿Qué partícula descubrió el CERN en 2012?", "Which particle did CERN discover in 2012?", es,
                    new[] { "Quark top", "Bosón de Higgs", "Neutrino", "Muón" },
                    new[] { "Top quark", "Higgs boson", "Neutrino", "Muon" }, 1, QuestionCategory.PURPLE, 5),

                // T/F — one per color at tier 3 (QuestionFlow locks TF at tier 3)
                Tf("mock-tf-red-3",    "Elvis Presley grabó 'Hound Dog' antes que 'Heartbreak Hotel'.", "Elvis Presley recorded 'Hound Dog' before 'Heartbreak Hotel'.", es, false, QuestionCategory.RED, 3),
                Tf("mock-tf-blue-3",   "El número π es racional.", "The number π is rational.", es, false, QuestionCategory.BLUE, 3),
                Tf("mock-tf-yellow-3", "El Mundial de Fútbol de 1986 lo ganó Argentina.", "Argentina won the 1986 FIFA World Cup.", es, true, QuestionCategory.YELLOW, 3),
                Tf("mock-tf-purple-3", "El agua hierve a 100°C al nivel del mar.", "Water boils at 100°C at sea level.", es, true, QuestionCategory.PURPLE, 3),
                Tf("mock-tf-orange-3", "Australia es a la vez un país y un continente.", "Australia is both a country and a continent.", es, true, QuestionCategory.ORANGE, 3),

                // ORANGE — geography — fill T2, T3, T4, T5
                Mc("mock-orange-2", "¿Cuál es la capital de Francia?", "What is the capital of France?", es,
                    new[] { "Berlín", "Madrid", "París", "Roma" },
                    new[] { "Berlin", "Madrid", "Paris", "Rome" }, 2, QuestionCategory.ORANGE, 2),
                Mc("mock-orange-3", "¿Cuál es el río más largo del mundo?", "What is the longest river in the world?", es,
                    new[] { "Nilo", "Amazonas", "Yangtsé", "Misisipi" },
                    new[] { "Nile", "Amazon", "Yangtze", "Mississippi" }, 1, QuestionCategory.ORANGE, 3),
                Mc("mock-orange-4", "¿En qué océano está Hawái?", "In which ocean is Hawaii?", es,
                    new[] { "Atlántico", "Índico", "Pacífico", "Ártico" },
                    new[] { "Atlantic", "Indian", "Pacific", "Arctic" }, 2, QuestionCategory.ORANGE, 4),
                Mc("mock-orange-5", "¿Cuál es el país más pequeño del mundo por superficie?", "What is the smallest country in the world by area?", es,
                    new[] { "Mónaco", "Vaticano", "San Marino", "Liechtenstein" },
                    new[] { "Monaco", "Vatican City", "San Marino", "Liechtenstein" }, 1, QuestionCategory.ORANGE, 5),
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
