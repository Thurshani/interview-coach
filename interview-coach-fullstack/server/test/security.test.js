import test from "node:test";
import assert from "node:assert/strict";
import { createApp } from "../src/app.js";
import { validateEvaluation, scoreOf } from "../src/validation.js";
test("CORS rejects unapproved browser origins and allows configured origin", async (t) => {
  const app = createApp({ ai: {}, limit: false });
  t.after(() => app.locals.dispose());
  const server = app.listen(0, "127.0.0.1");
  await new Promise((r) => server.once("listening", r));
  t.after(() => new Promise((r) => server.close(r)));
  const url = `http://127.0.0.1:${server.address().port}/api/health`;
  assert.equal(
    (await fetch(url, { headers: { Origin: "https://unapproved.example" } }))
      .status,
    403,
  );
  const allowed = await fetch(url, {
    headers: { Origin: "http://localhost:5173" },
  });
  assert.equal(allowed.status, 200);
  assert.equal(
    allowed.headers.get("Access-Control-Allow-Origin"),
    "http://localhost:5173",
  );
  assert.equal(allowed.headers.get("Cache-Control"), "no-store");
});
test("AI feedback rejects out-of-range rubric values and scores are derived", () => {
  const feedback = {
    strengths: ["Clear"],
    improvements: ["Add an example"],
    betterAnswerTip: "Show a result",
    rubric: { relevance: 3, depth: 3, clarity: 2, structure: 2 },
  };
  assert.equal(scoreOf(feedback), 10);
  assert.throws(() =>
    validateEvaluation(
      {
        feedback: {
          ...feedback,
          rubric: { ...feedback.rubric, relevance: 100 },
        },
        nextQuestion: "What did you learn from that project?",
      },
      false,
    ),
  );
  assert.throws(() =>
    validateEvaluation({ feedback, nextQuestion: "Next" }, false),
  );
  assert.throws(() => validateEvaluation({ feedback }, true));
});
