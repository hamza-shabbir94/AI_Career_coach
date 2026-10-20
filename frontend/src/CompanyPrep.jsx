import { useState } from "react";
import CharCount from "./CharCount";
import { postJson } from "./api";
import LoadingSteps from "./LoadingSteps";

const MAX_NOTES_CHARS = 6000; // same limit as the backend (company_notes in models.py)
const EXAMPLE_COMPANIES = ["Spotify", "Zalando", "SAP", "N26"]; // quick picks under the input
const LOADING_STEPS = ["Searching the web", "Reading news and reviews", "Writing your prep sheet"];

// Turn the prep sheet into short plain-text notes for the mock interviewer
function buildCompanyNotes(analysis) {
  const list = (items) => items.map((item) => `- ${item}`).join("\n");
  const notes = [
    `Overview: ${analysis.overview}`,
    `Culture and values:\n${list(analysis.culture)}`,
    `Likely questions:\n${list(analysis.likely_questions.map((q) => q.question))}`,
  ].join("\n\n");
  return notes.slice(0, MAX_NOTES_CHARS);
}

// onPractise comes from App.jsx (see "lifting state up" there)
export default function CompanyPrep({ onPractise }) {
  // Inputs
  const [company, setCompany] = useState("");
  const [jobRole, setJobRole] = useState("");
  const [jobDescription, setJobDescription] = useState("");

  // Result + UI state
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Interactive result
  const [prepared, setPrepared] = useState([]); // indexes of questions marked as prepared
  const [copied, setCopied] = useState(false);

  // Start the company mock interview (firstQuestion = "Practise this question", optional)
  function practise(firstQuestion = "") {
    onPractise({
      job_role: jobRole,
      company,
      company_notes: buildCompanyNotes(result.analysis),
      job_description: jobDescription,
      first_question: firstQuestion,
    });
  }

  function togglePrepared(i) {
    setPrepared(prepared.includes(i) ? prepared.filter((x) => x !== i) : [...prepared, i]);
  }

  // Copy all "questions to ask" as a list, then show "Copied!" for 1.5 seconds
  async function copyQuestions() {
    try {
      await navigator.clipboard.writeText(result.analysis.questions_to_ask.map((q) => `- ${q}`).join("\n"));
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false); // copying can be blocked by the browser; nothing breaks
    }
  }

  async function prepare() {
    if (!company.trim()) return setError("Enter the company name.");
    if (!jobRole.trim()) return setError("Enter the role you are interviewing for.");

    setLoading(true);
    setError("");
    try {
      const data = await postJson("/company/prep", {
        company,
        job_role: jobRole,
        job_description: jobDescription,
      });
      setResult(data);
      setPrepared([]); // a new prep sheet starts with nothing prepared
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  // ---------- RESULT ----------
  if (result) {
    const { analysis, sources } = result;
    return (
      <div className="pane">
        <div>
          <h2 className="result-title">{company}</h2>
          <p className="lead">{analysis.overview}</p>
        </div>

        <div className="split">
          <div className="note note-plain">
            <h3>Recent news</h3>
            {analysis.recent_news.length > 0 ? (
              <ul>{analysis.recent_news.map((s, i) => <li key={i}>{s}</li>)}</ul>
            ) : (
              <p>No recent news found.</p>
            )}
          </div>
          <div className="note note-plain">
            <h3>Culture</h3>
            <ul>{analysis.culture.map((s, i) => <li key={i}>{s}</li>)}</ul>
          </div>
        </div>

        <div className="block">
          <h3>Questions they will likely ask</h3>
          {/* <details> = a card that opens on click, no JavaScript needed */}
          <p className="legend">
            Prepared {prepared.length} of {analysis.likely_questions.length}. Open a question to see tips.
          </p>
          <div className="mini-bar">
            <span style={{ width: `${(prepared.length / Math.max(analysis.likely_questions.length, 1)) * 100}%` }} />
          </div>
          <div className="qa-list">
            {analysis.likely_questions.map((q, i) => (
              <details key={i} className={prepared.includes(i) ? "qa prepared" : "qa"}>
                <summary>
                  {prepared.includes(i) && <span className="qa-check" aria-label="Prepared">✓</span>}
                  {q.question}
                </summary>
                <p><strong>Why they ask:</strong> {q.why_they_ask}</p>
                <p><strong>How to answer:</strong> {q.how_to_answer}</p>
                <div className="actions qa-actions">
                  <label className="check check-small">
                    <input type="checkbox" checked={prepared.includes(i)} onChange={() => togglePrepared(i)} />
                    <span>Mark as prepared</span>
                  </label>
                  <button className="btn-link-small" onClick={() => practise(q.question)}>
                    Practise this question →
                  </button>
                </div>
              </details>
            ))}
          </div>
        </div>

        <div className="block">
          <div className="field-row">
            <h3>Questions you can ask them</h3>
            <button className="btn-link-small" onClick={copyQuestions}>{copied ? "Copied!" : "Copy all"}</button>
          </div>
          <ul>{analysis.questions_to_ask.map((s, i) => <li key={i}>{s}</li>)}</ul>
        </div>

        <div className="todo">
          <h3>Tips for this interview</h3>
          <ol>{analysis.tips.map((s, i) => <li key={i}>{s}</li>)}</ol>
        </div>

        {sources.length > 0 && (
          <div className="block">
            <h3>Sources</h3>
            <ul className="sources">
              {sources.map((s) => (
                <li key={s.url}>
                  {/* noopener noreferrer: the new tab cannot control or track this page */}
                  <a href={s.url} target="_blank" rel="noopener noreferrer">{s.title}</a>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="actions">
          <button
            className="btn btn-highlight"
            onClick={() => practise()}
          >
            Practise an interview for {company}
          </button>
          <button className="btn btn-primary" onClick={() => setResult(null)}>Prepare for another company</button>
        </div>
      </div>
    );
  }

  // ---------- FORM ----------
  return (
    <div className="pane">
      <div className="pane-head">
        <h2>Which company are you meeting?</h2>
        <p>The AI searches the web and builds a prep sheet with likely questions.</p>
      </div>

      <div className="field">
        <label htmlFor="co-name">Company</label>
        <input
          id="co-name"
          value={company}
          maxLength={100}
          onChange={(e) => setCompany(e.target.value)}
          placeholder="e.g. Spotify"
        />
        <div className="quick">
          {EXAMPLE_COMPANIES.map((c) => (
            <button key={c} className="quick-pick" onClick={() => setCompany(c)}>{c}</button>
          ))}
        </div>
      </div>

      <div className="field">
        <label htmlFor="co-role">Role</label>
        <input
          id="co-role"
          value={jobRole}
          maxLength={100}
          onChange={(e) => setJobRole(e.target.value)}
          placeholder="e.g. Junior AI Engineer"
        />
      </div>

      <div className="field">
        <label htmlFor="co-jd">Job ad <span className="optional">optional</span></label>
        <textarea
          id="co-jd"
          rows={4}
          value={jobDescription}
          onChange={(e) => setJobDescription(e.target.value)}
          placeholder="Paste the job ad for more focused questions"
        />
        <CharCount value={jobDescription} max={20000} />
      </div>

      {!loading && <p className="hint">Web research takes 20-40 seconds. Keep this tab open.</p>}

      <button className="btn btn-primary btn-lg" onClick={prepare} disabled={loading}>
        {loading ? `Researching ${company}…` : "Prepare me"}
      </button>
      {loading && <LoadingSteps steps={LOADING_STEPS} />}
      {error && <p className="error">{error}</p>}
    </div>
  );
}
