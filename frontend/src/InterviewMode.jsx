import { useEffect, useRef, useState } from "react";
import { postJson } from "./api";
import ScoreRing from "./ScoreRing";

// Quick picks so users can start with one click
const EXAMPLE_ROLES = ["Junior AI Engineer", "DevOps Engineer", "Data Analyst", "Product Manager"];

export default function InterviewMode() {
  // Which screen we show: "setup" -> "interview" -> "feedback"
  const [stage, setStage] = useState("setup");

  // Setup inputs
  const [jobRole, setJobRole] = useState("");
  const [jobDescription, setJobDescription] = useState("");

  // Interview state
  const [messages, setMessages] = useState([]); // ONLY for showing the chat on screen
  const [summary, setSummary] = useState("");   // the AI's memory, this is what we send
  const [answer, setAnswer] = useState("");
  const [questionNumber, setQuestionNumber] = useState(0);
  const [maxQuestions, setMaxQuestions] = useState(5);
  const [finished, setFinished] = useState(false);

  // Feedback + UI state
  const [feedback, setFeedback] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const answersGiven = messages.filter((m) => m.role === "user").length;

  // Keep the chat scrolled to the newest message
  const chatEndRef = useRef(null);
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [messages, loading]);

  // Ask the backend for the next question.
  // We send: summary + last question + last answer (NOT the whole chat)
  async function askNext(chat, lastQuestion, lastAnswer, answersCount) {
    setLoading(true);
    setError("");
    try {
      const data = await postJson("/interview/next", {
        job_role: jobRole,
        job_description: jobDescription,
        summary,
        last_question: lastQuestion,
        last_answer: lastAnswer,
        answers_given: answersCount,
      });
      setMessages([...chat, { role: "assistant", content: data.reply }]);
      setSummary(data.summary); // save the updated memory
      setQuestionNumber(data.question_number);
      setMaxQuestions(data.max_questions);
      setFinished(data.finished);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function startInterview() {
    if (!jobRole.trim()) {
      setError("Enter the role you are preparing for.");
      return;
    }
    setStage("interview");
    askNext([], "", "", 0);
  }

  function sendAnswer() {
    if (!answer.trim() || loading) return;
    const lastQuestion = messages[messages.length - 1]?.content || "";
    const chat = [...messages, { role: "user", content: answer.trim() }];
    setMessages(chat); // show my answer right away
    setAnswer("");
    askNext(chat, lastQuestion, answer.trim(), answersGiven + 1);
  }

  // Ctrl+Enter / Cmd+Enter sends the answer
  function onAnswerKey(e) {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) sendAnswer();
  }

  async function getFeedback() {
    setLoading(true);
    setError("");
    try {
      const data = await postJson("/interview/feedback", { job_role: jobRole, summary });
      setFeedback(data);
      setStage("feedback");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function restart() {
    setStage("setup");
    setMessages([]);
    setSummary("");
    setAnswer("");
    setQuestionNumber(0);
    setFinished(false);
    setFeedback(null);
    setError("");
  }

  // ---------- 1. SETUP ----------
  if (stage === "setup") {
    return (
      <div className="pane">
        <div className="pane-head">
          <h2>Which job are you interviewing for?</h2>
          <p>The interviewer will ask 5 questions for this role, one at a time.</p>
        </div>

        <div className="field">
          <label htmlFor="role">Role</label>
          <input
            id="role"
            value={jobRole}
            onChange={(e) => setJobRole(e.target.value)}
            placeholder="e.g. Junior AI Engineer"
          />
          <div className="quick">
            {EXAMPLE_ROLES.map((r) => (
              <button key={r} className="quick-pick" onClick={() => setJobRole(r)}>{r}</button>
            ))}
          </div>
        </div>

        <div className="field">
          <label htmlFor="jd">Job ad <span className="optional">optional</span></label>
          <textarea
            id="jd"
            rows={5}
            value={jobDescription}
            onChange={(e) => setJobDescription(e.target.value)}
            placeholder="Paste the job ad to get questions about its exact requirements"
          />
        </div>

        <button className="btn btn-primary btn-lg" onClick={startInterview}>Start interview</button>
        {error && <p className="error">{error}</p>}
      </div>
    );
  }

  // ---------- 3. FEEDBACK ----------
  if (stage === "feedback" && feedback) {
    return (
      <div className="pane">
        <div className="result-top">
          <ScoreRing score={feedback.score} label={`Interview for ${jobRole}`} />
          <div>
            <h2>Your interview feedback</h2>
            <p className="lead">{feedback.summary}</p>
          </div>
        </div>

        <div className="split">
          <div className="note note-good">
            <h3>What worked</h3>
            <ul>{feedback.strengths.map((s, i) => <li key={i}>{s}</li>)}</ul>
          </div>
          <div className="note note-bad">
            <h3>What held you back</h3>
            <ul>{feedback.weaknesses.map((s, i) => <li key={i}>{s}</li>)}</ul>
          </div>
        </div>

        <div className="todo">
          <h3>Do this next time</h3>
          <ol>{feedback.improvements.map((s, i) => <li key={i}>{s}</li>)}</ol>
        </div>

        <button className="btn btn-primary" onClick={restart}>Practise again</button>
      </div>
    );
  }

  // ---------- 2. INTERVIEW ----------
  return (
    <div className="pane">
      <div className="interview-bar">
        <div>
          <strong>{jobRole}</strong>
          <span>{finished ? "Interview complete" : `Question ${questionNumber} of ${maxQuestions}`}</span>
        </div>
        {/* One segment per question; filled = answered */}
        <div className="segments" aria-label={`${answersGiven} of ${maxQuestions} answered`}>
          {Array.from({ length: maxQuestions }).map((_, i) => (
            <span key={i} className={i < answersGiven ? "seg done" : i === answersGiven ? "seg now" : "seg"} />
          ))}
        </div>
      </div>

      <div className="chat">
        {messages.map((m, i) => (
          <div key={i} className={`msg ${m.role}`}>
            {m.role === "assistant" && <span className="avatar">AI</span>}
            <p className="bubble">{m.content}</p>
          </div>
        ))}
        {loading && (
          <div className="msg assistant">
            <span className="avatar">AI</span>
            <p className="bubble typing"><i /><i /><i /></p>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {!finished ? (
        <div className="composer">
          <textarea
            rows={3}
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            onKeyDown={onAnswerKey}
            placeholder="Type your answer. Ctrl + Enter to send."
            disabled={loading}
          />
          <div className="composer-actions">
            <button className="btn btn-link" onClick={getFeedback} disabled={loading || answersGiven === 0}>
              End and get feedback
            </button>
            <button className="btn btn-primary" onClick={sendAnswer} disabled={loading || !answer.trim()}>
              Send answer
            </button>
          </div>
        </div>
      ) : (
        <button className="btn btn-primary btn-lg" onClick={getFeedback} disabled={loading}>
          {loading ? "Scoring your interview…" : "See my feedback"}
        </button>
      )}

      {/* See what the AI "remembers" (useful for learning/debugging) */}
      <details className="memory">
        <summary>What the interviewer remembers</summary>
        <pre>{summary || "Nothing yet. Notes start after your first answer."}</pre>
      </details>

      {error && <p className="error">{error}</p>}
    </div>
  );
}
