using System.Collections.Generic;
using TMPro;
using UnityEngine;
using Catr.GridEngine;

namespace Catr.GridRenderer
{
    public class GridRendererBehaviour : MonoBehaviour
    {
        [Header("World")]
        [SerializeField] private int rowCount = 9;
        [SerializeField] private int seed = 42;
        [SerializeField] private float cellSize = 1f;

        [Header("View Window")]
        [SerializeField] private int viewColumnsAhead = 6;
        [SerializeField] private int viewColumnsBehind = 2;

        [Header("Camera")]
        [SerializeField] private Camera mainCamera;
        [SerializeField] private float cameraLookAhead = 2f;
        [SerializeField] private float cameraLerpSpeed = 6f;

        [Header("Totem")]
        [SerializeField] private Color totemColor = new Color(0.2f, 0.9f, 1f);
        [SerializeField] private float totemLerpSpeed = 12f;

        [Header("Palette overrides")]
        [SerializeField] private Color warmupBlackColor = Color.black;
        [SerializeField] private Color unrevealedColor = new Color(0.12f, 0.12f, 0.12f);
        [SerializeField] private Color consumedColor = Color.black;
        [SerializeField, Range(0f, 1f)] private float spentDim = 0.45f;

        public GridWorld Engine { get; private set; }

        private readonly Dictionary<GridCoord, SpriteRenderer> cells = new Dictionary<GridCoord, SpriteRenderer>();
        private readonly Dictionary<GridCoord, TextMeshPro> badges = new Dictionary<GridCoord, TextMeshPro>();
        private GameObject totem;
        private Vector3 totemTarget;
        private Sprite squareSprite;
        private Sprite circleSprite;

        private void Awake()
        {
            if (mainCamera == null) mainCamera = Camera.main;

            squareSprite = MakeSquareSprite();
            circleSprite = MakeCircleSprite(64);

            Engine = new GridWorld(rowCount, seed);
            Engine.PlayerMoved += OnPlayerMoved;
            Engine.CellRevealed += RefreshCell;
            Engine.ColumnConsumed += RefreshColumn;
            Engine.TileConsumed += RefreshCell;

            SpawnTotem();
            RebuildWindow();
            SnapCameraToPlayer();
        }

        private void LateUpdate()
        {
            if (Engine == null) return;

            if (totem != null)
                totem.transform.position = Vector3.Lerp(totem.transform.position, totemTarget, Time.deltaTime * totemLerpSpeed);

            if (mainCamera != null)
            {
                float targetX = Engine.PlayerPosition.X * cellSize + cameraLookAhead;
                var p = mainCamera.transform.position;
                p.x = Mathf.Lerp(p.x, targetX, Time.deltaTime * cameraLerpSpeed);
                mainCamera.transform.position = p;
            }
        }

        private void OnPlayerMoved(GridCoord pos)
        {
            totemTarget = CellWorldPos(pos);
            RebuildWindow();
        }

        private void RefreshColumn(int x)
        {
            for (int y = 0; y < rowCount; y++)
                RefreshCell(new GridCoord(x, y));
        }

        private void SnapCameraToPlayer()
        {
            if (mainCamera == null) return;
            var p = mainCamera.transform.position;
            p.x = Engine.PlayerPosition.X * cellSize + cameraLookAhead;
            p.y = (rowCount - 1) * 0.5f * cellSize;
            if (p.z >= 0) p.z = -10f;
            mainCamera.transform.position = p;
        }

        private void SpawnTotem()
        {
            totem = new GameObject("Totem");
            totem.transform.parent = transform;
            var sr = totem.AddComponent<SpriteRenderer>();
            sr.sprite = circleSprite;
            sr.color = totemColor;
            sr.sortingOrder = 10;
            totem.transform.localScale = new Vector3(cellSize * 0.55f, cellSize * 0.55f, 1f);
            totemTarget = CellWorldPos(Engine.PlayerPosition);
            totem.transform.position = totemTarget;
        }

        private void RebuildWindow()
        {
            int minX = Mathf.Max(0, Engine.PlayerPosition.X - viewColumnsBehind);
            int maxX = Engine.PlayerPosition.X + viewColumnsAhead;

            var toRemove = new List<GridCoord>();
            foreach (var kv in cells)
                if (kv.Key.X < minX || kv.Key.X > maxX) toRemove.Add(kv.Key);
            foreach (var c in toRemove)
            {
                if (cells[c] != null) Destroy(cells[c].gameObject);
                cells.Remove(c);
                badges.Remove(c);
            }

            for (int x = minX; x <= maxX; x++)
                for (int y = 0; y < rowCount; y++)
                {
                    var c = new GridCoord(x, y);
                    if (!cells.ContainsKey(c)) SpawnCell(c);
                    RefreshCell(c);
                }
        }

