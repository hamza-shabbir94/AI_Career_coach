import { useRef, useState } from "react";
import Hero from "./Hero";
import InterviewMode from "./InterviewMode";
import CVReviewer from "./CVReviewer";
import JobFit from "./JobFit";
import CompanyPrep from "./CompanyPrep";
import RoadmapBuilder from "./RoadmapBuilder";
import "./styles.css";

// The five features, shown as tabs. The nav uses this list too.
const TABS = [
  { id: "interview", label: "Mock interview", hint: "5 questions, then a score" },
  { id: "cv", label: "CV review", hint: "Upload or paste your CV" },
  { id: "fit", label: "Job fit", hint: "Your match % for a job ad" },
  { id: "company", label: "Company prep", hint: "Web research + likely questions" },
  { id: "roadmap", label: "Learning plan", hint: "Week-by-week, fits your time" },
];

// "How it works" really is a sequence, so the steps are numbered
const STEPS = [
  { title: "Name the role", text: "Type the job you want. Paste the job ad for sharper questions and feedback." },
  { title: "Answer or upload", text: "Answer 5 interview questions, or upload your CV as PDF, Word or text." },
  { title: "Get clear fixes", text: "See your score, what worked, what didn't, and exactly what to change." },
];

export default function App() {
  const [tab, setTab] = useState("interview");
  const workspaceRef = useRef(null);

  // "Lifting state up": the CV review, Job fit and Interview screens cannot talk to the
  // Learning plan screen directly, so App (their shared parent) keeps the data for them.
  // roadmapSeed = { job_role, gaps, context } to pre-fill the Learning plan form.
  const [roadmapSeed, setRoadmapSeed] = useState(null);
  // interviewSeed = { job_role, company, company_notes, job_description } from Company prep.
  const [interviewSeed, setInterviewSeed] = useState(null);

  // Used by the hero buttons and the nav: pick a tab and scroll to the app
  function openTab(id) {
    setTab(id);
    workspaceRef.current?.scrollIntoView({ behavior: "smooth" });
  }

  // Passed DOWN as a prop. A child calls it to send its results UP to App.
  function buildPlan(seed) {
    setRoadmapSeed(seed); // a new object each click, so RoadmapBuilder always notices it
    openTab("roadmap");
  }

  // Same idea: Company prep calls this to start a mock interview for that company
  function practiseInterview(seed) {
    setInterviewSeed(seed);
    openTab("interview");
  }

  return (
    <>
      <nav className="nav">
        <div className="nav-inner">
          <a className="logo" href="#top">
            <span className="logo-mark">C</span> Career Coach
          </a>
          <div className="nav-links">
            {TABS.map((t) => (
              <button key={t.id} onClick={() => openTab(t.id)}>{t.label}</button>
            ))}
          </div>
        </div>
      </nav>

      <main id="top">
        <Hero onStart={openTab} />

        <section className="steps">
          <h2>How it works</h2>
          <ol className="steps-list">
            {STEPS.map((s, i) => (
              <li key={s.title}>
                <span className="step-num">{i + 1}</span>
                <h3>{s.title}</h3>
                <p>{s.text}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="workspace" ref={workspaceRef}>
          <div className="tabs" role="tablist">
            {TABS.map((t) => (
              <button
                key={t.id}
                role="tab"
                aria-selected={tab === t.id}
                className={tab === t.id ? "tab active" : "tab"}
                onClick={() => setTab(t.id)}
              >
                <strong>{t.label}</strong>
                <span>{t.hint}</span>
              </button>
            ))}
          </div>

          {/* All stay mounted, so switching tabs does not lose your progress */}
          <div className="sheet">
            <div hidden={tab !== "interview"}><InterviewMode onBuildPlan={buildPlan} seed={interviewSeed} /></div>
            <div hidden={tab !== "cv"}><CVReviewer onBuildPlan={buildPlan} /></div>
            <div hidden={tab !== "fit"}><JobFit onBuildPlan={buildPlan} /></div>
            <div hidden={tab !== "company"}><CompanyPrep onPractise={practiseInterview} /></div>
            <div hidden={tab !== "roadmap"}><RoadmapBuilder seed={roadmapSeed} /></div>
          </div>
        </section>
      </main>

      <footer className="footer">
        <p>Built with FastAPI, React and OpenAI for the Ironhack AI Engineer Bootcamp.</p>
        <p>Feedback is AI-generated. Use it as practice, not as a final judgement.</p>
      </footer>
    </>
  );
}
