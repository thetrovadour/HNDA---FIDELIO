using UnityEngine;
using Catr.GridEngine;

namespace Catr.GridRenderer
{
    public static class CategoryPalette
    {
        public static Color For(CellCategory cat)
        {
            switch (cat)
            {
                case CellCategory.Red:    return new Color(0.902f, 0.224f, 0.275f);
                case CellCategory.Blue:   return new Color(0.114f, 0.490f, 1.000f);
                case CellCategory.Green:  return new Color(0.180f, 0.760f, 0.494f);
                case CellCategory.Yellow: return new Color(0.945f, 0.769f, 0.059f);
                case CellCategory.Purple: return new Color(0.557f, 0.267f, 0.925f);
                case CellCategory.Orange: return new Color(1.000f, 0.549f, 0.259f);
                case CellCategory.White:  return new Color(0.949f, 0.949f, 0.949f);
                case CellCategory.Black:  return new Color(0.106f, 0.106f, 0.106f);
                default:                  return Color.magenta;
            }
        }
    }
}
