using System;
using System.Threading;
using System.Threading.Tasks;
using UnityEngine;
using UnityEngine.Networking;

namespace Catr.BackendClient
{
    /// <summary>
    /// IBackendClient backed by UnityWebRequest. Talks to the FIDELIO Express
    /// endpoints /api/game/questions/next and /api/game/questions/resolve.
    /// Attaches the JWT from IPlayerSession on every call.
    /// </summary>
    public sealed class HttpBackendClient : IBackendClient
    {
        private readonly string _baseUrl;
        private readonly IPlayerSession _session;

        public HttpBackendClient(string baseUrl, IPlayerSession session)
        {
            _baseUrl = baseUrl.TrimEnd('/');
            _session = session;
        }

        public async Task<QuestionPayload> FetchNextAsync(QuestionRequest request, CancellationToken ct = default)
        {
            var body = JsonUtility.ToJson(new NextRequestDto
            {
                category = request.Category.ToString(),
                tier = request.Tier,
                kind = request.Kind.ToString(),
                lang = request.Lang,
                wildcard = request.Wildcard
            });

            var json = await PostAsync(_baseUrl + "/api/game/questions/next", body, ct);
            var envelope = JsonUtility.FromJson<NextResponseEnvelope>(json);
            var d = envelope.data;
            return new QuestionPayload(
                d.id,
                d.prompt,
                d.answers,
                d.correctIndex,
                (QuestionKind)Enum.Parse(typeof(QuestionKind), d.kind),
                (QuestionCategory)Enum.Parse(typeof(QuestionCategory), d.category),
                d.tier,
                d.isWildcard);
        }

        public async Task ResolveAsync(string questionId, bool wasCorrect, CancellationToken ct = default)
        {
            var body = JsonUtility.ToJson(new ResolveRequestDto
            {
                questionId = questionId,
                wasCorrect = wasCorrect
            });
            await PostAsync(_baseUrl + "/api/game/questions/resolve", body, ct);
        }

        private async Task<string> PostAsync(string url, string jsonBody, CancellationToken ct)
        {
            using (var req = new UnityWebRequest(url, "POST"))
            {
                var raw = System.Text.Encoding.UTF8.GetBytes(jsonBody);
                req.uploadHandler = new UploadHandlerRaw(raw);
                req.downloadHandler = new DownloadHandlerBuffer();
                req.SetRequestHeader("Content-Type", "application/json");
                req.SetRequestHeader("Authorization", "Bearer " + _session.GetAccessToken());

                var op = req.SendWebRequest();
                while (!op.isDone)
                {
                    if (ct.IsCancellationRequested)
                    {
                        req.Abort();
                        ct.ThrowIfCancellationRequested();
                    }
                    await Task.Yield();
                }

                if (req.result != UnityWebRequest.Result.Success)
                {
                    throw new BackendException((int)req.responseCode, req.error ?? "Request failed");
                }
                return req.downloadHandler.text;
            }
        }

        [Serializable]
        private class NextRequestDto
        {
            public string category;
            public int tier;
            public string kind;
            public string lang;
            public bool wildcard;
        }

        [Serializable]
        private class ResolveRequestDto
        {
            public string questionId;
            public bool wasCorrect;
        }

        [Serializable]
        private class NextResponseEnvelope
        {
            public NextResponseDto data;
        }

        [Serializable]
        private class NextResponseDto
        {
            public string id;
            public string prompt;
            public string[] answers;
            public int correctIndex;
            public string kind;
            public string category;
            public int tier;
            public bool isWildcard;
        }
    }
}
