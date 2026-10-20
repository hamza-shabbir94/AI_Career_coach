import { useState } from "react";
import { postJson } from "./api";
import LoadingSteps from "./LoadingSteps";
import { loadJSON, saveJSON } from "./storage";

const WORK_TYPES = [
  { id: "any", label: "Any" },
  { id: "remote", label: "Remote" },
  { id: "hybrid", label: "Hybrid" },
  { id: "on-site", label: "On-site" },
];
const LEVELS = [
  { id: "any", label: "Any" },
  { id: "entry", label: "Entry" },
  { id: "junior", label: "Junior" },
  { id: "mid", label: "Mid" },
  { id: "senior", label: "Senior" },
];
// Filter chips above the results
const FILTERS = [
  { id: "all", label: "All" },
  { id: "checked", label: "Checked links" },
  { id: "saved", label: "Saved" },
  { id: "remote", label: "Remote" },
  { id: "hybrid", label: "Hybrid" },
  { id: "on-site", label: "On-site" },
];
const LOADING_STEPS = ["Searching job boards", "Reading job ads", "Checking links"];
const SAVED_KEY = "career-coach:saved-jobs"; // where saved jobs live in localStorage

// A unique id for a job (the link, or title + company if there is no link)
function jobKey(job) {
  return job.url || `${job.title}|${job.company}`;
}

// A Google search for the job: a safe fallback when we could not check the AI's link
function searchUrl(job) {
  return `https://www.google.com/search?q=${encodeURIComponent(`${job.title} ${job.company} job`)}`;
}

// Turn a job card into text for the Job fit tab (it needs a job ad of 50+ characters)
function jobToText(job) {
  return [
    `${job.title} at ${job.company} (${job.location}, ${job.work_type})`,
    job.summary,
    "Requirements:",
    ...job.key_requirements.map((r) => `- ${r}`),
  ].join("\n");
}

// Does the job contain the word the user typed? (title, company, location, summary, requirements)
function matchesWord(job, word) {
  const text = [job.title, job.company, job.location, job.summary, ...job.key_requirements].join(" ");
  return text.toLowerCase().includes(word.trim().toLowerCase());
}

// One job card. Compact by default; "Show details" opens the rest.
function JobCard({ job, saved, onToggleSave, onCheckFit }) {
  const [open, setOpen] = useState(false);

  return (
    <article className="job">
      <div className="job-head">
        <div>
          <h3>{job.title}</h3>
          <p className="job-company">{job.company}</p>
        </div>
        <div className="job-head-right">
          <span className={job.verified ? "status met" : "status partial"}>
            {job.verified ? "Checked link" : "Link not checked"}
          </span>
          <button
            className={saved ? "save-btn on" : "save-btn"}
            onClick={() => onToggleSave(job)}
            aria-pressed={saved}
            aria-label={saved ? "Remove from saved jobs" : "Save this job"}
            title={saved ? "Remove from saved jobs" : "Save this job"}
          >
            {saved ? "★" : "☆"}
          </button>
        </div>
      </div>

      <p className="job-meta">{job.location} · {job.work_type} · posted {job.posted}</p>

      {open && (
        <div className="job-details">
          <p>{job.summary}</p>
          <div className="chips">
            {job.key_requirements.map((r, j) => <span key={j} className="chip small have">{r}</span>)}
          </div>
          <p className="job-why">{job.why_relevant}</p>
        </div>
      )}

      <div className="actions">
        {job.verified ? (
          // noopener noreferrer: the new tab cannot control or track this page
          <a className="btn btn-primary" href={job.url} target="_blank" rel="noopener noreferrer">Open job ad</a>
        ) : (
          <a className="btn btn-primary" href={searchUrl(job)} target="_blank" rel="noopener noreferrer">Search for this job</a>
        )}
        <button
          className="btn btn-highlight"
          onClick={() => onCheckFit({ job_role: job.title, job_description: jobToText(job) })}
        >
          Check my fit
        </button>
        <button className="btn-link-small" onClick={() => setOpen(!open)} aria-expanded={open}>
          {open ? "Hide details" : "Show details"}
        </button>
        {!job.verified && job.url && (
          <a className="btn-link-small" href={job.url} target="_blank" rel="noopener noreferrer">
            AI's link (may not work)
          </a>
        )}
      </div>
    </article>
  );
}

