namespace Catr.GridEngine
{
    public readonly struct TileMetadata
    {
        public readonly CellCategory Category;
        public readonly int Tier;
        public readonly QuestionKind Kind;
        public readonly bool HintVisible;
        public readonly bool IsWildcard;
        public readonly bool Consumed;

        public TileMetadata(CellCategory category, int tier, QuestionKind kind, bool hintVisible, bool isWildcard, bool consumed)
        {
            Category = category;
            Tier = tier;
            Kind = kind;
            HintVisible = hintVisible;
            IsWildcard = isWildcard;
            Consumed = consumed;
        }

        public TileMetadata WithConsumed(bool consumed) =>
            new TileMetadata(Category, Tier, Kind, HintVisible, IsWildcard, consumed);
    }
}
