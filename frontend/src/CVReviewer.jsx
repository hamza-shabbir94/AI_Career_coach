import { useState } from "react";
import { postForm } from "./api";
import ScoreRing from "./ScoreRing";
import CVInput, { EMPTY_CV, addCVToForm, checkCV } from "./CVInput";

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

// onBuildPlan comes from App.jsx (see "lifting state up" there)
export default function CVReviewer({ onBuildPlan }) {
  // Inputs
  const [jobRole, setJobRole] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [cv, setCv] = useState(EMPTY_CV); // { mode, file, text }, see CVInput.jsx

  // Result + UI state
  const [review, setReview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function reviewCV() {
    if (!jobRole.trim()) return setError("Enter the role you are applying for.");
    const cvError = checkCV(cv);
    if (cvError) return setError(cvError);

    // FormData = a form that can carry files (the backend reads it with Form/File)
    const form = new FormData();
    form.append("job_role", jobRole);
    form.append("job_description", jobDescription);
    addCVToForm(form, cv);

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

        <div className="actions">
          <button
            className="btn btn-highlight"
            onClick={() => onBuildPlan({
              job_role: jobRole,
              gaps: [...review.missing_skills, ...review.improvements],
              context: `CV review summary: ${review.summary}`,
            })}
          >
            Build my learning plan
          </button>
          <button className="btn btn-primary" onClick={() => setReview(null)}>Review another CV</button>
        </div>
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

      <CVInput value={cv} onChange={setCv} />

      <button className="btn btn-primary btn-lg" onClick={reviewCV} disabled={loading}>
        {loading ? "Reviewing your CV…" : "Review my CV"}
      </button>
      {error && <p className="error">{error}</p>}
    </div>
  );
}
