import test from "node:test";
import assert from "node:assert/strict";
import { createGemini } from "../src/gemini.js";

const context = {
  role: "Software Engineer",
  experience: "Fresher",
  language: "English",
  resume: "",
};
const success = () =>
  new Response(
    JSON.stringify({
      candidates: [
        {
          finishReason: "STOP",
          content: {
            parts: [
              {
                text: JSON.stringify({
                  question: "Explain one project you built.",
                }),
              },
            ],
          },
        },
      ],
    }),
  );

test("retries only an explicitly unsupported responseFormat field", async () => {
  const calls = [];
  const ai = createGemini({
    apiKey: "fake-private-key",
    fetchImpl: async (_url, options) => {
      calls.push(JSON.parse(options.body));
      if (calls.length === 1)
        return new Response(
          JSON.stringify({
            error: {
              message:
                'Invalid JSON payload. Unknown name "responseFormat" at generation_config.',
            },
          }),
          { status: 400 },
        );
      return success();
    },
  });
  assert.equal(
    (await ai.first(context)).question,
    "Explain one project you built.",
  );
  assert.equal(calls.length, 2);
  assert.ok(calls[0].generationConfig.responseFormat);
  assert.equal(calls[1].generationConfig.responseFormat, undefined);
  assert.equal(calls[1].generationConfig.responseMimeType, "application/json");
  assert.ok(calls[1].generationConfig.responseJsonSchema);
});

test("model errors preserve Google's reason, redact the key, and do not retry", async () => {
  let calls = 0;
  const ai = createGemini({
    apiKey: "fake-private-key",
    fetchImpl: async () => {
      calls++;
      return new Response(
        JSON.stringify({
          error: { message: "Model unavailable for fake-private-key" },
        }),
        { status: 404 },
      );
    },
  });
  await assert.rejects(
    () => ai.first(context),
    (error) => {
      assert.equal(error.status, 503);
      assert.match(error.message, /Model unavailable/);
      assert.ok(!error.message.includes("fake-private-key"));
      return true;
    },
  );
  assert.equal(calls, 1);
});
