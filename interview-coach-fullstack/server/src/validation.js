import { z } from "zod";
export const roles = [
  "Software Engineer",
  "Data Scientist",
  "Product Manager",
  "MBA / Management",
  "UI/UX Designer",
  "Marketing",
];
export const levels = ["Fresher", "Mid-level", "Senior", "Lead"];
export const languages = ["English", "Tanglish"];
export const startSchema = z
  .object({
    role: z.enum(roles),
    experience: z.enum(levels),
    language: z.enum(languages),
    resume: z.string().trim().max(20000).default(""),
  })
  .strict();
export const answerSchema = z
  .object({
    answer: z.string().trim().min(1).max(6000),
    version: z.number().int().min(0).max(4),
    requestId: z.string().uuid(),
  })
  .strict();
const text = z.string().trim().min(1).max(2500);
export const questionSchema = z.object({
  question: z.string().trim().min(10).max(800),
});
const rubric = z.object({
  relevance: z.number().int().min(0).max(3),
  depth: z.number().int().min(0).max(3),
  clarity: z.number().int().min(0).max(2),
  structure: z.number().int().min(0).max(2),
});
export const feedbackSchema = z.object({
  strengths: z.array(text).min(1).max(3),
  improvements: z.array(text).min(1).max(3),
  betterAnswerTip: text,
  rubric,
});
export const summarySchema = z.object({
  verdict: text,
  topStrength: text,
  mainImprovement: text,
});
const jsonText = { type: "string" };
export const firstJson = {
  type: "object",
  properties: { question: jsonText },
  required: ["question"],
};
const feedbackJson = {
  type: "object",
  properties: {
    strengths: { type: "array", items: jsonText },
    improvements: { type: "array", items: jsonText },
    betterAnswerTip: jsonText,
    rubric: {
      type: "object",
      properties: {
        relevance: { type: "integer" },
        depth: { type: "integer" },
        clarity: { type: "integer" },
        structure: { type: "integer" },
      },
      required: ["relevance", "depth", "clarity", "structure"],
    },
  },
  required: ["strengths", "improvements", "betterAnswerTip", "rubric"],
};
export function evaluationJson(final) {
  return {
    type: "object",
    properties: {
      feedback: feedbackJson,
      ...(final
        ? {
            summary: {
              type: "object",
              properties: {
                verdict: jsonText,
                topStrength: jsonText,
                mainImprovement: jsonText,
              },
              required: ["verdict", "topStrength", "mainImprovement"],
            },
          }
        : { nextQuestion: jsonText }),
    },
    required: ["feedback", final ? "summary" : "nextQuestion"],
  };
}
export function validateEvaluation(value, final) {
  return z
    .object({
      feedback: feedbackSchema,
      ...(final
        ? { summary: summarySchema }
        : { nextQuestion: z.string().trim().min(10).max(800) }),
    })
    .parse(value);
}
export function scoreOf(feedback) {
  return Object.values(feedback.rubric).reduce((sum, n) => sum + n, 0);
}
