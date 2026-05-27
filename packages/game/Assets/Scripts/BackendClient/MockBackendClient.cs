using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

namespace Catr.BackendClient
{
    /// <summary>
    /// In-memory IBackendClient for unit tests and offline development.
    /// Holds a pool of QuestionPayloads; FetchNextAsync filters deterministically
    /// (first match wins). ResolveAsync records the call for later assertion.
    /// </summary>
    public sealed class MockBackendClient : IBackendClient
    {
        private readonly List<QuestionPayload> _pool;
        private readonly HashSet<string> _served = new HashSet<string>();
        public readonly List<QuestionRequest> RecordedRequests = new List<QuestionRequest>();
        public readonly List<ResolveRecord> RecordedResolves = new List<ResolveRecord>();

        public MockBackendClient(IEnumerable<QuestionPayload> pool)
        {
            _pool = new List<QuestionPayload>(pool);
        }

        public Task<QuestionPayload> FetchNextAsync(QuestionRequest request, CancellationToken ct = default)
        {
            ct.ThrowIfCancellationRequested();
            RecordedRequests.Add(request);

            IEnumerable<QuestionPayload> candidates;
            if (request.Wildcard)
            {
                candidates = _pool.Where(q => q.Tier == 5);
            }
            else
            {
                candidates = _pool.Where(q =>
                    q.Category == request.Category &&
                    q.Tier == request.Tier &&
                    (request.Kind == QuestionKindFilter.ANY ||
                     (request.Kind == QuestionKindFilter.MC && q.Kind == QuestionKind.MC) ||
                     (request.Kind == QuestionKindFilter.TF && q.Kind == QuestionKind.TF)));
            }

            var unseen = candidates.FirstOrDefault(q => !_served.Contains(q.Id));
            if (unseen != null)
            {
                _served.Add(unseen.Id);
                return Task.FromResult(unseen);
            }

            var oldest = candidates.FirstOrDefault();
            if (oldest != null)
            {
                return Task.FromResult(oldest);
            }

            throw new BackendException(404, "No questions match the request.");
        }

        public Task ResolveAsync(string questionId, bool wasCorrect, CancellationToken ct = default)
        {
            ct.ThrowIfCancellationRequested();
            RecordedResolves.Add(new ResolveRecord(questionId, wasCorrect));
            return Task.CompletedTask;
        }

        public readonly struct ResolveRecord
        {
            public readonly string QuestionId;
            public readonly bool WasCorrect;

            public ResolveRecord(string questionId, bool wasCorrect)
            {
                QuestionId = questionId;
                WasCorrect = wasCorrect;
            }
        }
    }
}
