using System;
using System.Collections.Generic;
using TMPro;
using UnityEngine;
using UnityEngine.UI;
using Catr.BackendClient;
using Catr.QuestionEngine;

namespace Catr.QuestionUI
{
    /// <summary>
    /// In-grid question card prefab controller. One reused instance per scene;
    /// QuestionFlow guarantees a single active question (cancel-on-new).
    /// </summary>
    public class QuestionCardBehaviour : MonoBehaviour
    {
        [SerializeField] private TMP_Text promptText;
        [SerializeField] private Transform answersContainer;
        [SerializeField] private Button answerButtonPrefab;

        private readonly List<Button> _spawned = new List<Button>();

        public event Action<int> AnswerClicked;

        void Awake()
        {
            gameObject.SetActive(false);
        }

        public void Show(ActiveQuestion q, Vector3 worldPos)
        {
            transform.position = worldPos;
            promptText.text = q.Payload.Prompt;

            ClearButtons();
            for (int i = 0; i < q.Payload.Answers.Length; i++)
            {
                int idx = i;
                var btn = Instantiate(answerButtonPrefab, answersContainer);
                var label = btn.GetComponentInChildren<TMP_Text>();
                if (label != null) label.text = q.Payload.Answers[i];
                btn.onClick.AddListener(() => OnPicked(idx));
                _spawned.Add(btn);
            }

            gameObject.SetActive(true);
        }

        public void Hide()
        {
            ClearButtons();
            gameObject.SetActive(false);
        }

        private void OnPicked(int idx)
        {
            foreach (var b in _spawned) b.interactable = false;
            AnswerClicked?.Invoke(idx);
        }

        private void ClearButtons()
        {
            foreach (var b in _spawned)
                if (b != null) Destroy(b.gameObject);
            _spawned.Clear();
        }
    }
}
