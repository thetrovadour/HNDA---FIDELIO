using System;

namespace Catr.BackendClient
{
    public sealed class BackendException : Exception
    {
        public readonly int StatusCode;

        public BackendException(int statusCode, string message) : base(message)
        {
            StatusCode = statusCode;
        }
    }
}
