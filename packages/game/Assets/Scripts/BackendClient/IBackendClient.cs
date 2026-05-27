using System.Threading;
using System.Threading.Tasks;

namespace Catr.BackendClient
{
    public interface IBackendClient
    {
        Task<QuestionPayload> FetchNextAsync(QuestionRequest request, CancellationToken ct = default);
        Task ResolveAsync(string questionId, bool wasCorrect, CancellationToken ct = default);
    }
}
