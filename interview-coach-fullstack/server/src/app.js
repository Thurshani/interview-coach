import express from "express";
import cors from "cors";
import helmet from "helmet";
import { rateLimit } from "express-rate-limit";
import { randomBytes } from "node:crypto";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { startSchema, answerSchema, scoreOf } from "./validation.js";
import { AppError } from "./gemini.js";
import { resumeRouter } from "./resume.js";

export function createApp({
  ai,
  ttlMs = 3600000,
  maxSessions = 100,
  trustProxy = 0,
  clientOrigin = "http://localhost:5173",
  limit = true,
} = {}) {
  const app = express(),
    sessions = new Map();
  let startsInFlight = 0;
  app.disable("x-powered-by");
  if (trustProxy) app.set("trust proxy", trustProxy);
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          "img-src": ["'self'", "data:"],
          "style-src": [
            "'self'",
            "'unsafe-inline'",
            "https://fonts.googleapis.com",
          ],
          "font-src": ["'self'", "https://fonts.gstatic.com"],
        },
      },
    }),
  );
  const origins = new Set(clientOrigin.split(",").map((s) => s.trim()));
  app.use("/api", (req, res, next) => {
    res.set("Cache-Control", "no-store");
    if (req.headers.origin && !origins.has(req.headers.origin))
      return res.status(403).json({ message: "This origin is not allowed." });
    next();
  });
  app.use(
    cors({ origin: (origin, cb) => cb(null, !origin || origins.has(origin)) }),
  );
  app.use(express.json({ limit: "96kb" }));
  if (limit) {
    app.use(
      "/api",
      rateLimit({
        windowMs: 60000,
        limit: 30,
        standardHeaders: "draft-7",
        legacyHeaders: false,
        message: { message: "Too many requests. Please wait a minute." },
      }),
    );
    app.use("/api/interviews", (req, res, next) => {
      if (req.method === "POST" && req.path === "/")
        return startLimiter(req, res, next);
      next();
    });
  }
  const startLimiter = rateLimit({
    windowMs: 3600000,
    limit: 10,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    message: {
      message: "Session start limit reached. Please try again later.",
    },
  });
  function sweep() {
    const now = Date.now();
    for (const [id, s] of sessions)
      if (s.expiresAt < now && !s.busy) sessions.delete(id);
  }
  const cleanup = setInterval(sweep, 60000);
  cleanup.unref();
  app.locals.dispose = () => clearInterval(cleanup);
  function view(s) {
    return {
      id: s.id,
      role: s.context.role,
      experience: s.context.experience,
      language: s.context.language,
      resumeProvided: !!s.context.resume,
      version: s.records.length,
      currentQuestion: s.currentQuestion,
      records: s.records,
      summary: s.summary || null,
      complete: s.records.length === 5,
      total: s.records.reduce((sum, r) => sum + r.feedback.score, 0),
      expiresAt: new Date(s.expiresAt).toISOString(),
      startedAt: s.startedAt,
    };
  }
  function get(req) {
    sweep();
    const s = sessions.get(req.params.id);
    if (!s)
      throw new AppError(
        404,
        "Session expired or server restarted. Please start a new interview.",
      );
    return s;
  }
  app.get("/api/health", (_req, res) => res.json({ ok: true }));
  app.post("/api/interviews", async (req, res, next) => {
    sweep();
    let reserved = false;
    try {
      const parsed = startSchema.safeParse(req.body);
      if (!parsed.success)
        throw new AppError(
          400,
          "Choose a valid role, level, language, and a resume of at most 20,000 characters.",
        );
      if (sessions.size + startsInFlight >= maxSessions)
        throw new AppError(503, "The server is busy. Please try again later.");
      startsInFlight++;
      reserved = true;
      const first = await ai.first(parsed.data);
      const id = randomBytes(32).toString("hex");
      const s = {
        id,
        context: parsed.data,
        currentQuestion: first.question,
        records: [],
        startedAt: new Date().toISOString(),
        expiresAt: Date.now() + ttlMs,
        busy: false,
      };
      sessions.set(id, s);
      res.status(201).json(view(s));
    } catch (e) {
      next(e);
    } finally {
      if (reserved) startsInFlight--;
    }
  });
  app.get("/api/interviews/:id", (req, res, next) => {
    try {
      res.json(view(get(req)));
    } catch (e) {
      next(e);
    }
  });
  app.post("/api/interviews/:id/answers", async (req, res, next) => {
    let s,
      locked = false;
    try {
      s = get(req);
      const parsed = answerSchema.safeParse(req.body);
      if (!parsed.success)
        throw new AppError(400, "Enter an answer of 1–6,000 characters.");
      const data = parsed.data;
      if (s.lastRequest?.requestId === data.requestId) {
        if (
          s.lastRequest.answer !== data.answer ||
          s.lastRequest.version !== data.version
        )
          throw new AppError(409, "Request does not match the saved answer.");
        return res.json(view(s));
      }
      if (s.busy)
        throw new AppError(
          409,
          "An answer is already being evaluated. Please wait.",
        );
      if (s.records.length === 5)
        throw new AppError(409, "This interview is already complete.");
      if (data.version !== s.records.length)
        throw new AppError(
          409,
          "This question has already changed. Refresh the session state.",
        );
      s.busy = true;
      locked = true;
      const result = await ai.evaluate(s, data.answer);
      if (
        result.nextQuestion &&
        [s.currentQuestion, ...s.records.map((r) => r.question)].some(
          (q) =>
            q.trim().toLowerCase() === result.nextQuestion.trim().toLowerCase(),
        )
      )
        throw new AppError(502, "Gemini repeated a question. Please retry.");
      const feedback = { ...result.feedback, score: scoreOf(result.feedback) };
      s.records.push({
        question: s.currentQuestion,
        answer: data.answer,
        feedback,
      });
      s.currentQuestion = result.nextQuestion || null;
      s.summary = result.summary || null;
      s.expiresAt = Date.now() + ttlMs;
      s.lastRequest = {
        requestId: data.requestId,
        answer: data.answer,
        version: data.version,
      };
      res.json(view(s));
    } catch (e) {
      next(e);
    } finally {
      if (locked) s.busy = false;
    }
  });
  app.delete("/api/interviews/:id", (req, res, next) => {
    try {
      const s = get(req);
      if (s.busy)
        throw new AppError(
          409,
          "Wait until evaluation finishes before ending the session.",
        );
      sessions.delete(s.id);
      res.status(204).end();
    } catch (e) {
      next(e);
    }
  });
  app.use("/api/resumes", resumeRouter);
  app.use("/api", (_req, res) =>
    res.status(404).json({ message: "API endpoint not found." }),
  );
  const dist = fileURLToPath(new URL("../../client/dist", import.meta.url));
  if (existsSync(dist)) {
    app.use(express.static(dist));
    app.get("/{*rest}", (_req, res) =>
      res.sendFile(path.join(dist, "index.html")),
    );
  }
  app.use((err, _req, res, _next) => {
    const status = err.status || 500;
    const message =
      err.type === "entity.too.large"
        ? "Request too large."
        : err instanceof SyntaxError
          ? "Invalid JSON request."
          : status < 500 || err instanceof AppError
            ? err.message
            : "An unexpected server error occurred.";
    res.status(status).json({ message });
  });
  return app;
}
