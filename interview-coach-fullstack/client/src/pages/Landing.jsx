import { Brand } from "../components/Icons";
export default function Landing({ onStart }) {
  return (
    <div className="landing">
      <div className="landwrap">
        <nav
          className="landnav"
          aria-label="Main navigation"
        >
          <Brand />
          <div className="landnavlinks">
            <a href="#home">Home</a>
            <a href="#aboutus">About Us</a>
            <button
              className="landinterview"
              onClick={onStart}
            >
              Interview
            </button>
            <button
              className="primary"
              onClick={onStart}
            >
              Start interview →
            </button>
          </div>
        </nav>
        <section
          className="landhero"
          id="home"
        >
          <div>
            <div className="landtag">Interview practice, made simple</div>
            <h1>
              Practice for your
              <br />
              next interview.
            </h1>
            <p>
              Choose a job role, answer five questions, and review your
              feedback. Prepare in English or get feedback in Tanglish.
            </p>
            <div className="landactions">
              <button
                className="primary"
                onClick={onStart}
              >
                Start interview →
              </button>
              <a
                className="quiet linkbutton"
                href="#howitworks"
              >
                How it works
              </a>
            </div>
            <div className="landnote">
              At your own pace · Resume upload is optional
            </div>
          </div>
          <div className="heroart">
            <img
              src="/assets/interview-photo.jpg"
              alt="Candidate and interviewer discussing a role in an office"
            />
            <div className="imagecaption">
              5 questions. Feedback after every answer.
            </div>
          </div>
        </section>
        <section
          className="landdetails"
          id="howitworks"
        >
          <h2>How it works</h2>
          <div className="landcolumns">
            <div>
              <div className="num">Step 1</div>
              <h3>Choose your role</h3>
              <p>
                Select your experience level and feedback language. Add a text
                resume if you want to.
              </p>
            </div>
            <div>
              <div className="num">Step 2</div>
              <h3>Answer five questions</h3>
              <p>
                Type your answers in a chat. Review the feedback before moving
                to the next question.
              </p>
            </div>
            <div>
              <div className="num">Step 3</div>
              <h3>See where to improve</h3>
              <p>Review your feedback and download your session report.</p>
            </div>
          </div>
        </section>
        <section
          className="landabout"
          id="aboutus"
        >
          <div className="aboutintro">
            <div>
              <div className="landtag">About Us</div>
              <h2>
                Interview preparation,
                <br />
                at your own pace.
              </h2>
            </div>
            <p>
              Interview Coach is a practice tool for students and job seekers.
              Choose a role, work through a short text-based interview, and
              learn how to make your answers clearer. No account is needed to
              start.
            </p>
          </div>
          <div className="benefitsection">
            <div>
              <h2>Why use Interview Coach?</h2>
              <p>
                Get focused practice for the role you want, with feedback you
                can use in your next answer.
              </p>
              <button
                className="primary"
                onClick={onStart}
              >
                Try an interview →
              </button>
            </div>
            <div className="benefitlist">
              <article>
                <h3>Questions for your role</h3>
                <p>
                  Practice questions based on your role and experience. Upload a
                  text resume for questions about your skills and projects.
                </p>
              </article>
              <article>
                <h3>Feedback after each answer</h3>
                <p>
                  Review strengths, areas to improve, and a better-answer tip.
                  Choose English or Tanglish feedback.
                </p>
              </article>
              <article>
                <h3>A report to take with you</h3>
                <p>
                  See your scores and overall result. Download the HTML report
                  when the session is complete.
                </p>
              </article>
            </div>
          </div>
        </section>
        <footer className="landfooter">
          <span>Interview Coach</span>
          <span>AI practice feedback · Not a hiring decision</span>
        </footer>
      </div>
    </div>
  );
}
