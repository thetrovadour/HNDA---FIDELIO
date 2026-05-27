namespace Catr.BackendClient
{
    public sealed class QuestionPayload
    {
        public readonly string Id;
        public readonly string Prompt;
        public readonly string[] Answers;
        public readonly int CorrectIndex;
        public readonly QuestionKind Kind;
        public readonly QuestionCategory Category;
        public readonly int Tier;
        public readonly bool IsWildcard;

        public QuestionPayload(
            string id,
            string prompt,
            string[] answers,
            int correctIndex,
            QuestionKind kind,
            QuestionCategory category,
            int tier,
            bool isWildcard)
        {
            Id = id;
            Prompt = prompt;
            Answers = answers;
            CorrectIndex = correctIndex;
            Kind = kind;
            Category = category;
            Tier = tier;
            IsWildcard = isWildcard;
        }
    }
}
