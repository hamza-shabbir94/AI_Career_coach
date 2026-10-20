import { useEffect, useState } from "react";
import { postJson } from "./api";
import { loadJSON, saveJSON } from "./storage";

const LEVELS = [
  { id: "beginner", label: "Beginner" },
  { id: "some experience", label: "Some experience" },
  { id: "experienced", label: "Experienced" },
];
const WEEK_OPTIONS = [4, 8, 12];
const MAX_GAPS = 12;           // same limit as the backend
const MAX_CONTEXT_CHARS = 5000;
const PLAN_KEY = "career-coach:learning-plan"; // the last plan + ticked tasks, in localStorage

// Each task gets an id like "3-1" (week 3, task 2), to remember which ones are done
function taskId(week, index) {
  return `${week.week_number}-${index}`;
}

// Tasks and hours done in one week
function weekStats(week, done) {
  let tasksDone = 0;
  let hoursDone = 0;
  let hours = 0;
  week.tasks.forEach((t, i) => {
    hours += t.hours;
    if (done.includes(taskId(week, i))) {
      tasksDone += 1;
      hoursDone += t.hours;
    }
  });
  return { tasksDone, tasks: week.tasks.length, hoursDone, hours };
}

// The first week that is not finished yet (this one is open by default)
function firstOpenWeek(roadmap, done) {
  const week = roadmap.weeks.find((w) => {
    const st = weekStats(w, done);
    return st.tasksDone < st.tasks;
  });
  return (week || roadmap.weeks[roadmap.weeks.length - 1])?.week_number;
}

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

  // The plan: { result, jobRole, hoursPerWeek, done } (done = ids of ticked tasks).
  // Loaded from localStorage on the first render, so it survives a page refresh.
  const [plan, setPlan] = useState(() => loadJSON(PLAN_KEY, null));
  const [showPlan, setShowPlan] = useState(plan !== null); // false = show the form
  const [openWeeks, setOpenWeeks] = useState(() =>
    plan ? [firstOpenWeek(plan.result.roadmap, plan.done)] : []
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Change the plan AND save it in the browser (null = delete it)
  function updatePlan(next) {
    setPlan(next);
    saveJSON(PLAN_KEY, next);
  }

  // When a new seed arrives, fill in the form (your saved plan stays, see the banner)
  useEffect(() => {
    if (!seed) return;
    setJobRole(seed.job_role || "");
    setGaps(cleanGaps(seed.gaps || []));
    setContext((seed.context || "").slice(0, MAX_CONTEXT_CHARS));
    setShowPlan(false);
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

  // Tick / untick a task
  function toggleTask(id) {
    const done = plan.done.includes(id) ? plan.done.filter((x) => x !== id) : [...plan.done, id];
    updatePlan({ ...plan, done });
  }

  // Open / close a week
  function toggleWeek(n) {
    setOpenWeeks(openWeeks.includes(n) ? openWeeks.filter((x) => x !== n) : [...openWeeks, n]);
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
      // A new plan replaces the old one, with nothing ticked yet
      updatePlan({ result: data, jobRole, hoursPerWeek, done: [] });
      setOpenWeeks([data.roadmap.weeks[0]?.week_number]);
      setShowPlan(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  // ---------- RESULT ----------
  if (plan && showPlan) {
    const { roadmap, total_hours, warnings } = plan.result;

    // Progress for the whole plan
    const allStats = roadmap.weeks.map((w) => weekStats(w, plan.done));
    const tasksDone = allStats.reduce((sum, st) => sum + st.tasksDone, 0);
    const tasksTotal = allStats.reduce((sum, st) => sum + st.tasks, 0);
    const hoursDone = allStats.reduce((sum, st) => sum + st.hoursDone, 0);
    const progress = tasksTotal === 0 ? 0 : Math.round((tasksDone / tasksTotal) * 100);

    return (
      <div className="pane">
        <div>
          <h2 className="result-title">Your plan: {plan.jobRole}</h2>
          <p className="lead">{roadmap.summary}</p>
          <p className="plan-stats">
            {roadmap.weeks.length} weeks · {total_hours} hours in total · {plan.hoursPerWeek} h per week
          </p>
        </div>

        <div className="progress-box">
          <div className="meter-head">
            <h3>Your progress</h3>
            <span>{progress}%</span>
          </div>
          <div className="meter-bar progress"><span style={{ width: `${progress}%` }} /></div>
          <p className="legend">
            {tasksDone} of {tasksTotal} tasks · {hoursDone} of {total_hours} hours done.
            Tick tasks as you go. Your progress is saved in this browser.
          </p>
        </div>

        {warnings.length > 0 && (
          <div className="hint">
            <strong>Check before you start:</strong>
            <ul>{warnings.map((w, i) => <li key={i}>{w}</li>)}</ul>
          </div>
        )}

        <ol className="timeline">
          {roadmap.weeks.map((w, wi) => {
            const st = allStats[wi];
            const complete = st.tasks > 0 && st.tasksDone === st.tasks;
            const open = openWeeks.includes(w.week_number);
            return (
              <li key={w.week_number} className={complete ? "week complete" : "week"}>
                <span className="week-num">{complete ? "✓" : w.week_number}</span>
                <div className="week-card">
                  {/* Click the header to open or close the week */}
                  <button className="week-toggle" onClick={() => toggleWeek(w.week_number)} aria-expanded={open}>
                    <span>
                      <strong className="week-focus">{w.focus}</strong>
                      <span className="week-sub">
                        Week {w.week_number} · {st.tasksDone}/{st.tasks} tasks · {st.hours} h
                      </span>
                    </span>
                    <span className={open ? "chevron open" : "chevron"} aria-hidden="true">▾</span>
                  </button>
                  <div className="mini-bar">
                    <span style={{ width: `${st.tasks ? (st.tasksDone / st.tasks) * 100 : 0}%` }} />
                  </div>

                  {open && (
                    <>
                      <ul className="tasks">
                        {w.tasks.map((t, i) => {
                          const id = taskId(w, i);
                          const isDone = plan.done.includes(id);
                          return (
                            <li key={i} className={isDone ? "done" : ""}>
                              <input
                                type="checkbox"
                                checked={isDone}
                                onChange={() => toggleTask(id)}
                                aria-label={`Done: ${t.title}`}
                              />
                              <span className={`task-tag ${t.type}`}>{t.type}</span>
                              <span className="task-title">{t.title}</span>
                              <span className="task-hours">{t.hours} h</span>
                            </li>
                          );
                        })}
                      </ul>
                      <p className="milestone"><strong>Milestone:</strong> {w.milestone}</p>
                    </>
                  )}
                </div>
              </li>
            );
          })}
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

        <button className="btn btn-primary" onClick={() => setShowPlan(false)}>Make a new plan</button>
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

      {plan && (
        <div className="company-banner">
          <p>You have a saved plan for <strong>{plan.jobRole}</strong>. A new plan will replace it.</p>
          <span className="actions">
            <button className="btn-link-small" onClick={() => setShowPlan(true)}>Open my plan</button>
            <button className="btn-link-small" onClick={() => updatePlan(null)}>Delete it</button>
          </span>
        </div>
      )}

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
