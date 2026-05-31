using Catr.BackendClient;

namespace Catr.GameBootstrap
{
    public sealed class StaticJwtPlayerSession : IPlayerSession
    {
        private readonly string _token;
        public StaticJwtPlayerSession(string token)
        {
            _token = token == null ? string.Empty : System.Text.RegularExpressions.Regex.Replace(token, @"\s+", "");
        }
        public string GetAccessToken() => _token;
    }
}
