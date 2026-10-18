import { useEffect, useState, useRef } from "react";
import { Lightbulb } from "lucide-react";
import Landing from "./pages/Landing";
import Setup from "./pages/Setup";
import Interview from "./pages/Interview";
import Report from "./pages/Report";
import Sidebar from "./components/Sidebar";
import {
  startInterview,
  sendAnswer,
  syncInterview,
  deleteInterview,
} from "./api";
export default function App() {
  const [page, setPage] = useState("home"),
    [menu, setMenu] = useState(false),
    [session, setSession] = useState(null),
    [answer, setAnswer] = useState(""),
    [resume, setResume] = useState(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const [config, setConfig] = useState({
    role: "Software Engineer",
    experience: "Fresher",
    language: "English",
  });
  const pending = useRef(null);
  const lock = useRef(false);
  useEffect(() => {
    const warn = (e) => {
      if (session) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [session]);
  useEffect(() => {
    const key = (e) => {
      if (e.key === "Escape") setMenu(false);
    };
    document.addEventListener("keydown", key);
    return () => document.removeEventListener("keydown", key);
  }, []);
  function navigate(next) {
    if (busy) return;
    if (next === "interview" && !session) {
      setError("Start an interview from Interview setup.");
      next = "setup";
    }
    if (next === "report" && !session?.complete) {
      setError("Complete all 5 questions to view your report.");
      return;
    }
    setPage(next);
    setMenu(false);
    window.scrollTo(0, 0);
  }
  async function start() {
    if (lock.current) return;
    if (
      session &&
      !window.confirm(
        "Start a new interview? Download your current report first if you want to keep it.",
      )
    )
      return;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      const fresh = await startInterview({
        ...config,
        resume: resume?.text || "",
      });
      if (session) deleteInterview(session.id).catch(() => {});
      setSession(fresh);
      setAnswer("");
      pending.current = null;
      setPage("interview");
    } catch (e) {
      setError(e.message);
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  async function submit() {
    if (lock.current || !session || session.complete || !answer.trim()) return;
    lock.current = true;
    setBusy(true);
    setError("");
    const body =
      pending.current &&
      pending.current.answer === answer.trim() &&
      pending.current.version === session.version
        ? pending.current
        : {
            answer: answer.trim(),
            version: session.version,
            requestId: crypto.randomUUID(),
          };
    pending.current = body;
    try {
      const updated = await sendAnswer(session.id, body);
      setSession(updated);
      setAnswer("");
      pending.current = null;
    } catch (e) {
      setError(
        e.message +
          " Your text is still here. Retry the same answer or use Sync session.",
      );
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  async function sync() {
    if (lock.current || !session) return;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      const s = await syncInterview(session.id);
      if (s.version > session.version) {
        setAnswer("");
        pending.current = null;
      }
      setSession(s);
    } catch (e) {
      setError(e.message);
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  if (page === "home")
    return (
      <Landing
        onStart={() => {
          setPage("setup");
          setError("");
        }}
      />
    );
  const active = page === "setup" ? config : session || config;
  const steps = ["setup", "interview", "report"];
  const labels = {
    setup: [
      "Interview setup",
      "Choose your preferences to start a practice session.",
    ],
    interview: ["Mock interview", "Type your answer below."],
    report: ["Performance report", "Review your answers and feedback."],
  };
  return (
    <>
      <Sidebar
        page={page}
        onNavigate={navigate}
        open={menu}
        setOpen={setMenu}
        busy={busy}
      />
      <main>
        <header className="topbar">
          <span>
            Workspace / <b>{labels[page][0]}</b>
          </span>
          <span className="pill">
            <i />
            Gemini interview coach
          </span>
        </header>
        <div className="hero">
          <div>
            <div className="eyebrow">INTERVIEW PRACTICE</div>
            <h1>{labels[page][0]}</h1>
            <p>{labels[page][1]}</p>
          </div>
          <span className="stepbadge">
            STEP 0{steps.indexOf(page) + 1} OF 03
          </span>
        </div>
        <div className="steps">
          {steps.map((s, i) => (
            <div
              className="stepwrap"
              key={s}
            >
              {i > 0 && <div className="connector" />}
              <div className={"step " + (i <= steps.indexOf(page) ? "on" : "")}>
                <b>{i + 1}</b>
                {
                  [
                    "Set your preferences",
                    "Practice interview",
                    "Review & improve",
                  ][i]
                }
              </div>
            </div>
          ))}
        </div>
        {error && (
          <div
            className="errorbanner"
            role="alert"
          >
            {error}
            <button
              aria-label="Dismiss error"
              onClick={() => setError("")}
            >
              ×
            </button>
          </div>
        )}
        <div className="layout">
          <section>
            {page === "setup" && (
              <Setup
                {...{ config, setConfig, resume, setResume, busy }}
                onStart={start}
                hasSession={!!session}
              />
            )}{" "}
            {page === "interview" && session && (
              <Interview
                {...{ session, answer, setAnswer, busy }}
                onSubmit={submit}
                onSync={sync}
                onReport={() => navigate("report")}
              />
            )}{" "}
            {page === "report" && session?.summary && (
              <Report
                session={session}
                onRestart={() => navigate("setup")}
              />
            )}
          </section>
          <div className="right">
            <div className="card sidecard">
              <h3>Your session at a glance</h3>
              <div className="stat">
                <span>Job role</span>
                <strong>{active.role}</strong>
              </div>
              <div className="stat">
                <span>Experience</span>
                <strong>{active.experience}</strong>
              </div>
              <div className="stat">
                <span>Feedback</span>
                <strong>{active.language}</strong>
              </div>
              <div className="stat">
                <span>Questions</span>
                <strong>
                  {session && page !== "setup"
                    ? `${session.records.length}/5 answered`
                    : "5 questions"}
                </strong>
              </div>
              <div className="stat">
                <span>
                  {session && page !== "setup"
                    ? "Current total"
                    : "Total possible score"}
                </span>
                <strong>
                  {session && page !== "setup"
                    ? `${session.total}/50`
                    : "50 points"}
                </strong>
              </div>
              {session && page !== "setup" && (
                <>
                  <div className="progressline">
                    <i style={{ width: `${session.records.length * 20}%` }} />
                  </div>
                  {session.records.map((r, i) => (
                    <div
                      className="stat"
                      key={i}
                    >
                      <span>Question {i + 1}</span>
                      <strong>{r.feedback.score}/10</strong>
                    </div>
                  ))}
                  {session.records.length > 0 && (
                    <div className="stat">
                      <span>Running average</span>
                      <strong>
                        {(session.total / session.records.length).toFixed(1)}/10
                      </strong>
                    </div>
                  )}
                </>
              )}
            </div>
            <div className="card sidecard tip">
              <div className="bulb">
                <Lightbulb size={23} />
              </div>
              <h3>Practice tip</h3>
              <p>
                Use real examples. Explain the situation, what you did, and the
                result.
              </p>
            </div>
            <p className="sessionnote">
            Please avoid refreshing during your interview. Download your report when you finish.
            </p>
          </div>
        </div>
        <footer className="footer">
          <span>Interview Coach</span>
          <span>Practice at your own pace</span>
        </footer>
      </main>
    </>
  );
}
