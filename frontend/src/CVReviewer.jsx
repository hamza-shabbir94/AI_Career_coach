import { useState } from "react";
import { postForm } from "./api";
import ScoreRing from "./ScoreRing";

const MAX_FILE_MB = 4;
const ALLOWED = [".pdf", ".docx", ".txt", ".md"];

// One row: name + bar + score + comments
function Meter({ title, data }) {
  return (
    <div className="meter">
      <div className="meter-head">
        <h3>{title}</h3>
        <span>{data.score}/10</span>
      </div>
      <div className="meter-bar"><span style={{ width: `${data.score * 10}%` }} /></div>
      <ul>{data.comments.map((c, i) => <li key={i}>{c}</li>)}</ul>
    </div>
  );
}

export default function CVReviewer() {
  // Inputs
  const [jobRole, setJobRole] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [inputMode, setInputMode] = useState("upload"); // "upload" or "paste"
  const [file, setFile] = useState(null);
  const [cvText, setCvText] = useState("");
  const [dragging, setDragging] = useState(false);

  // Result + UI state
  const [review, setReview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Check a file before we accept it (used by click AND drag & drop)
  function acceptFile(chosen) {
    setError("");
    if (!chosen) return;
    if (!ALLOWED.some((ext) => chosen.name.toLowerCase().endsWith(ext))) {
      return setError("Use a PDF, Word (.docx) or text file.");
    }
    if (chosen.size > MAX_FILE_MB * 1024 * 1024) {
      return setError(`This file is over ${MAX_FILE_MB} MB. Upload a smaller file or paste the text.`);
    }
    setFile(chosen);
  }

  function onDrop(e) {
    e.preventDefault();
    setDragging(false);
    acceptFile(e.dataTransfer.files[0]);
  }

  async function reviewCV() {
    if (!jobRole.trim()) return setError("Enter the role you are applying for.");
    if (inputMode === "upload" && !file) return setError("Choose a CV file first.");
    if (inputMode === "paste" && !cvText.trim()) return setError("Paste your CV text first.");

    // FormData = a form that can carry files (the backend reads it with Form/File)
    const form = new FormData();
    form.append("job_role", jobRole);
    form.append("job_description", jobDescription);
    if (inputMode === "upload") form.append("file", file);
    else form.append("cv_text", cvText);

    setLoading(true);
    setError("");
    try {
      setReview(await postForm("/cv/review", form));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  // ---------- RESULT ----------
  if (review) {
    return (
      <div className="pane">
        <div className="result-top">
          <ScoreRing score={review.overall_score} label={`Fit for ${jobRole}`} />
          <div>
            <h2>Your CV review</h2>
            <p className="lead">{review.summary}</p>
          </div>
        </div>

        <div className="meters">
          <Meter title="Content" data={review.content} />
          <Meter title="Clarity" data={review.clarity} />
          <Meter title="Formatting" data={review.formatting} />
        </div>

        <div className="block">
          <h3>Skills for this role</h3>
          <div className="chips">
            {review.matching_skills.map((s, i) => <span key={`m${i}`} className="chip have">{s}</span>)}
            {review.missing_skills.map((s, i) => <span key={`x${i}`} className="chip add">{s}</span>)}
          </div>
          <p className="legend">
            <span className="chip have small">In your CV</span>
            <span className="chip add small">Add it if you have it</span>
          </p>
        </div>

        <div className="todo">
          <h3>Fix these first</h3>
          <ol>{review.improvements.map((s, i) => <li key={i}>{s}</li>)}</ol>
        </div>

        {review.rewrites.length > 0 && (
          <div className="block">
            <h3>Stronger lines for your CV</h3>
            <div className="paper">
              {review.rewrites.map((r, i) => (
                <div key={i} className="rewrite">
                  <p className="old">{r.before}</p>
                  <p className="new"><mark>{r.after}</mark></p>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="block">
          <h3>Spelling and grammar</h3>
          {review.errors.length === 0 ? (
            <p className="clean">No errors found.</p>
          ) : (
            <ul className="errors">
              {review.errors.map((e, i) => (
                <li key={i}><span className="wrong">{e.problem}</span><span className="fix">{e.fix}</span></li>
              ))}
            </ul>
          )}
        </div>

        <button className="btn btn-primary" onClick={() => setReview(null)}>Review another CV</button>
      </div>
    );
  }

  // ---------- FORM ----------
  return (
    <div className="pane">
      <div className="pane-head">
        <h2>Which job is this CV for?</h2>
        <p>Feedback is tailored to one role, so you know exactly what to change.</p>
      </div>

      <div className="field">
        <label htmlFor="cv-role">Role</label>
        <input
          id="cv-role"
          value={jobRole}
          onChange={(e) => setJobRole(e.target.value)}
          placeholder="e.g. Junior AI Engineer"
        />
      </div>

      <div className="field">
        <label htmlFor="cv-jd">Job ad <span className="optional">optional</span></label>
        <textarea
          id="cv-jd"
          rows={4}
          value={jobDescription}
          onChange={(e) => setJobDescription(e.target.value)}
          placeholder="Paste the job ad to check your CV against its requirements"
        />
      </div>

      <div className="field">
        <div className="field-row">
          <span className="label">Your CV</span>
          <div className="switch" role="group" aria-label="How to add your CV">
            <button className={inputMode === "upload" ? "on" : ""} onClick={() => setInputMode("upload")}>Upload</button>
            <button className={inputMode === "paste" ? "on" : ""} onClick={() => setInputMode("paste")}>Paste text</button>
          </div>
        </div>

        {inputMode === "upload" ? (
          <label
            className={`drop ${dragging ? "dragging" : ""} ${file ? "has-file" : ""}`}
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
          >
            <input type="file" accept={ALLOWED.join(",")} onChange={(e) => acceptFile(e.target.files[0])} />
            {file ? (
              <>
                <strong>{file.name}</strong>
                <span>{(file.size / 1024).toFixed(0)} KB. Click to choose another file.</span>
              </>
            ) : (
              <>
                <strong>Drop your CV here or click to choose</strong>
                <span>PDF, Word or text, up to {MAX_FILE_MB} MB</span>
              </>
            )}
          </label>
        ) : (
          <textarea
            rows={10}
            value={cvText}
            onChange={(e) => setCvText(e.target.value)}
            placeholder="Paste the full text of your CV"
          />
        )}
      </div>

      <button className="btn btn-primary btn-lg" onClick={reviewCV} disabled={loading}>
        {loading ? "Reviewing your CV…" : "Review my CV"}
      </button>
      {error && <p className="error">{error}</p>}
    </div>
  );
}
