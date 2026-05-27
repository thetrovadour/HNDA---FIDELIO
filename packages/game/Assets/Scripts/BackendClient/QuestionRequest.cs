namespace Catr.BackendClient
{
    public sealed class QuestionRequest
    {
        public readonly QuestionCategory Category;
        public readonly int Tier;
        public readonly QuestionKindFilter Kind;
        public readonly string Lang;
        public readonly bool Wildcard;

        public QuestionRequest(
            QuestionCategory category,
            int tier,
            QuestionKindFilter kind,
            string lang,
            bool wildcard)
        {
            Category = category;
            Tier = tier;
            Kind = kind;
            Lang = lang;
            Wildcard = wildcard;
        }
    }
}