        private void SpawnCell(GridCoord c)
        {
            var go = new GameObject($"Cell {c}");
            go.transform.parent = transform;
            go.transform.position = CellWorldPos(c);
            go.transform.localScale = new Vector3(cellSize * 0.95f, cellSize * 0.95f, 1f);
            var sr = go.AddComponent<SpriteRenderer>();
            sr.sprite = squareSprite;
            sr.sortingOrder = 0;
            cells[c] = sr;

            var badgeGo = new GameObject($"Badge {c}");
            badgeGo.transform.parent = transform;
            badgeGo.transform.position = CellWorldPos(c);
            var tmp = badgeGo.AddComponent<TextMeshPro>();
            tmp.fontSize = 3f;
            tmp.alignment = TextAlignmentOptions.Center;
            tmp.color = Color.white;
            tmp.sortingOrder = 5;
            tmp.text = string.Empty;
            tmp.rectTransform.sizeDelta = new Vector2(cellSize, cellSize);
            badges[c] = tmp;
        }

        private void RefreshCell(GridCoord c)
        {
            if (!cells.TryGetValue(c, out var sr) || sr == null) return;
            sr.color = ColorFor(Engine.GetCellView(c));
            RefreshBadge(c);
        }

        private void RefreshBadge(GridCoord c)
        {
            if (!badges.TryGetValue(c, out var tmp) || tmp == null) return;
            if (Engine.TryGetTileMetadata(c, out var md) && md.HintVisible && !md.Consumed)
                tmp.text = $"T{md.Tier}";
            else
                tmp.text = string.Empty;
        }

        private Color ColorFor(CellView v)
        {
            switch (v.State)
            {
                case VisualState.WarmupBlack: return warmupBlackColor;
                case VisualState.Unrevealed:  return unrevealedColor;
                case VisualState.Consumed:    return consumedColor;
                case VisualState.Revealed:
                case VisualState.Entered:
                    return v.Category.HasValue ? CategoryPalette.For(v.Category.Value) : unrevealedColor;
                case VisualState.Spent:
                    if (!v.Category.HasValue) return unrevealedColor;
                    var col = CategoryPalette.For(v.Category.Value);
                    return new Color(col.r * spentDim, col.g * spentDim, col.b * spentDim, 1f);
                default: return unrevealedColor;
            }
        }

        private Vector3 CellWorldPos(GridCoord c) => GridToWorld(c);

        public Vector3 GridToWorld(GridCoord c) => new Vector3(c.X * cellSize, (rowCount - 1 - c.Y) * cellSize, 0f);

        public float CellSize => cellSize;

        public int RowCount => rowCount;

        public GridCoord ScreenToGridCoord(Vector2 screenPos)
        {
            var cam = mainCamera != null ? mainCamera : Camera.main;
            Vector3 world = cam.ScreenToWorldPoint(new Vector3(screenPos.x, screenPos.y, -cam.transform.position.z));
            int x = Mathf.RoundToInt(world.x / cellSize);
            int y = (rowCount - 1) - Mathf.RoundToInt(world.y / cellSize);
            return new GridCoord(x, y);
        }

        private static Sprite MakeSquareSprite()
        {
            var tex = new Texture2D(1, 1);
            tex.SetPixel(0, 0, Color.white);
            tex.filterMode = FilterMode.Point;
            tex.Apply();
            return Sprite.Create(tex, new Rect(0, 0, 1, 1), new Vector2(0.5f, 0.5f), 1f);
        }

        private static Sprite MakeCircleSprite(int size)
        {
            var tex = new Texture2D(size, size);
            float r = size * 0.5f;
            var transparent = new Color(0, 0, 0, 0);
            for (int y = 0; y < size; y++)
                for (int x = 0; x < size; x++)
                {
                    float dx = x + 0.5f - r;
                    float dy = y + 0.5f - r;
                    tex.SetPixel(x, y, dx * dx + dy * dy <= r * r ? Color.white : transparent);
                }
            tex.Apply();
            return Sprite.Create(tex, new Rect(0, 0, size, size), new Vector2(0.5f, 0.5f), size);
        }
    }
}
