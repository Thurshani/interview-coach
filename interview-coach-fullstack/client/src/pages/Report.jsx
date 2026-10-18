import { Download, ChartNoAxesCombined } from "lucide-react";
import Feedback from "../components/Feedback";
import { downloadReport } from "../report";
export default function Report({ session, onRestart }) {
  return (
    <div className="card">
      <div className="sectiontitle">
        <div className="icon">
          <ChartNoAxesCombined size={20} />
        </div>
        <div>
          <h2>Performance report</h2>
          <div className="sub">
            {session.role} · {session.experience}
          </div>
        </div>
      </div>
      <div className="scorecircle">
        {session.total}
        <small>OUT OF 50</small>
      </div>
      <p className="reportaverage">
        Average {Number(session.total / 5).toFixed(1)}/10
      </p>
      <p className="verdict">{session.summary.verdict}</p>
      <div className="twocol">
        <div className="reportrow">
          <b>Top strength</b>
          <p>{session.summary.topStrength}</p>
        </div>
        <div className="reportrow">
          <b>Main area to improve</b>
          <p>{session.summary.mainImprovement}</p>
        </div>
      </div>
      {session.records.map((r, i) => (
        <details
          className="reportdetail"
          key={i}
        >
          <summary>
            Question {i + 1} <span>{r.feedback.score}/10</span>
          </summary>
          <p className="reportquestion">{r.question}</p>
          <div className="bubble user">
            <small>YOUR ANSWER</small>
            {r.answer}
          </div>
          <Feedback feedback={r.feedback} />
        </details>
      ))}
      <p className="tiny reportdisclaimer">
        AI scores are practice estimates, not hiring decisions. Download the
        report before leaving; sessions are not stored permanently.
      </p>
      <div className="bottomrow">
        <button
          className="quiet"
          onClick={onRestart}
        >
          Practice again
        </button>
        <button
          className="primary"
          onClick={() => downloadReport(session)}
        >
          <Download size={15} /> Download HTML report
        </button>
      </div>
    </div>
  );
}
