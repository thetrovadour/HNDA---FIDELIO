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
                _engine.PlayerMoved -= OnPlayerMoved;
            }

            _flow = flow;
            _engine = engine;

            _flow.QuestionFetched += OnFetched;
            _flow.AnswerResolved += OnResolved;
            _engine.GameOver += OnGameOver;
            _engine.PlayerMoved += OnPlayerMoved;

            card.AnswerClicked += OnAnswerClicked;
        }

        private void OnPlayerMoved(GridCoord pos)
        {
            // If the player moved (e.g., Warmup teleport) and the active card is for
            // a tile that's no longer adjacent, the card is stale — hide it.
            if (_flow?.Active == null) return;
            var target = _flow.Active.Target;
            if (target.X != pos.X + 1 || System.Math.Abs(target.Y - pos.Y) > 1)
                card.Hide();
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
            if (_engine != null)
            {
                _engine.GameOver -= OnGameOver;
                _engine.PlayerMoved -= OnPlayerMoved;
            }
            if (card != null) card.AnswerClicked -= OnAnswerClicked;
        }

        private void OnFetched(GridCoord target, ActiveQuestion q)
        {
            // Race guard: player may have moved between RequestQuestion and the fetch
            // completing. If the target is no longer adjacent, drop the stale card.
            var pos = _engine.PlayerPosition;
            if (target.X != pos.X + 1 || System.Math.Abs(target.Y - pos.Y) > 1)
            {
                card.Hide();
                return;
            }

            Vector3 tileWorld = gridRenderer.GridToWorld(target);
            float offsetX = 2.0f * gridRenderer.CellSize;
            Vector3 cardPos = tileWorld + new Vector3(offsetX, 0f, 0f);

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
