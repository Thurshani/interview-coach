import dotenv from "dotenv";
import { createServer } from "node:http";
import { fileURLToPath } from "node:url";
import { createGemini } from "./gemini.js";
import { createApp } from "./app.js";
dotenv.config({ path: fileURLToPath(new URL("../.env", import.meta.url)) });
const int = (value, fallback, min, max) => {
  const n = Number(value ?? fallback);
  if (!Number.isInteger(n) || n < min || n > max)
    throw new Error("Invalid numeric environment setting. Check server/.env.");
  return n;
};
const port = int(process.env.PORT, 5000, 1, 65535);
const ai = createGemini({
  apiKey: process.env.GEMINI_API_KEY,
  model: process.env.GEMINI_MODEL || "gemini-3.8-flash",
});
const app = createApp({
  ai,
  clientOrigin:
    process.env.CLIENT_ORIGIN ||
    "http://localhost:5173,http://localhost:5000,http://127.0.0.1:5173,http://127.0.0.1:5000",
  trustProxy: int(process.env.TRUST_PROXY_HOPS, 0, 0, 10),
  ttlMs: int(process.env.SESSION_TTL_MINUTES, 60, 5, 180) * 60000,
  maxSessions: int(process.env.MAX_SESSIONS, 100, 1, 10000),
});
const server = createServer(app);
const host = "127.0.0.1";

server.on("error", (error) => {
  console.error("Backend failed to start:", error.message);
  if (error.code === "EADDRINUSE") {
    console.error(
      `Port ${port} is already in use. Stop the previous Interview Coach terminal or change PORT in server/.env.`,
    );
  }
  app.locals.dispose?.();
  process.exitCode = 1;
});

server.listen(port, host, () => {
  console.log(`Interview Coach: http://${host}:${port}`);
  console.log(`Health check: http://${host}:${port}/api/health`);
  console.log("Keep this terminal open while using the app.");
});

function stop() {
  app.locals.dispose?.();
  server.close();
}

process.on("SIGINT", stop);
process.on("SIGTERM", stop);
