import { useEffect, useState } from "react";
import { postForm } from "./api";
import ScoreRing from "./ScoreRing";
import CVInput, { EMPTY_CV, addCVToForm, checkCV } from "./CVInput";

// Biggest gaps first: missing -> partial -> met
const STATUS_ORDER = { missing: 0, partial: 1, met: 2 };
const STATUS_LABEL = { missing: "Missing", partial: "Partly", met: "Met" };

// The SAME formula as calculate_match() in backend/routes/job_fit.py.
// If you change one, change the other! Used here only for the "what if" score.
const WEIGHTS = { "must-have": 2, "nice-to-have": 1 };
const CREDIT = { met: 1, partial: 0.5, missing: 0 };

// closed = the requirements the user ticked: we count them as "met"
function matchPercent(reqs, closed) {
  let possible = 0;
  let earned = 0;
  reqs.forEach((r, i) => {
    const status = closed.includes(i) ? "met" : r.status;
    possible += WEIGHTS[r.importance];
    earned += WEIGHTS[r.importance] * CREDIT[status];
  });
  return possible === 0 ? 0 : Math.round((earned / possible) * 100);
}

// From App.jsx (see "lifting state up" there):
// - onBuildPlan: send the gaps to the Learning plan tab
// - seed: { job_role, job_description } from Job search ("Check my fit")
export default function JobFit({ onBuildPlan, seed }) {
  // Inputs
  const [jobDescription, setJobDescription] = useState("");
  const [jobRole, setJobRole] = useState("");
  const [cv, setCv] = useState(EMPTY_CV);
  const [fromSearch, setFromSearch] = useState(false); // job ad came from Job search?

  // Result + UI state
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Interactive result: ticked gaps ("what if"), status filter, copied keyword
  const [closed, setClosed] = useState([]);        // indexes (in the sorted list) of ticked gaps
  const [statusFilter, setStatusFilter] = useState("all");
  const [copied, setCopied] = useState("");

  // A new seed from Job search: fill in the job and go back to the form (your CV stays)
  useEffect(() => {
    if (!seed) return;
    setJobDescription(seed.job_description || "");
    setJobRole(seed.job_role || "");
    setFromSearch(true);
    setResult(null);
    setError("");
  }, [seed]);

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
      setClosed([]);           // a new result starts with nothing ticked
      setStatusFilter("all");
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

    // "What if": with nothing ticked we show the backend's score, otherwise our own calculation
    const whatIf = closed.length > 0 ? matchPercent(reqs, closed) : match_percent;

    // Tick / untick a gap
    function toggleClosed(i) {
      setClosed(closed.includes(i) ? closed.filter((x) => x !== i) : [...closed, i]);
    }

    // Copy a keyword, then show "Copied!" for 1.5 seconds
    async function copyKeyword(k) {
      try {
        await navigator.clipboard.writeText(k);
        setCopied(k);
        setTimeout(() => setCopied(""), 1500);
      } catch {
        setCopied(""); // copying can be blocked by the browser; nothing breaks
      }
    }

    // Status filter tabs with counts
    const tabs = [
      { id: "all", label: "All", count: reqs.length },
      { id: "missing", label: "Missing", count: reqs.length - metCount - partialCount },
      { id: "partial", label: "Partly", count: partialCount },
      { id: "met", label: "Met", count: metCount },
    ];

    return (
      <div className="pane">
        <div className="result-top">
          <ScoreRing
            score={whatIf}
            max={100}
            label={closed.length > 0 ? `If you close ${closed.length} gap${closed.length > 1 ? "s" : ""}` : verdict}
          />
          <div>
            <h2>{verdict}</h2>
            <p className="lead">
              You meet {metCount} of {reqs.length} requirements
              {partialCount > 0 && ` and ${partialCount} partly`}.
            </p>
            {closed.length > 0 && (
              <p className="what-if">
                {match_percent}% now → <strong>{whatIf}%</strong> if you close the ticked gaps
                <button className="btn-link-small" onClick={() => setClosed([])}>Reset</button>
              </p>
            )}
            <p className="lead">{analysis.summary}</p>
          </div>
        </div>

        <div className="block">
          <h3>Requirements, biggest gaps first</h3>
          <p className="legend">Tick "I'll work on this" to see how your score would change.</p>

          <div className="switch switch-wrap req-filter" role="group" aria-label="Filter requirements">
            {tabs.map((t) => (
              <button key={t.id} className={statusFilter === t.id ? "on" : ""} onClick={() => setStatusFilter(t.id)}>
                {t.label} ({t.count})
              </button>
            ))}
          </div>

          <ul className="reqs">
            {reqs.map((r, i) =>
              statusFilter !== "all" && r.status !== statusFilter ? null : (
                <li key={i} className={`req ${r.status} ${closed.includes(i) ? "closed" : ""}`}>
                  <div className="req-head">
                    <strong>{r.requirement}</strong>
                    <span className="req-tags">
                      {r.importance === "must-have" && <span className="badge">Must-have</span>}
                      <span className={`status ${r.status}`}>{STATUS_LABEL[r.status]}</span>
                    </span>
                  </div>
                  <p className="req-evidence">{r.evidence}</p>
                  <p className="req-fix">{r.how_to_close}</p>
                  {r.status !== "met" && (
                    <label className="check check-small">
                      <input type="checkbox" checked={closed.includes(i)} onChange={() => toggleClosed(i)} />
                      <span>I'll work on this</span>
                    </label>
                  )}
                </li>
              )
            )}
          </ul>
        </div>

        {analysis.keywords_to_add.length > 0 && (
          <div className="block">
            <h3>Keywords to add</h3>
            <div className="chips">
              {analysis.keywords_to_add.map((k, i) => (
                <button key={i} className="chip add chip-btn" onClick={() => copyKeyword(k)} title="Click to copy">
                  {copied === k ? "Copied!" : k}
                </button>
              ))}
            </div>
            <p className="legend">From the job ad, not in your CV. Click to copy. Only add them if they are true for you.</p>
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

        <div className="actions">
          <button
            className="btn btn-highlight"
            onClick={() => onBuildPlan({
              job_role: jobRole,
              // Only the requirements you do not fully meet yet
              gaps: reqs.filter((r) => r.status !== "met").map((r) => r.requirement),
              context: `Job-fit result (${match_percent}%, ${verdict}): ${analysis.summary}`,
            })}
          >
            Build my learning plan
          </button>
          <button className="btn btn-primary" onClick={() => setResult(null)}>Check another job</button>
        </div>
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
          onChange={(e) => { setJobDescription(e.target.value); setFromSearch(false); }}
          placeholder="Paste the full job ad, including the requirements"
        />
        {fromSearch && (
          <p className="legend">
            This is a short summary from Job search. For a more exact score, paste the full job ad from its link.
          </p>
        )}
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