// onCheckFit comes from App.jsx (see "lifting state up" there)
export default function JobSearch({ onCheckFit }) {
  // Inputs
  const [jobRole, setJobRole] = useState("");
  const [location, setLocation] = useState("");
  const [workType, setWorkType] = useState("any");
  const [level, setLevel] = useState("any");
  const [aboutMe, setAboutMe] = useState("");

  // Result + UI state
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Filters on the result screen
  const [filter, setFilter] = useState("all");
  const [word, setWord] = useState("");

  // Saved jobs: loaded once from localStorage (the function runs only on the first render)
  const [savedJobs, setSavedJobs] = useState(() => loadJSON(SAVED_KEY, []));
  const savedKeys = savedJobs.map(jobKey);

  function toggleSave(job) {
    const next = savedKeys.includes(jobKey(job))
      ? savedJobs.filter((j) => jobKey(j) !== jobKey(job)) // remove it
      : [...savedJobs, job];                              // add it
    setSavedJobs(next);
    saveJSON(SAVED_KEY, next); // remember it after a refresh
  }

  async function search() {
    if (!jobRole.trim()) return setError("Enter the job you are looking for.");

    setLoading(true);
    setError("");
    try {
      const data = await postJson("/jobs/search", {
        job_role: jobRole,
        location,
        work_type: workType,
        level,
        about_me: aboutMe,
      });
      setResult(data);
      setFilter("all");
      setWord("");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  // Shared props for every job card
  const cardProps = (job) => ({
    job,
    saved: savedKeys.includes(jobKey(job)),
    onToggleSave: toggleSave,
    onCheckFit,
  });

  // ---------- RESULT ----------
  if (result) {
    const verifiedCount = result.jobs.filter((j) => j.verified).length;

    // "Saved" shows ALL saved jobs (also from earlier searches); the others filter this search
    let shown = filter === "saved" ? savedJobs : result.jobs;
    if (filter === "checked") shown = shown.filter((j) => j.verified);
    if (["remote", "hybrid", "on-site"].includes(filter)) {
      shown = shown.filter((j) => j.work_type.toLowerCase() === filter);
    }
    if (word.trim()) shown = shown.filter((j) => matchesWord(j, word));

    // How many jobs each chip would show (the number on the chip)
    const counts = {
      all: result.jobs.length,
      checked: verifiedCount,
      saved: savedJobs.length,
      remote: result.jobs.filter((j) => j.work_type.toLowerCase() === "remote").length,
      hybrid: result.jobs.filter((j) => j.work_type.toLowerCase() === "hybrid").length,
      "on-site": result.jobs.filter((j) => j.work_type.toLowerCase() === "on-site").length,
    };

    return (
      <div className="pane">
        <div>
          <h2 className="result-title">Jobs for {jobRole}</h2>
          <p className="lead">
            {result.jobs.length === 0
              ? "No jobs found. Try a broader role or location."
              : `Found ${result.jobs.length} jobs, ${verifiedCount} with a checked link.`}
          </p>
        </div>

        <p className="hint">
          <strong>Checked link</strong> = the link is a page the web search really found.
          Jobs can close quickly, so always check the ad before you apply. Click ☆ to save a job.
        </p>

        {/* Filter bar */}
        <div className="filter-bar">
          <div className="filter-chips" role="group" aria-label="Filter jobs">
            {FILTERS.map((f) => (
              <button
                key={f.id}
                className={filter === f.id ? "filter-chip on" : "filter-chip"}
                onClick={() => setFilter(f.id)}
                aria-pressed={filter === f.id}
              >
                {f.label} <span>{counts[f.id]}</span>
              </button>
            ))}
          </div>
          <input
            className="filter-word"
            value={word}
            onChange={(e) => setWord(e.target.value)}
            placeholder="Filter by word, e.g. Python"
            aria-label="Filter by word"
          />
        </div>

        <p className="legend">
          Showing {shown.length} of {filter === "saved" ? savedJobs.length : result.jobs.length}
          {filter === "saved" && " saved jobs (from all your searches)"}
        </p>

        <div className="job-list">
          {shown.map((job) => <JobCard key={jobKey(job)} {...cardProps(job)} />)}
          {shown.length === 0 && (
            <p className="empty">
              {filter === "saved" ? "No saved jobs yet. Click ☆ on a job to save it." : "No jobs match this filter."}
            </p>
          )}
        </div>

        {result.search_tips.length > 0 && (
          <div className="todo">
            <h3>Find more jobs like these</h3>
            <ol>{result.search_tips.map((t, i) => <li key={i}>{t}</li>)}</ol>
          </div>
        )}

        {result.sources.length > 0 && (
          <details className="memory">
            <summary>All pages the search used ({result.sources.length})</summary>
            <ul className="sources">
              {result.sources.map((s) => (
                <li key={s.url}><a href={s.url} target="_blank" rel="noopener noreferrer">{s.title}</a></li>
              ))}
            </ul>
          </details>
        )}

        <button className="btn btn-primary" onClick={() => setResult(null)}>New search</button>
      </div>
    );
  }

  // ---------- FORM ----------
  return (
    <div className="pane">
      <div className="pane-head">
        <h2>Which job are you looking for?</h2>
        <p>The AI searches job boards and career pages for current job ads.</p>
      </div>

      <div className="split">
        <div className="field">
          <label htmlFor="js-role">Job title</label>
          <input
            id="js-role"
            value={jobRole}
            maxLength={100}
            onChange={(e) => setJobRole(e.target.value)}
            placeholder="e.g. Junior AI Engineer"
          />
        </div>
        <div className="field">
          <label htmlFor="js-location">Location <span className="optional">optional</span></label>
          <input
            id="js-location"
            value={location}
            maxLength={100}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="e.g. Berlin, or Germany"
          />
        </div>
      </div>

      <div className="field">
        <span className="label">Work type</span>
        <div className="switch switch-wrap" role="group" aria-label="Work type">
          {WORK_TYPES.map((w) => (
            <button key={w.id} className={workType === w.id ? "on" : ""} onClick={() => setWorkType(w.id)}>{w.label}</button>
          ))}
        </div>
      </div>

      <div className="field">
        <span className="label">Level</span>
        <div className="switch switch-wrap" role="group" aria-label="Level">
          {LEVELS.map((l) => (
            <button key={l.id} className={level === l.id ? "on" : ""} onClick={() => setLevel(l.id)}>{l.label}</button>
          ))}
        </div>
      </div>

      <div className="field">
        <label htmlFor="js-about">About you <span className="optional">optional</span></label>
        <textarea
          id="js-about"
          rows={3}
          maxLength={3000}
          value={aboutMe}
          onChange={(e) => setAboutMe(e.target.value)}
          placeholder="Your main skills and experience, e.g. Python, SQL, 1 year as a data analyst"
        />
      </div>

      {!loading && <p className="hint">Web search takes 20-40 seconds. Keep this tab open.</p>}

      <button className="btn btn-primary btn-lg" onClick={search} disabled={loading}>
        {loading ? "Searching for jobs…" : "Find jobs"}
      </button>
      {loading && <LoadingSteps steps={LOADING_STEPS} />}
      {error && <p className="error">{error}</p>}

      {/* Saved jobs stay in this browser, so you can find them again after a refresh */}
      {savedJobs.length > 0 && (
        <div className="block saved-jobs">
          <h3>Your saved jobs ({savedJobs.length})</h3>
          <div className="job-list">
            {savedJobs.map((job) => <JobCard key={jobKey(job)} {...cardProps(job)} />)}
          </div>
        </div>
      )}
    </div>
  );
}
