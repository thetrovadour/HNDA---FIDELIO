using System;
using System.Threading;
using System.Threading.Tasks;
using Catr.BackendClient;
using Catr.GridEngine;
using BcQuestionKind = Catr.BackendClient.QuestionKind;
using EngineQuestionKind = Catr.GridEngine.QuestionKind;

namespace Catr.QuestionEngine
{
    /// <summary>
    /// Orchestrates the question loop: reads tile metadata from GridWorld,
    /// fetches a question via IBackendClient, resolves the player's answer
    /// (server-first), then routes the outcome back into the engine.
    ///
    /// Pure C#, no Unity deps. One in-flight question at a time; a new
    /// RequestQuestion cancels any previous in-flight request.
    /// </summary>
    public sealed class QuestionFlow
    {
        // T/F tier is locked at 3 (mid-difficulty perceived breather).
        public const int TfTier = 3;
        // T/F injection cadence range — re-rolled after each TF emission.
        public const int CadenceMin = 5;
        public const int CadenceMax = 8;
        // T/F cap range — rolled once per run from the seed.
        public const int TfCapMin = 3;
        public const int TfCapMax = 7;

        private readonly GridWorld _engine;
        private readonly IBackendClient _client;
        private readonly string _lang;
        private readonly Random _rng;

        private int _fetchCount;
        private int _tfEmitted;
        private int _nextTfAt;
        private readonly int _tfCap;

        private ActiveQuestion _active;
        private CancellationTokenSource _inFlight;

        public event Action<GridCoord, ActiveQuestion> QuestionFetched;
        public event Action<GridCoord, bool> AnswerResolved;
        public event Action<GridCoord> WildcardCorrect;

        public ActiveQuestion Active => _active;

        public QuestionFlow(GridWorld engine, IBackendClient client, string lang, int seed)
        {
            _engine = engine ?? throw new ArgumentNullException(nameof(engine));
            _client = client ?? throw new ArgumentNullException(nameof(client));
            _lang = lang ?? "es";
            _rng = new Random(seed);
            _tfCap = _rng.Next(TfCapMin, TfCapMax + 1);
            _nextTfAt = _rng.Next(CadenceMin, CadenceMax + 1);
        }

        public async Task<ActiveQuestion> RequestQuestion(GridCoord target, CancellationToken ct = default)
        {
            // Cancel any in-flight request — last click wins (B3-Q2).
            _inFlight?.Cancel();
            _inFlight = CancellationTokenSource.CreateLinkedTokenSource(ct);
            var localCt = _inFlight.Token;

            var md = _engine.GetTileMetadata(target);
            bool wildcardFetch = md.IsWildcard || md.Category == CellCategory.White;

            _fetchCount++;
            bool injectTf = !wildcardFetch
                && _fetchCount >= _nextTfAt
                && _tfEmitted < _tfCap;

            QuestionRequest req;
            if (wildcardFetch)
            {
                req = new QuestionRequest(
                    category: QuestionCategory.RED, // ignored by server when wildcard=true
                    tier: 5,
                    kind: QuestionKindFilter.MC,
                    lang: _lang,
                    wildcard: true);
            }
            else if (injectTf)
            {
                req = new QuestionRequest(
                    category: MapCategory(md.Category),
                    tier: TfTier,
                    kind: QuestionKindFilter.TF,
                    lang: _lang,
                    wildcard: false);
                _tfEmitted++;
                _nextTfAt = _fetchCount + _rng.Next(CadenceMin, CadenceMax + 1);
            }
            else
            {
                req = new QuestionRequest(
                    category: MapCategory(md.Category),
                    tier: md.Tier,
                    kind: QuestionKindFilter.MC,
                    lang: _lang,
                    wildcard: false);
            }

            var payload = await _client.FetchNextAsync(req, localCt);

            _active = new ActiveQuestion(target, payload, wildcardFetch);
            QuestionFetched?.Invoke(target, _active);
            return _active;
        }

        public async Task ResolveAnswer(int chosenIndex, float elapsedSeconds, CancellationToken ct = default)
        {
            if (_active == null)
                throw new InvalidOperationException("No active question to resolve.");

            var active = _active;
            bool correct = chosenIndex == active.Payload.CorrectIndex;

            // Server-first (B3-Q1): record the resolution before mutating engine state.
            await _client.ResolveAsync(active.Payload.Id, correct, ct);
            _engine.AttemptPuzzle(active.Target, correct, elapsedSeconds);

            _active = null;
            _inFlight = null;

            if (correct && active.IsWildcard)
                WildcardCorrect?.Invoke(active.Target);
            AnswerResolved?.Invoke(active.Target, correct);
        }

        internal static QuestionCategory MapCategory(CellCategory c)
        {
            switch (c)
            {
                case CellCategory.Red: return QuestionCategory.RED;
                case CellCategory.Blue: return QuestionCategory.BLUE;
                case CellCategory.Green: return QuestionCategory.GREEN;
                case CellCategory.Yellow: return QuestionCategory.YELLOW;
                case CellCategory.Purple: return QuestionCategory.PURPLE;
                case CellCategory.Orange: return QuestionCategory.ORANGE;
                default:
                    throw new ArgumentException(
                        $"Cell category {c} has no question bucket (Black trap tiles never reach QuestionFlow; White is handled as wildcard at the call site).",
                        nameof(c));
            }
        }
    }
}
