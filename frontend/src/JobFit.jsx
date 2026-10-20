import { useState } from "react";
import { postForm } from "./api";
import ScoreRing from "./ScoreRing";
import CVInput, { EMPTY_CV, addCVToForm, checkCV } from "./CVInput";

// Biggest gaps first: missing -> partial -> met
const STATUS_ORDER = { missing: 0, partial: 1, met: 2 };
const STATUS_LABEL = { missing: "Missing", partial: "Partly", met: "Met" };

export default function JobFit() {
  // Inputs
  const [jobDescription, setJobDescription] = useState("");
  const [jobRole, setJobRole] = useState("");
  const [cv, setCv] = useState(EMPTY_CV);

  // Result + UI state
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function checkFit() {
    if (jobDescription.trim().length < 50) return setError("Paste the full job ad (at least 50 characters).");
    const cvError = checkCV(cv);
    if (cvError) return setError(cvError);

    const form = new FormData();
    form.append("job_description", jobDescription);
    form.append("job_role", jobRole);
    addCVToForm(form, cv);

    setLoading(true);
    setError("");
    try {
      setResult(await postForm("/job-fit", form));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  // ---------- RESULT ----------
  if (result) {
    const { analysis, match_percent, verdict } = result;
    const reqs = [...analysis.requirements].sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status]);
    const metCount = reqs.filter((r) => r.status === "met").length;
    const partialCount = reqs.filter((r) => r.status === "partial").length;

    return (
      <div className="pane">
        <div className="result-top">
          <ScoreRing score={match_percent} max={100} label={verdict} />
          <div>
            <h2>{verdict}</h2>
            <p className="lead">
              You meet {metCount} of {reqs.length} requirements
              {partialCount > 0 && ` and ${partialCount} partly`}.
            </p>
            <p className="lead">{analysis.summary}</p>
          </div>
        </div>

        <div className="block">
          <h3>Requirements, biggest gaps first</h3>
          <ul className="reqs">
            {reqs.map((r, i) => (
              <li key={i} className={`req ${r.status}`}>
                <div className="req-head">
                  <strong>{r.requirement}</strong>
                  <span className="req-tags">
                    {r.importance === "must-have" && <span className="badge">Must-have</span>}
                    <span className={`status ${r.status}`}>{STATUS_LABEL[r.status]}</span>
                  </span>
                </div>
                <p className="req-evidence">{r.evidence}</p>
                <p className="req-fix">{r.how_to_close}</p>
              </li>
            ))}
          </ul>
        </div>

        {analysis.keywords_to_add.length > 0 && (
          <div className="block">
            <h3>Keywords to add</h3>
            <div className="chips">
              {analysis.keywords_to_add.map((k, i) => <span key={i} className="chip add">{k}</span>)}
            </div>
            <p className="legend">From the job ad, not in your CV. Only add them if they are true for you.</p>
          </div>
        )}

        <div className="todo">
          <h3>Quick wins</h3>
          <ol>{analysis.quick_wins.map((s, i) => <li key={i}>{s}</li>)}</ol>
        </div>

        <p className="hint">
          <strong>How the score works:</strong> the AI only labels each requirement. The app then
          calculates the score: must-haves count double, "met" gets full credit, "partly" half,
          and "missing" none.
        </p>

        <button className="btn btn-primary" onClick={() => setResult(null)}>Check another job</button>
      </div>
    );
  }

  // ---------- FORM ----------
  return (
    <div className="pane">
      <div className="pane-head">
        <h2>How well do you fit this job?</h2>
        <p>Paste a job ad and add your CV. You get a match score and the gaps to close.</p>
      </div>

      <div className="field">
        <label htmlFor="fit-jd">Job ad</label>
        <textarea
          id="fit-jd"
          rows={6}
          value={jobDescription}
          onChange={(e) => setJobDescription(e.target.value)}
          placeholder="Paste the full job ad, including the requirements"
        />
      </div>

      <div className="field">
        <label htmlFor="fit-role">Role <span className="optional">optional</span></label>
        <input
          id="fit-role"
          value={jobRole}
          onChange={(e) => setJobRole(e.target.value)}
          placeholder="e.g. Junior AI Engineer"
        />
      </div>

      <CVInput value={cv} onChange={setCv} />

      <button className="btn btn-primary btn-lg" onClick={checkFit} disabled={loading}>
        {loading ? "Checking your fit…" : "Check my fit"}
      </button>
      {error && <p className="error">{error}</p>}
    </div>
  );
}
