import { useRef, useState } from "react";
import Hero from "./Hero";
import InterviewMode from "./InterviewMode";
import CVReviewer from "./CVReviewer";
import JobFit from "./JobFit";
import CompanyPrep from "./CompanyPrep";
import RoadmapBuilder from "./RoadmapBuilder";
import JobSearch from "./JobSearch";
import { BuildingIcon, CalendarIcon, ChatIcon, FileIcon, PercentIcon, SearchIcon } from "./Icons";
import "./styles.css";

// "How it works" = your job hunt, in order. Each step opens its tab.
const STEPS = [
  { title: "Find a job", text: "Search job boards for current ads that fit your role, place and level.", tab: "jobs" },
  { title: "Check your fit", text: "Compare your CV with a job ad, or get a full CV review.", tab: "fit" },
  { title: "Prepare and practise", text: "Research the company, then answer 5 interview questions for it.", tab: "company" },
  { title: "Close the gaps", text: "Get a week-by-week learning plan that fits your time.", tab: "roadmap" },
];

// The six features, shown as tabs in journey order (3x2, or 2x3 on mobile). The nav uses this list too.
// step = which "How it works" step it belongs to; tone = the colour of its icon tile.
const TABS = [
  { id: "jobs", label: "Job search", hint: "Live ads from the web", step: 1, tone: "yellow", Icon: SearchIcon },
  { id: "fit", label: "Job fit", hint: "Your match % for a job ad", step: 2, tone: "mint", Icon: PercentIcon },
  { id: "cv", label: "CV review", hint: "Line-by-line feedback", step: 2, tone: "navy", Icon: FileIcon },
  { id: "company", label: "Company prep", hint: "Research + likely questions", step: 3, tone: "red", Icon: BuildingIcon },
  { id: "interview", label: "Mock interview", hint: "5 questions, then a score", step: 3, tone: "yellow", Icon: ChatIcon },
  { id: "roadmap", label: "Learning plan", hint: "A plan that fits your time", step: 4, tone: "mint", Icon: CalendarIcon },
];

export default function App() {
  const [tab, setTab] = useState("interview");
  const workspaceRef = useRef(null);
  const activeTab = TABS.find((t) => t.id === tab); // for the header on the sheet

  // "Lifting state up": the CV review, Job fit and Interview screens cannot talk to the
  // Learning plan screen directly, so App (their shared parent) keeps the data for them.
  // roadmapSeed = { job_role, gaps, context } to pre-fill the Learning plan form.
  const [roadmapSeed, setRoadmapSeed] = useState(null);
  // interviewSeed = { job_role, company, company_notes, job_description } from Company prep.
  const [interviewSeed, setInterviewSeed] = useState(null);
  // jobFitSeed = { job_role, job_description } from Job search ("Check my fit").
  const [jobFitSeed, setJobFitSeed] = useState(null);

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

  // Job search calls this to check a job against your CV in the Job fit tab
  function checkFit(seed) {
    setJobFitSeed(seed);
    openTab("fit");
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
                {/* A link (not a button), because it contains a heading and a paragraph */}
                <a
                  className="step"
                  href="#workspace"
                  onClick={(e) => {
                    e.preventDefault(); // we scroll ourselves in openTab()
                    openTab(s.tab);
                  }}
                >
                  <span className="step-num">{i + 1}</span>
                  <h3>
                    <span className="step-title">{s.title}</span>
                    <span className="step-open" aria-hidden="true">→</span>
                  </h3>
                  <p>{s.text}</p>
                </a>
              </li>
            ))}
          </ol>
        </section>

        <section className="workspace" id="workspace" ref={workspaceRef}>
          <div className="workspace-head">
            <h2>Your career toolkit</h2>
            <p>Pick a tool. Your work stays when you switch.</p>
          </div>

          <div className="tabs" role="tablist">
            {TABS.map((t) => (
              <button
                key={t.id}
                role="tab"
                aria-selected={tab === t.id}
                className={tab === t.id ? "tab active" : "tab"}
                onClick={() => setTab(t.id)}
              >
                <span className={`icon-tile ${t.tone}`}><t.Icon /></span>
                <span className="tab-text">
                  <span className="tab-step">Step {t.step}</span>
                  <strong>{t.label}</strong>
                  <span className="tab-hint">{t.hint}</span>
                </span>
              </button>
            ))}
          </div>

          {/* All stay mounted, so switching tabs does not lose your progress */}
          <div className="sheet">
            {/* Header strip: which tool you are in, and which step of the job hunt */}
            <div className="sheet-head">
              <span className={`icon-tile ${activeTab.tone}`}><activeTab.Icon /></span>
              <p>
                <strong>Step {activeTab.step} of 4 · {STEPS[activeTab.step - 1].title}</strong>
                <span>{activeTab.label}: {activeTab.hint}</span>
              </p>
            </div>

            <div hidden={tab !== "jobs"}><JobSearch onCheckFit={checkFit} /></div>
            <div hidden={tab !== "interview"}><InterviewMode onBuildPlan={buildPlan} seed={interviewSeed} /></div>
            <div hidden={tab !== "cv"}><CVReviewer onBuildPlan={buildPlan} /></div>
            <div hidden={tab !== "fit"}><JobFit onBuildPlan={buildPlan} seed={jobFitSeed} /></div>
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
