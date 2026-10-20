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

// Names for the 4 judge criteria (the backend sends the keys)
const CRITERIA_LABELS = {
  factual_accuracy: "Factual accuracy",
  relevance: "Relevance",
  actionability: "Actionability",
  completeness: "Completeness",
};

// The rubric, shown under "What does this score mean?".
// A short copy of JUDGE_RUBRIC in backend/prompts.py: keep them in sync.
const RUBRIC = {
  factual_accuracy: {
    5: "Every claim (skills, jobs, numbers, errors, quoted lines) can be found in the CV.",
    3: "Mostly correct, but 1-2 small claims are not supported by the CV.",
    1: "Invents skills, jobs, numbers or errors, or quotes lines that are not in the CV.",
  },
  relevance: {
    5: "Almost every point is linked to this role or job ad.",
    3: "A mix of role-specific points and generic CV advice.",
    1: "Generic advice that would fit any CV and any job.",
  },
  actionability: {
    5: "Every tip says exactly what to change and how; rewrites are clearly better.",
    3: "Some tips are concrete, others vague.",
    1: "Vague tips only, nothing you can act on.",
  },
  completeness: {
    5: "Content, clarity, formatting, errors, skills and rewrites are all covered well.",
    3: "All parts are there, but 1-2 are thin or missed obvious problems.",
    1: "Several parts are missing, empty or meaningless.",
  },
};

// One criterion: score bar, reasons, issues, and the rubric on demand
function CriterionCard({ c }) {
  const [showRubric, setShowRubric] = useState(false);
  return (
    <div className="meter">
      <div className="meter-head">
        <h3>{CRITERIA_LABELS[c.criterion]}</h3>
        <span>{c.score}/5</span>
      </div>
      <div className="meter-bar"><span style={{ width: `${c.score * 20}%` }} /></div>
      <p className="quality-why">{c.justification}</p>
      {c.issues.length > 0 && (
        <ul className="quality-issues">{c.issues.map((issue, i) => <li key={i}>{issue}</li>)}</ul>
      )}

      <button className="btn-link-small rubric-toggle" onClick={() => setShowRubric(!showRubric)} aria-expanded={showRubric}>
        {showRubric ? "Hide the rubric" : "What does this score mean?"}
      </button>
      {showRubric && (
        <ul className="rubric">
          {[5, 3, 1].map((level) => (
            // Highlight the line(s) closest to the score: a 4 is between 3 and 5, so both light up
            <li key={level} className={Math.abs(level - c.score) <= 1 ? "near" : ""}>
              <strong>{level}</strong> {RUBRIC[c.criterion][level]}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// "Review quality" section: the result of the second AI (LLM-as-a-judge)
function ReviewQuality({ evaluation }) {
  return (
    <div className="block quality">
      <h3>Review quality</h3>
      <p className="legend">A second AI checked this review against your CV, using a fixed rubric.</p>

      <div className="result-top">
        <ScoreRing score={evaluation.overall_score} max={5} label="Average of 4 checks" />
        <div>
          <span className={evaluation.passed ? "pass-badge pass" : "pass-badge fail"}>
            {evaluation.passed ? "Passed" : "Not passed"}
          </span>
          <p className="lead">
            {evaluation.passed
              ? "This review is well supported by your CV. You can trust its advice."
              : "Some parts of this review are weak. Read the issues below before you follow its advice."}
          </p>
          <p className="legend">Passed = every check scores 3 or higher (out of 5).</p>
        </div>
      </div>

      <div className="quality-list">
        {evaluation.criteria.map((c) => <CriterionCard key={c.criterion} c={c} />)}
      </div>
    </div>
  );
}

// onBuildPlan comes from App.jsx (see "lifting state up" there)
export default function CVReviewer({ onBuildPlan }) {
  // Inputs
  const [jobRole, setJobRole] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [cv, setCv] = useState(EMPTY_CV); // { mode, file, text }, see CVInput.jsx
  const [evaluate, setEvaluate] = useState(false); // run the LLM-as-a-judge check too?

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
    form.append("evaluate", evaluate ? "true" : "false"); // FastAPI turns this into a bool

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

        {/* Only there if the checkbox was ticked */}
        {review.evaluation && <ReviewQuality evaluation={review.evaluation} />}

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

      <label className="check">
        <input type="checkbox" checked={evaluate} onChange={(e) => setEvaluate(e.target.checked)} />
        <span>
          Quality check with a second AI (LLM-as-a-judge)
          <small>Takes about twice as long. A second AI checks the review against your CV.</small>
        </span>
      </label>

      <button className="btn btn-primary btn-lg" onClick={reviewCV} disabled={loading}>
        {loading ? (evaluate ? "Reviewing and checking…" : "Reviewing your CV…") : "Review my CV"}
      </button>
      {error && <p className="error">{error}</p>}
    </div>
  );
}
