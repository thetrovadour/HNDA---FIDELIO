using System.Collections.Generic;
using System.Threading.Tasks;
using NUnit.Framework;

namespace Catr.BackendClient.Tests
{
    [TestFixture]
    public class MockBackendClientTests
    {
        private static QuestionPayload Q(string id, QuestionCategory cat, int tier, QuestionKind kind = QuestionKind.MC, bool wildcard = false)
        {
            return new QuestionPayload(
                id, "p", new[] { "a", "b", "c", "d" }, 0, kind, cat, tier, wildcard);
        }

        [Test]
        public async Task FetchNext_ReturnsQuestionMatchingFilter()
        {
            var pool = new List<QuestionPayload>
            {
                Q("q1", QuestionCategory.RED, 3),
                Q("q2", QuestionCategory.BLUE, 3),
                Q("q3", QuestionCategory.RED, 4)
            };
            var client = new MockBackendClient(pool);
            var req = new QuestionRequest(QuestionCategory.RED, 3, QuestionKindFilter.ANY, "es", false);

            var result = await client.FetchNextAsync(req);

            Assert.AreEqual("q1", result.Id);
        }

        [Test]
        public async Task FetchNext_FiltersByKind()
        {
            var pool = new List<QuestionPayload>
            {
                Q("mc1", QuestionCategory.RED, 3, QuestionKind.MC),
                Q("tf1", QuestionCategory.RED, 3, QuestionKind.TF)
            };
            var client = new MockBackendClient(pool);
            var req = new QuestionRequest(QuestionCategory.RED, 3, QuestionKindFilter.TF, "es", false);

            var result = await client.FetchNextAsync(req);

            Assert.AreEqual("tf1", result.Id);
            Assert.AreEqual(QuestionKind.TF, result.Kind);
        }

        [Test]
        public void FetchNext_ThrowsWhenBucketTrulyEmpty()
        {
            var pool = new List<QuestionPayload> { Q("q1", QuestionCategory.RED, 3) };
            var client = new MockBackendClient(pool);
            var req = new QuestionRequest(QuestionCategory.GREEN, 5, QuestionKindFilter.ANY, "es", false);

            Assert.ThrowsAsync<BackendException>(async () =>
                await client.FetchNextAsync(req));
        }

        [Test]
        public async Task FetchNext_ControlledRepeatWhenAllServed()
        {
            var pool = new List<QuestionPayload>
            {
                Q("q1", QuestionCategory.RED, 3),
                Q("q2", QuestionCategory.RED, 3)
            };
            var client = new MockBackendClient(pool);
            var req = new QuestionRequest(QuestionCategory.RED, 3, QuestionKindFilter.ANY, "es", false);

            await client.FetchNextAsync(req);
            await client.FetchNextAsync(req);
            var third = await client.FetchNextAsync(req);

            Assert.IsNotNull(third);
            Assert.That(third.Id, Is.EqualTo("q1").Or.EqualTo("q2"));
        }

        [Test]
        public async Task FetchNext_WildcardForcesTier5()
        {
            var pool = new List<QuestionPayload>
            {
                Q("low", QuestionCategory.RED, 3),
                Q("high1", QuestionCategory.BLUE, 5),
                Q("high2", QuestionCategory.GREEN, 5)
            };
            var client = new MockBackendClient(pool);
            var req = new QuestionRequest(QuestionCategory.RED, 1, QuestionKindFilter.ANY, "es", true);

            var result = await client.FetchNextAsync(req);

            Assert.AreEqual(5, result.Tier);
            Assert.That(result.Id, Is.EqualTo("high1").Or.EqualTo("high2"));
        }

        [Test]
        public async Task Resolve_RecordsCall()
        {
            var client = new MockBackendClient(new List<QuestionPayload>());

            await client.ResolveAsync("q1", true);
            await client.ResolveAsync("q2", false);

            Assert.AreEqual(2, client.RecordedResolves.Count);
            Assert.AreEqual("q1", client.RecordedResolves[0].QuestionId);
            Assert.IsTrue(client.RecordedResolves[0].WasCorrect);
            Assert.AreEqual("q2", client.RecordedResolves[1].QuestionId);
            Assert.IsFalse(client.RecordedResolves[1].WasCorrect);
        }
    }
}
