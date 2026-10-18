const escape = (value) =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
export function makeReport(session) {
  const list = (items) =>
    `<ul>${items.map((t) => `<li>${escape(t)}</li>`).join("")}</ul>`;
  return `<!doctype html><html lang="${session.language === "Tanglish" ? "ta-Latn" : "en"}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Interview Coach — Performance report</title><style>body{font:15px/1.7 Arial,sans-serif;color:#26334a;max-width:900px;margin:40px auto;padding:24px;background:#f7f9ff}h1,h2,h3{font-weight:500}header,article,.summary{background:#fff;padding:24px;border:1px solid #dfe5f2;border-radius:10px;margin-bottom:20px}.score{font-size:30px;color:#5268b6}.answer{white-space:pre-wrap;overflow-wrap:anywhere}small{color:#6f7d91}@media print{body{background:#fff;margin:0}article{break-inside:avoid}}</style></head><body><header><h1>Interview performance report</h1><p>${escape(session.role)} · ${escape(session.experience)} · ${escape(session.language)}</p><small>${escape(new Date(session.startedAt).toLocaleString())}</small><div class="score">${escape(session.total)} / 50</div><p>Average: ${escape((session.total / 5).toFixed(1))} / 10</p><small>AI practice feedback, not a hiring decision.</small></header><section class="summary"><h2>Overall feedback</h2><p>${escape(session.summary.verdict)}</p><h3>Top strength</h3><p>${escape(session.summary.topStrength)}</p><h3>Main area to improve</h3><p>${escape(session.summary.mainImprovement)}</p></section>${session.records.map((record, i) => `<article><h2>Question ${i + 1} · ${escape(record.feedback.score)}/10</h2><p>${escape(record.question)}</p><h3>Your answer</h3><p class="answer">${escape(record.answer)}</p><h3>Strengths</h3>${list(record.feedback.strengths)}<h3>Improvements</h3>${list(record.feedback.improvements)}<h3>Better answer tip</h3><p>${escape(record.feedback.betterAnswerTip)}</p><small>Relevance ${record.feedback.rubric.relevance}/3 · Depth ${record.feedback.rubric.depth}/3 · Clarity ${record.feedback.rubric.clarity}/2 · Structure ${record.feedback.rubric.structure}/2</small></article>`).join("")}</body></html>`;
}
export function downloadReport(session) {
  const url = URL.createObjectURL(
    new Blob([makeReport(session)], { type: "text/html;charset=utf-8" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download =
    "interview-report-" +
    new Date(session.startedAt).toISOString().slice(0, 10) +
    ".html";
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
