import { useEffect, useState } from "react";
import { postJson } from "./api";

const LEVELS = [
  { id: "beginner", label: "Beginner" },
  { id: "some experience", label: "Some experience" },
  { id: "experienced", label: "Experienced" },
];
const WEEK_OPTIONS = [4, 8, 12];
const MAX_GAPS = 12;           // same limit as the backend
const MAX_CONTEXT_CHARS = 5000;

// Remove empty items and duplicates, keep at most MAX_GAPS
function cleanGaps(list) {
  const result = [];
  const seen = new Set(); // lower-case versions we already have
  for (const item of list) {
    const gap = item.trim();
    if (gap && !seen.has(gap.toLowerCase())) {
      seen.add(gap.toLowerCase());
      result.push(gap);
    }
  }
  return result.slice(0, MAX_GAPS);
}

// `seed` comes from App.jsx when another feature clicks "Build my learning plan"
export default function RoadmapBuilder({ seed }) {
  // Inputs
  const [jobRole, setJobRole] = useState("");
  const [level, setLevel] = useState("beginner");
  const [hoursPerWeek, setHoursPerWeek] = useState(8);
  const [weeks, setWeeks] = useState(8);
  const [gaps, setGaps] = useState([]);
  const [newGap, setNewGap] = useState("");
  const [context, setContext] = useState("");

  // Result + UI state
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // When a new seed arrives, fill in the form (and go back from an old result to the form)
  useEffect(() => {
    if (!seed) return;
    setJobRole(seed.job_role || "");
    setGaps(cleanGaps(seed.gaps || []));
    setContext((seed.context || "").slice(0, MAX_CONTEXT_CHARS));
    setResult(null);
    setError("");
  }, [seed]);

  function addGap() {
    if (!newGap.trim()) return;
    if (gaps.length >= MAX_GAPS) return setError(`You can add up to ${MAX_GAPS} gaps.`);
    setGaps(cleanGaps([...gaps, newGap]));
    setNewGap("");
    setError("");
  }

  function removeGap(index) {
    setGaps(gaps.filter((_, i) => i !== index));
  }

  // Enter in the "add a gap" box adds it
  function onGapKey(e) {
    if (e.key === "Enter") {
      e.preventDefault();
      addGap();
    }
  }

  async function buildPlan() {
    if (!jobRole.trim()) return setError("Enter the role you are learning for.");
    if (!(hoursPerWeek >= 2 && hoursPerWeek <= 40)) return setError("Hours per week must be between 2 and 40.");

    setLoading(true);
    setError("");
    try {
      const data = await postJson("/roadmap", {
        job_role: jobRole,
        level,
        hours_per_week: hoursPerWeek,
        weeks,
        gaps,
        context,
      });
      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  // ---------- RESULT ----------
  if (result) {
    const { roadmap, total_hours, warnings } = result;
    return (
      <div className="pane">
        <div>
          <h2 className="result-title">Your plan: {jobRole}</h2>
          <p className="lead">{roadmap.summary}</p>
          <p className="plan-stats">
            {roadmap.weeks.length} weeks · {total_hours} hours in total · {hoursPerWeek} h per week
          </p>
        </div>

        {warnings.length > 0 && (
          <div className="hint">
            <strong>Check before you start:</strong>
            <ul>{warnings.map((w, i) => <li key={i}>{w}</li>)}</ul>
          </div>
        )}

        <ol className="timeline">
          {roadmap.weeks.map((w) => (
            <li key={w.week_number} className="week">
              <span className="week-num">{w.week_number}</span>
              <div className="week-card">
                <h3>{w.focus}</h3>
                <ul className="tasks">
                  {w.tasks.map((t, i) => (
                    <li key={i}>
                      <span className={`task-tag ${t.type}`}>{t.type}</span>
                      <span className="task-title">{t.title}</span>
                      <span className="task-hours">{t.hours} h</span>
                    </li>
                  ))}
                </ul>
                <p className="milestone"><strong>Milestone:</strong> {w.milestone}</p>
              </div>
            </li>
          ))}
        </ol>

        <div className="todo">
          <h3>Portfolio project: {roadmap.portfolio_project.title}</h3>
          <p>{roadmap.portfolio_project.description}</p>
        </div>

        <div className="block">
          <h3>Resources</h3>
          <ul>
            {roadmap.resources.map((r, i) => (
              <li key={i}><strong>{r.name}</strong>: {r.why}</li>
            ))}
          </ul>
          <p className="legend">Search for these by name. The AI gives no links, because it can invent fake ones.</p>
        </div>

        <button className="btn btn-primary" onClick={() => setResult(null)}>Change my plan</button>
      </div>
    );
  }

  // ---------- FORM ----------
  return (
    <div className="pane">
      <div className="pane-head">
        <h2>What do you want to learn?</h2>
        <p>Get a week-by-week plan that fits your time, with one portfolio project.</p>
      </div>

      <div className="field">
        <label htmlFor="rm-role">Role</label>
        <input
          id="rm-role"
          value={jobRole}
          maxLength={100}
          onChange={(e) => setJobRole(e.target.value)}
          placeholder="e.g. Junior AI Engineer"
        />
      </div>

      <div className="field">
        <span className="label">Your level</span>
        <div className="switch" role="group" aria-label="Your level">
          {LEVELS.map((l) => (
            <button key={l.id} className={level === l.id ? "on" : ""} onClick={() => setLevel(l.id)}>{l.label}</button>
          ))}
        </div>
      </div>

      <div className="plan-row">
        <div className="field">
          <label htmlFor="rm-hours">Hours per week</label>
          <input
            id="rm-hours"
            type="number"
            min={2}
            max={40}
            value={hoursPerWeek}
            onChange={(e) => setHoursPerWeek(Number(e.target.value))}
          />
        </div>
        <div className="field">
          <span className="label">Number of weeks</span>
          <div className="switch" role="group" aria-label="Number of weeks">
            {WEEK_OPTIONS.map((n) => (
              <button key={n} className={weeks === n ? "on" : ""} onClick={() => setWeeks(n)}>{n} weeks</button>
            ))}
          </div>
        </div>
      </div>

      <div className="field">
        <label htmlFor="rm-gap">Skills to work on <span className="optional">optional, up to {MAX_GAPS}</span></label>
        {gaps.length > 0 && (
          <ul className="gap-list">
            {gaps.map((g, i) => (
              <li key={g}>
                <span>{g}</span>
                <button className="gap-remove" onClick={() => removeGap(i)} aria-label={`Remove ${g}`}>✕</button>
              </li>
            ))}
          </ul>
        )}
        <div className="gap-add">
          <input
            id="rm-gap"
            value={newGap}
            onChange={(e) => setNewGap(e.target.value)}
            onKeyDown={onGapKey}
            placeholder="e.g. SQL joins, then press Enter"
          />
          <button className="btn btn-primary" onClick={addGap}>Add</button>
        </div>
      </div>

      <div className="field">
        <label htmlFor="rm-context">Background <span className="optional">optional</span></label>
        <textarea
          id="rm-context"
          rows={3}
          maxLength={MAX_CONTEXT_CHARS}
          value={context}
          onChange={(e) => setContext(e.target.value)}
          placeholder="Anything that helps, e.g. what you already know or your CV feedback"
        />
      </div>

      <button className="btn btn-primary btn-lg" onClick={buildPlan} disabled={loading}>
        {loading ? "Building your plan…" : "Build my plan"}
      </button>
      {error && <p className="error">{error}</p>}
    </div>
  );
}
