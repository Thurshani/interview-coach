import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { extractResume } from "../src/resume.js";
import { createApp } from "../src/app.js";

test("extracts actual PDF and DOCX resumes", async () => {
  for (const ext of ["pdf", "docx"]) {
    const data = await readFile(
      new URL(`./fixtures/resume.${ext}`, import.meta.url),
    );
    const text = await extractResume(data, "." + ext);
    assert.match(text, /Resume Test Candidate/);
    assert.match(text, /React/);
  }
});
test("extracts TXT, rejects empty/corrupt and oversized text", async () => {
  assert.match(
    await extractResume(Buffer.from("Skills: React"), ".txt"),
    /React/,
  );
  await assert.rejects(
    () => extractResume(Buffer.from("not a pdf"), ".pdf"),
    /Invalid PDF/,
  );
  await assert.rejects(
    () => extractResume(Buffer.from("not a doc"), ".doc"),
    /Invalid DOC/,
  );
  await assert.rejects(
    () => extractResume(Buffer.from("   "), ".txt"),
    /No readable text/,
  );
  await assert.rejects(
    () => extractResume(Buffer.from("a".repeat(20001)), ".txt"),
    /20,000/,
  );
});
test("multipart endpoint returns resume text and rejects unsupported files", async (t) => {
  const app = createApp({ ai: {}, limit: false });
  t.after(() => app.locals.dispose());
  const server = app.listen(0, "127.0.0.1");
  await new Promise((r) => server.once("listening", r));
  t.after(() => new Promise((r) => server.close(r)));
  const url = `http://127.0.0.1:${server.address().port}/api/resumes/extract`;
  const upload = async (name, content) => {
    const body = new FormData();
    body.append("resume", new Blob([content]), name);
    return fetch(url, { method: "POST", body });
  };
  const good = await upload("resume.txt", "Candidate with React skills");
  assert.equal(good.status, 200);
  assert.match((await good.json()).text, /React/);
  const bad = await upload("resume.exe", "binary");
  assert.equal(bad.status, 400);
  const large = await upload("resume.txt", "x".repeat(5 * 1024 * 1024 + 1));
  assert.equal(large.status, 400);
  const missing = await fetch(url, { method: "POST", body: new FormData() });
  assert.equal(missing.status, 400);
});
