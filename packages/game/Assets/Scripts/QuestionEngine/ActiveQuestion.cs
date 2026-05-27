using Catr.BackendClient;
using Catr.GridEngine;

namespace Catr.QuestionEngine
{
    public sealed class ActiveQuestion
    {
        public readonly GridCoord Target;
        public readonly QuestionPayload Payload;
        public readonly bool IsWildcard;

        public ActiveQuestion(GridCoord target, QuestionPayload payload, bool isWildcard)
        {
            Target = target;
            Payload = payload;
            IsWildcard = isWildcard;
        }
    }
}
