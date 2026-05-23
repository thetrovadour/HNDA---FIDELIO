namespace Catr.GridEngine
{
    public readonly struct CellView
    {
        public readonly VisualState State;
        public readonly CellCategory? Category;

        public CellView(VisualState state, CellCategory? category)
        {
            State = state;
            Category = category;
        }
    }
}
