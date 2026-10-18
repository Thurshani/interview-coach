import {
  useEffect,
  useRef,
} from "react";

import {
  MessageSquare,
  Send,
  RefreshCw,
} from "lucide-react";

import Feedback from "../components/Feedback";

export default function Interview({
  session,
  answer,
  setAnswer,
  onSubmit,
  busy,
  onReport,
  onSync,
}) {
  const composing = useRef(false);
  const questionHeading = useRef(null);

  const records = session.records || [];
  const questionNumber = records.length + 1;

  const latestRecord =
    records.length > 0
      ? records[records.length - 1]
      : null;

  useEffect(() => {
    if (
      !busy &&
      !session.complete &&
      session.currentQuestion
    ) {
      questionHeading.current?.focus({
        preventScroll: true,
      });
    }
  }, [
    session.currentQuestion,
    session.complete,
    busy,
  ]);

  function submitAnswer(event) {
    event.preventDefault();

    if (
      busy ||
      session.complete ||
      !session.currentQuestion ||
      !answer.trim()
    ) {
      return;
    }

    onSubmit();
  }

  return (
    <div className="card">
      <div className="sectiontitle">
        <div className="icon">
          <MessageSquare size={20} />
        </div>

        <div>
          <h2>Mock interview</h2>

          <div className="sub">
            {session.complete
              ? "All 5 questions complete"
              : `Question ${questionNumber} of 5`}
          </div>
        </div>
      </div>

      <div className="notice">
        Questions in English · Feedback in{" "}
        {session.language} · AI practice assessment
      </div>

      {records.length > 0 && (
        <details
          style={{
            margin: "20px 0",
            border: "1px solid #e2e8f0",
            borderRadius: "12px",
            background: "#ffffff",
          }}
        >
          <summary
            style={{
              padding: "16px",
              cursor: "pointer",
              color: "#475569",
              fontSize: "14px",
              fontWeight: 600,
            }}
          >
            Previous answers & feedback (
            {records.length})
          </summary>

          <div
            style={{
              padding: "0 16px 16px",
              maxHeight: "420px",
              overflowY: "auto",
              overflowWrap: "anywhere",
            }}
          >
            {records.map((record, index) => (
              <div
                key={index}
                style={{
                  marginBottom: "24px",
                }}
              >
                <div className="bubble">
                  <small>
                    QUESTION {index + 1}
                  </small>

                  {record.question}
                </div>

                <div className="bubble user">
                  <small>YOUR ANSWER</small>

                  {record.answer}
                </div>

                <Feedback
                  feedback={record.feedback}
                />
              </div>
            ))}
          </div>
        </details>
      )}

      {!session.complete &&
        session.currentQuestion && (
          <section
            aria-labelledby="current-question-heading"
            style={{
              margin: "24px 0 20px",
              padding: "clamp(16px, 4vw, 24px)",
              background: "#f0f3ff",
              border: "1px solid #d9dfff",
              borderRadius: "14px",
              overflowWrap: "anywhere",
            }}
          >
            <h3
              id="current-question-heading"
              ref={questionHeading}
              tabIndex={-1}
              style={{
                margin: "0 0 12px",
                color: "#4f46e5",
                fontSize: "14px",
                fontWeight: 600,
              }}
            >
              Question {questionNumber} of 5
            </h3>

            <p
              style={{
                margin: 0,
                color: "#25324b",
                fontSize: "16px",
                lineHeight: 1.8,
                whiteSpace: "pre-wrap",
              }}
            >
              {session.currentQuestion}
            </p>
          </section>
        )}

      {!session.complete && (
        <form onSubmit={submitAnswer}>
          <label
            className="fieldlabel"
            htmlFor="answer"
          >
            Your answer
          </label>

          <textarea
            id="answer"
            required
            value={answer}
            disabled={
              busy ||
              !session.currentQuestion
            }
            maxLength={6000}
            placeholder="Type your answer here…"
            aria-describedby="answer-hint"
            onChange={(event) => {
              setAnswer(event.target.value);
            }}
            onCompositionStart={() => {
              composing.current = true;
            }}
            onCompositionEnd={() => {
              composing.current = false;
            }}
            onKeyDown={(event) => {
              const enterPressed =
                event.key === "Enter";

              const isComposing =
                event.nativeEvent.isComposing ||
                composing.current;

              if (
                enterPressed &&
                !event.shiftKey &&
                !isComposing
              ) {
                event.preventDefault();

                if (
                  answer.trim() &&
                  !busy &&
                  session.currentQuestion
                ) {
                  onSubmit();
                }
              }
            }}
          />

          <div
            id="answer-hint"
            className="answerhint"
          >
            <span>
              Enter to send · Shift + Enter
              for a new line
            </span>

            <span>
              {answer.length}/6000
            </span>
          </div>

          {busy && (
            <div
              role="status"
              aria-live="polite"
              style={{
                margin: "16px 0",
                color: "#6366f1",
                fontSize: "14px",
                lineHeight: 1.6,
              }}
            >
              Evaluating your answer and preparing
              the next question…
            </div>
          )}

          <div className="bottomrow">
            <button
              type="button"
              className="quiet"
              disabled={busy}
              onClick={onSync}
            >
              <RefreshCw size={13} />
              Sync session
            </button>

            <button
              type="submit"
              className="primary"
              disabled={
                busy ||
                !answer.trim() ||
                !session.currentQuestion
              }
            >
              {busy
                ? "Evaluating…"
                : "Submit answer"}

              <Send size={14} />
            </button>
          </div>
        </form>
      )}

      {session.complete && (
        <section
          aria-live="polite"
          style={{
            margin: "24px 0",
            padding: "24px",
            background: "#f0fdf4",
            border: "1px solid #bbf7d0",
            borderRadius: "14px",
          }}
        >
          <h3
            style={{
              margin: "0 0 10px",
              color: "#166534",
              fontSize: "20px",
            }}
          >
            Interview complete
          </h3>

          <p
            style={{
              margin: "0 0 20px",
              color: "#475569",
              lineHeight: 1.7,
            }}
          >
            You have answered all 5 questions.
            Your total score is{" "}
            <strong>
              {session.total}/50
            </strong>
            .
          </p>

          <button
            type="button"
            className="primary"
            onClick={onReport}
          >
            View performance report →
          </button>
        </section>
      )}

      {latestRecord && (
        <section
          aria-label="Latest answer feedback"
          style={{
            marginTop: "28px",
            paddingTop: "20px",
            borderTop: "1px solid #e2e8f0",
            overflowWrap: "anywhere",
          }}
        >
          <h3
            style={{
              margin: "0 0 16px",
              color: "#475569",
              fontSize: "15px",
              fontWeight: 600,
            }}
          >
            Feedback for question{" "}
            {records.length}
          </h3>

          <Feedback
            feedback={latestRecord.feedback}
          />
        </section>
      )}
    </div>
  );
}