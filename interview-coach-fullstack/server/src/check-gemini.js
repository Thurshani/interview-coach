import dotenv from "dotenv";
import { fileURLToPath } from "node:url";

dotenv.config({ path: fileURLToPath(new URL("../.env", import.meta.url)) });

const key = process.env.GEMINI_API_KEY?.trim();
const model = process.env.GEMINI_MODEL?.trim() || "gemini-3.8-flash";
const base = "https://generativelanguage.googleapis.com/v1beta/";

function safe(value) {
  return String(value)
    .split(key || "[NO_KEY]")
    .join("[REDACTED]");
}

async function check() {
  if (!key || key === "replace_with_your_key") {
    throw new Error("Add your Gemini API key to server/.env first.");
  }

  let pageToken;
  console.log("Models supporting generateContent for this key:");
  do {
    const url = new URL(`${base}models`);
    url.searchParams.set("pageSize", "100");
    if (pageToken) url.searchParams.set("pageToken", pageToken);
    const response = await fetch(url, {
      headers: { "x-goog-api-key": key },
      signal: AbortSignal.timeout(30000),
    });
    const body = await response.json();
    if (!response.ok) {
      throw new Error(
        `Google HTTP ${response.status}: ${safe(body.error?.message)}`,
      );
    }
    for (const item of body.models || []) {
      if (item.supportedGenerationMethods?.includes("generateContent")) {
        console.log(`  ${item.name.replace(/^models\//, "")}`);
      }
    }
    pageToken = body.nextPageToken;
  } while (pageToken);

  console.log(`Testing configured model: ${model}`);
  const response = await fetch(
    `${base}models/${encodeURIComponent(model)}:generateContent`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": key },
      signal: AbortSignal.timeout(60000),
      body: JSON.stringify({
        contents: [{ parts: [{ text: "Reply with the word OK." }] }],
      }),
    },
  );
  const body = await response.json();
  if (!response.ok) {
    throw new Error(
      `Google HTTP ${response.status}: ${safe(body.error?.message)}`,
    );
  }
  console.log("Model generation test passed. This small test uses API quota.");
}

check().catch((error) => {
  console.error(safe(error.message));
  process.exitCode = 1;
});
