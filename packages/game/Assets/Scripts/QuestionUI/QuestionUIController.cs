using UnityEngine;
using Catr.GridEngine;
using Catr.GridRenderer;
using Catr.QuestionEngine;

namespace Catr.QuestionUI
{
    /// <summary>
    /// Scene-level glue between QuestionFlow and the QuestionCard prefab.
    /// Subscribes to QuestionFetched/AnswerResolved/GameOver and drives the card.
    /// </summary>
    public class QuestionUIController : MonoBehaviour
    {
        [SerializeField] private GridRendererBehaviour gridRenderer;
        [SerializeField] private QuestionCardBehaviour card;

        private QuestionFlow _flow;
        private GridWorld _engine;
        private float _shownAt;

        /// <summary>
        /// Injected by the scene wiring (or the GridRenderer host) once QuestionFlow exists.
        /// </summary>
        public void Bind(QuestionFlow flow, GridWorld engine)
        {
            if (_flow != null)
            {
                _flow.QuestionFetched -= OnFetched;
                _flow.AnswerResolved -= OnResolved;
            }
            if (_engine != null)
            {
                _engine.GameOver -= OnGameOver;
            }

            _flow = flow;
            _engine = engine;

            _flow.QuestionFetched += OnFetched;
            _flow.AnswerResolved += OnResolved;
            _engine.GameOver += OnGameOver;

            card.AnswerClicked += OnAnswerClicked;
        }

        public string CurrentLanguage()
        {
            return Application.systemLanguage == SystemLanguage.Spanish ? "es" : "en";
        }

        void OnDestroy()
        {
            if (_flow != null)
            {
                _flow.QuestionFetched -= OnFetched;
                _flow.AnswerResolved -= OnResolved;
            }
            if (_engine != null) _engine.GameOver -= OnGameOver;
            if (card != null) card.AnswerClicked -= OnAnswerClicked;
        }

        private void OnFetched(GridCoord target, ActiveQuestion q)
        {
            Vector3 tileWorld = gridRenderer.GridToWorld(target);
            float offset = 1.5f * gridRenderer.CellSize;
            // Flip below if the tile is in the top row (Y == 0 is top per engine semantics).
            float dy = target.Y == 0 ? -offset : +offset;
            Vector3 cardPos = tileWorld + new Vector3(0f, dy, 0f);

            _shownAt = Time.time;
            card.Show(q, cardPos);
        }

        private void OnAnswerClicked(int idx)
        {
            float elapsed = Time.time - _shownAt;
            _ = _flow.ResolveAnswer(idx, elapsed);
        }

        private void OnResolved(GridCoord target, bool correct)
        {
            card.Hide();
        }

        private void OnGameOver(GameOverReason reason)
        {
            card.Hide();
        }
    }
}
