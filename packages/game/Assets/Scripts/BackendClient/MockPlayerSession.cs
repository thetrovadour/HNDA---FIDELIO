namespace Catr.BackendClient
{
    public sealed class MockPlayerSession : IPlayerSession
    {
        private readonly string _token;

        public MockPlayerSession(string token = "mock-token")
        {
            _token = token;
        }

        public string GetAccessToken() => _token;
    }
}
