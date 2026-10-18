import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createApp } from "../src/app.js";
import { createGemini } from "../src/gemini.js";
import { makeReport } from "../../client/src/report.js";
const context = {
  role: "Software Engineer",
  experience: "Fresher",
  language: "English",
  resume: "Skills: React. Project: Chat App.",
};
const feedback = {
  strengths: ["Uses a concrete example."],
  improvements: ["Explain the result."],
  betterAnswerTip: "Describe your action and its outcome.",
  rubric: { relevance: 3, depth: 2, clarity: 1, structure: 1 },
};
const summary = {
  verdict: "Keep practicing.",
  topStrength: "Examples",
  mainImprovement: "Outcomes",
};
async function fixture(t, ai, options = {}) {
  const app = createApp({ ai, limit: false, ...options });
  t.after(() => app.locals.dispose());
  const server = app.listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  t.after(() => new Promise((resolve) => server.close(resolve)));
  const base = `http://127.0.0.1:${server.address().port}/api`;
  return async (path, body, method) => {
    const res = await fetch(base + path, {
      method: method || (body ? "POST" : "GET"),
      headers: { "Content-Type": "application/json" },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    return {
      status: res.status,
      data: res.status === 204 ? null : await res.json(),
    };
  };
}
function fake() {
  let calls = 0;
  return {
    get calls() {
      return calls;
    },
    async first() {
      return { question: "Tell me about a software project you built." };
    },
    async evaluate(session) {
      calls++;
      return {
        feedback,
        ...(session.records.length === 4
          ? { summary }
          : {
              nextQuestion: `How did you handle project challenge number ${session.records.length + 2}?`,
            }),
      };
    },
  };
}
test("five questions, backend score total, duplicate retry, completion and deletion", async (t) => {
  const ai = fake();
  const req = await fixture(t, ai);
  let { status, data: s } = await req("/interviews", context);
  assert.equal(status, 201);
  assert.equal(s.version, 0);
  assert.equal(s.total, 0);
  const id = s.id;
  let firstBody;
  for (let i = 0; i < 5; i++) {
    const body = {
      version: i,
      requestId: randomUUID(),
      answer: "I built React chat with Socket.IO and tested message delivery.",
    };
    if (!i) firstBody = body;
    const r = await req(`/interviews/${id}/answers`, body);
    assert.equal(r.status, 200);
    s = r.data;
    assert.equal(s.total, (i + 1) * 7);
    assert.equal(s.records.length, i + 1);
    if (!i) {
      const duplicate = await req(`/interviews/${id}/answers`, firstBody);
      assert.equal(duplicate.data.version, 1);
      assert.equal(ai.calls, 1);
      const stale = await req(`/interviews/${id}/answers`, {
        ...body,
        requestId: randomUUID(),
      });
      assert.equal(stale.status, 409);
    }
  }
  assert.equal(s.total, 35);
  assert.equal(s.complete, true);
  assert.equal(s.currentQuestion, null);
  assert.deepEqual(s.summary, summary);
  assert.equal(ai.calls, 5);
  assert.equal(
    (
      await req(`/interviews/${id}/answers`, {
        version: 4,
        requestId: randomUUID(),
        answer: "extra",
      })
    ).status,
    409,
  );
  assert.equal((await req(`/interviews/${id}`, null, "DELETE")).status, 204);
  assert.equal((await req(`/interviews/${id}`)).status, 404);
});
test("AI failure leaves session unchanged; retry can succeed", async (t) => {
  let fail = true;
  const ai = fake();
  const req = await fixture(t, {
    first: ai.first,
    evaluate: async (s) => {
      if (fail) {
        const e = new Error("Temporary failure");
        e.status = 502;
        throw e;
      }
      return ai.evaluate(s);
    },
  });
  const { data: s } = await req("/interviews", context);
  const body = { version: 0, requestId: randomUUID(), answer: "My answer" };
  assert.equal((await req(`/interviews/${s.id}/answers`, body)).status, 502);
  assert.equal((await req(`/interviews/${s.id}`)).data.version, 0);
  fail = false;
  assert.equal(
    (await req(`/interviews/${s.id}/answers`, body)).data.version,
    1,
  );
});
test("concurrent submissions cannot double score the same question", async (t) => {
  let release, started;
  const wait = new Promise((r) => (release = r)),
    entered = new Promise((r) => (started = r));
  const ai = fake();
  const req = await fixture(t, {
    first: ai.first,
    evaluate: async (s) => {
      started();
      await wait;
      return ai.evaluate(s);
    },
  });
  const { data: s } = await req("/interviews", context);
  const first = req(`/interviews/${s.id}/answers`, {
    version: 0,
    requestId: randomUUID(),
    answer: "First",
  });
  await entered;
  const second = await req(`/interviews/${s.id}/answers`, {
    version: 0,
    requestId: randomUUID(),
    answer: "Second",
  });
  assert.equal(second.status, 409);
  release();
  assert.equal((await first).data.version, 1);
});
test("invalid input, expired sessions, blocked origins and missing key", async (t) => {
  const req = await fixture(t, fake(), { ttlMs: 1 });
  assert.equal(
    (await req("/interviews", { ...context, role: "Unknown" })).status,
    400,
  );
  assert.equal(
    (await req("/interviews", { ...context, resume: "a".repeat(20001) }))
      .status,
    400,
  );
  const { data: s } = await req("/interviews", context);
  await new Promise((r) => setTimeout(r, 5));
  assert.equal((await req(`/interviews/${s.id}`)).status, 404);
  const noKey = await fixture(t, createGemini({ apiKey: "" }));
  assert.equal((await noKey("/interviews", context)).status, 503);
});
test("Gemini transport sends server-side key and handles malformed/quota responses", async () => {
  let captured;
  const ai = createGemini({
    apiKey: "fake-test-key",
    fetchImpl: async (url, options) => {
      captured = { url, options };
      return new Response(
        JSON.stringify({
          candidates: [
            {
              finishReason: "STOP",
              content: {
                parts: [
                  {
                    text: JSON.stringify({
                      question: "What did you learn from your last project?",
                    }),
                  },
                ],
              },
            },
          ],
        }),
        { status: 200 },
      );
    },
  });
  await ai.first(context);
  assert.equal(captured.options.headers["x-goog-api-key"], "fake-test-key");
  assert.ok(!captured.url.includes("fake-test-key"));
  assert.ok(
    JSON.parse(captured.options.body).generationConfig.responseFormat.text
      .schema,
  );
  const bad = createGemini({
    apiKey: "test",
    fetchImpl: async () =>
      new Response(
        JSON.stringify({
          candidates: [{ content: { parts: [{ text: "not json" }] } }],
        }),
      ),
  });
  await assert.rejects(
    () => bad.first(context),
    (e) => e.status === 502,
  );
  const quota = createGemini({
    apiKey: "test",
    fetchImpl: async () => new Response("{}", { status: 429 }),
  });
  await assert.rejects(
    () => quota.first(context),
    (e) => e.status === 429,
  );
});
test("download report escapes user and AI HTML", () => {
  const html = makeReport({
    ...context,
    startedAt: new Date().toISOString(),
    total: 7,
    summary,
    records: [
      {
        question: "<script>alert(1)</script>",
        answer: "<img src=x onerror=alert(1)>",
        feedback,
      },
    ],
  });
  assert.ok(!html.includes("<script>"));
  assert.ok(!html.includes("<img src=x"));
  assert.ok(html.includes("&lt;script&gt;"));
  assert.ok(html.includes("7 / 50"));
});
