using TMPro;
using UnityEngine;
using Catr.GridEngine;
using Catr.GridRenderer;

namespace Catr.GameBootstrap
{
    /// <summary>
    /// World-space legend mapping cell color → category name.
    /// Shown during Warmup, hidden once Running begins. Built programmatically;
    /// drop this MonoBehaviour on an empty GameObject placed to the left of column 0.
    /// </summary>
    public class ColorLegendController : MonoBehaviour
    {
        [SerializeField] private GridRendererBehaviour gridRenderer;
        [SerializeField] private float swatchSize = 0.6f;
        [SerializeField] private float rowSpacing = 0.85f;
        [SerializeField] private float labelOffsetX = 0.55f;
        [SerializeField] private float labelFontSize = 2.0f;

        private static readonly (CellCategory cat, string es, string en)[] Rows = new[]
        {
            (CellCategory.Red,    "Rojo — Pop",       "Red — Pop"),
            (CellCategory.Blue,   "Azul — Mate",      "Blue — Math"),
            (CellCategory.Green,  "Verde — Historia", "Green — History"),
            (CellCategory.Yellow, "Amarillo — Dep.",  "Yellow — Sports"),
            (CellCategory.Purple, "Morado — Ciencia", "Purple — Sci-Tech"),
            (CellCategory.Orange, "Naranja — Geo.",   "Orange — Geo"),
            (CellCategory.White,  "Blanco — Comodín", "White — Wildcard"),
            (CellCategory.Black,  "Negro — Trampa",   "Black — Trap"),
        };

        private Sprite squareSprite;
        private GridWorld engine;

        private void Start()
        {
            if (gridRenderer == null || gridRenderer.Engine == null)
            {
                Debug.LogError("[ColorLegend] GridRenderer.Engine is null.");
                enabled = false;
                return;
            }
            engine = gridRenderer.Engine;
            squareSprite = MakeSquareSprite();
            bool es = Application.systemLanguage == SystemLanguage.Spanish;
            BuildRows(es);
        }

        private void Update()
        {
            if (engine == null) return;
            if (engine.Phase != GamePhase.Warmup)
            {
                gameObject.SetActive(false);
                enabled = false;
            }
        }

        private void BuildRows(bool es)
        {
            for (int i = 0; i < Rows.Length; i++)
            {
                var row = Rows[i];
                float y = -i * rowSpacing;

                var swatch = new GameObject($"Swatch {row.cat}");
                swatch.transform.parent = transform;
                swatch.transform.localPosition = new Vector3(0f, y, 0f);
                swatch.transform.localScale = new Vector3(swatchSize, swatchSize, 1f);
                var sr = swatch.AddComponent<SpriteRenderer>();
                sr.sprite = squareSprite;
                sr.color = CategoryPalette.For(row.cat);
                sr.sortingOrder = 5;

                var labelGO = new GameObject($"Label {row.cat}");
                labelGO.transform.parent = transform;
                labelGO.transform.localPosition = new Vector3(labelOffsetX, y, 0f);
                var tmp = labelGO.AddComponent<TextMeshPro>();
                tmp.text = es ? row.es : row.en;
                tmp.fontSize = labelFontSize;
                tmp.alignment = TextAlignmentOptions.MidlineLeft;
                tmp.color = Color.white;
                tmp.sortingOrder = 6;
                var rt = tmp.rectTransform;
                rt.pivot = new Vector2(0f, 0.5f);
                rt.sizeDelta = new Vector2(6f, swatchSize);
            }
        }

        private static Sprite MakeSquareSprite()
        {
            var tex = new Texture2D(1, 1);
            tex.SetPixel(0, 0, Color.white);
            tex.filterMode = FilterMode.Point;
            tex.Apply();
            return Sprite.Create(tex, new Rect(0, 0, 1, 1), new Vector2(0.5f, 0.5f), 1f);
        }
    }
}
