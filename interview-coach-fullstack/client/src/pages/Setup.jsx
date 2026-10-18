import { useEffect, useRef, useState } from "react";
import {
  Settings,
  Upload,
  X,
  ArrowRight,
  FileText,
  ClipboardPaste,
} from "lucide-react";
import { roles } from "../components/Icons";
import { uploadResume } from "../api";

const MAX_TEXT = 20000;
const MAX_FILE = 5 * 1024 * 1024;
const ACCEPT =
  ".pdf,.docx,.doc,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/msword,text/plain";

export default function Setup({
  config,
  setConfig,
  resume,
  setResume,
  onStart,
  busy,
  hasSession,
}) {
  const input = useRef(null);
  const sequence = useRef(0);
  const [mode, setMode] = useState("upload");
  const [paste, setPaste] = useState("");
  const [fileError, setFileError] = useState("");
  const [reading, setReading] = useState(false);

  useEffect(
    () => () => {
      sequence.current++;
    },
    [],
  );

  function set(name, value) {
    setConfig((previous) => ({ ...previous, [name]: value }));
  }

  function switchMode(next) {
    if (busy || reading) return;
    setMode(next);
    setFileError("");
    if (next === "paste") setPaste(resume?.text || "");
  }

  function updatePaste(value) {
    setPaste(value);
    setFileError("");
    const text = value.trim();
    setResume(
      text && value.length <= MAX_TEXT ? { name: "Pasted resume", text } : null,
    );
  }

  function clearResume() {
    sequence.current++;
    setResume(null);
    setPaste("");
    setFileError("");
    if (input.current) input.current.value = "";
  }

  async function upload(file) {
    if (!file || busy || reading) return;
    const token = ++sequence.current;
    setFileError("");
    setResume(null);
    setPaste("");
    const extension = "." + file.name.split(".").pop().toLowerCase();
    if (![".pdf", ".docx", ".doc", ".txt"].includes(extension)) {
      setFileError("Use a PDF, DOCX, DOC, or TXT resume.");
      return;
    }
    if (file.size > MAX_FILE) {
      setFileError("File must be 5 MB or smaller.");
      return;
    }
    if (!file.size) {
      setFileError("The selected file is empty.");
      return;
    }
    setReading(true);
    try {
      const result = await uploadResume(file);
      if (sequence.current !== token) return;
      setResume({ name: result.name, text: result.text });
      setPaste(result.text);
    } catch (error) {
      if (sequence.current === token) setFileError(error.message);
    } finally {
      if (sequence.current === token) setReading(false);
      if (input.current) input.current.value = "";
    }
  }

  const pasteTooLong = mode === "paste" && paste.length > MAX_TEXT;
  const tabStyle = {
    display: "flex",
    gap: 10,
    marginBottom: 14,
    flexWrap: "wrap",
  };
  const selectedStyle = {
    borderColor: "#6b78dd",
    background: "#eff2ff",
    color: "#4559af",
  };

  return (
    <div className="card">
      <div className="sectiontitle">
        <div className="icon">
          <Settings size={20} />
        </div>
        <div>
          <h2>Interview preferences</h2>
          <div className="sub">
            Select a role, experience level, and feedback language.
          </div>
        </div>
      </div>

      <fieldset disabled={busy || reading}>
        <legend className="fieldlabel">Job role</legend>
        <div className="roles">
          {roles.map(([name, Icon]) => (
            <button
              type="button"
              key={name}
              className={"role " + (config.role === name ? "selected" : "")}
              aria-pressed={config.role === name}
              onClick={() => set("role", name)}
            >
              <em>
                <Icon size={23} />
              </em>
              {name}
            </button>
          ))}
        </div>

        <div className="twocol">
          <div>
            <label
              className="fieldlabel"
              htmlFor="experience"
            >
              Experience level
            </label>
            <select
              id="experience"
              value={config.experience}
              onChange={(e) => set("experience", e.target.value)}
            >
              {["Fresher", "Mid-level", "Senior", "Lead"].map((value) => (
                <option key={value}>{value}</option>
              ))}
            </select>
          </div>
          <div>
            <label
              className="fieldlabel"
              htmlFor="language"
            >
              Feedback language
            </label>
            <select
              id="language"
              value={config.language}
              onChange={(e) => set("language", e.target.value)}
            >
              <option value="English">English</option>
              <option value="Tanglish">Tanglish (Tamil + English)</option>
            </select>
          </div>
        </div>

        <div className="fieldlabel">
          Add your resume <span className="optional">OPTIONAL</span>
        </div>
        <div
          style={tabStyle}
          aria-label="Resume input method"
        >
          <button
            type="button"
            className="quiet"
            aria-pressed={mode === "upload"}
            style={mode === "upload" ? selectedStyle : undefined}
            onClick={() => switchMode("upload")}
          >
            <FileText size={15} /> Upload file
          </button>
          <button
            type="button"
            className="quiet"
            aria-pressed={mode === "paste"}
            style={mode === "paste" ? selectedStyle : undefined}
            onClick={() => switchMode("paste")}
          >
            <ClipboardPaste size={15} /> Copy & paste
          </button>
        </div>

        {mode === "upload" ? (
          <>
            <label
              className="upload"
              htmlFor="resume"
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                upload(e.dataTransfer.files[0]);
              }}
            >
              <span className="up">
                <Upload size={28} />
              </span>
              <strong>
                {reading
                  ? "Reading resume…"
                  : resume
                    ? resume.name
                    : "Click to upload or drop your resume"}
              </strong>
              <p>PDF, DOCX, DOC, TXT · Up to 5 MB</p>
            </label>
            <input
              ref={input}
              id="resume"
              className="sr-only"
              type="file"
              accept={ACCEPT}
              onChange={(e) => upload(e.target.files[0])}
            />
            <p
              className="tiny"
              style={{ marginTop: 10, lineHeight: 1.8 }}
            >
              Text-based files only. Scanned/image PDFs need OCR first, or paste
              their text below.
            </p>
          </>
        ) : (
          <>
            <label
              className="sr-only"
              htmlFor="resumeText"
            >
              Resume text
            </label>
            <textarea
              id="resumeText"
              value={paste}
              style={{ minHeight: 230 }}
              placeholder="Copy your CV text and paste it here: skills, education, projects and experience…"
              onChange={(e) => updatePaste(e.target.value)}
            />
            <div className="answerhint">
              <span>Paste resume text, not a file path or link.</span>
              <span style={pasteTooLong ? { color: "#b34d59" } : undefined}>
                {paste.length.toLocaleString()} / 20,000
              </span>
            </div>
          </>
        )}

        {resume && !reading && (
          <div>
            <p
              className="tiny"
              style={{ marginTop: 12, color: "#438b5a" }}
            >
              Resume ready · {resume.text.length.toLocaleString()} characters
            </p>
            <button
              type="button"
              className="textbutton"
              onClick={clearResume}
            >
              <X size={13} /> Remove resume
            </button>
          </div>
        )}
        {fileError && (
          <p
            className="error"
            role="alert"
          >
            {fileError}
          </p>
        )}
        {pasteTooLong && (
          <p
            className="error"
            role="alert"
          >
            Keep your resume within 20,000 characters before starting.
          </p>
        )}
        <p className="privacy">
          Resume text and answers are sent to Google Gemini for this session.
          Remove private contact details before uploading or pasting.
        </p>
        <div className="bottomrow">
          <span className="tiny">5 questions · At your own pace</span>
          <button
            type="button"
            className="primary"
            disabled={busy || reading || pasteTooLong}
            onClick={onStart}
          >
            {busy
              ? "Generating first question…"
              : hasSession
                ? "Start a new interview"
                : "Start interview"}
            {!busy && <ArrowRight size={15} />}
          </button>
        </div>
      </fieldset>
    </div>
  );
}
