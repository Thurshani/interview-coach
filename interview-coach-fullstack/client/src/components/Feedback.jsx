export default function Feedback({ feedback }) {
  return (
    <div className="feedback">
      <b>Feedback · {feedback.score}/10</b>
      <h3>Strengths</h3>
      <ul>
        {feedback.strengths.map((s, i) => (
          <li key={i}>{s}</li>
        ))}
      </ul>
      <h3>Improvements</h3>
      <ul>
        {feedback.improvements.map((s, i) => (
          <li key={i}>{s}</li>
        ))}
      </ul>
      <h3>Better answer tip</h3>
      <p>{feedback.betterAnswerTip}</p>
      <div className="rubric">
        Relevance {feedback.rubric.relevance}/3 · Depth {feedback.rubric.depth}
        /3 · Clarity {feedback.rubric.clarity}/2 · Structure{" "}
        {feedback.rubric.structure}/2
      </div>
    </div>
  );
}
