import { useEffect, useState } from "react";

// The top of the page: headline + a demo card that loops through the features.
// Every scene uses the same "CV editing" look: rise in, red pen, yellow highlighter, stamp.
// All the movement is CSS animation (see "Hero demo scenes" in styles.css).

const SCENE_SECONDS = 7; // how long each scene stays

// People who turn off animations in their system settings get a still card (no auto-play)
const reduceMotion =
  typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

// ---------- The 5 scenes (only text and CSS classes, no logic) ----------

function InterviewScene() {
  return (
    <>
      <div className="demo-chat">
        <p className="demo-q">
          <span className="avatar">AI</span>
          Tell me about a time you improved a slow process.
        </p>
        <p className="demo-a">We automated our deploys and cut release time from 2 days to 20 minutes.</p>
      </div>
      <div className="demo-paper">
        <p className="demo-line demo-old">Responsible for deployments.</p>
        <p className="demo-line demo-new">
          <mark>Automated deployments with GitHub Actions, cutting release time by 90%.</mark>
        </p>
        <div className="demo-stamp">8/10</div>
      </div>
    </>
  );
}

const DEMO_JOBS = [
  { title: "Junior AI Engineer", where: "Northwind Labs · Berlin · hybrid" },
  { title: "AI Engineer (LLM apps)", where: "Brightcart · remote" },
  { title: "ML Engineer, Graduate", where: "Lumora Health · Hamburg" },
];

function JobSearchScene() {
  return (
    <div className="demo-stack">
      {DEMO_JOBS.map((job, i) => (
        // --d = when this card rises in (CSS reads it as the animation delay)
        <div key={job.title} className="demo-job" style={{ "--d": `${0.2 + i * 0.5}s` }}>
          <div>
            <strong>{job.title}</strong>
            <span>{job.where}</span>
          </div>
          <span className="demo-badge" style={{ "--d": `${1.8 + i * 0.3}s` }}>Checked link</span>
          <span className="demo-star">
            ☆{i === 0 && <span className="demo-star-on">★</span>}
          </span>
        </div>
      ))}
    </div>
  );
}

const DEMO_REQS = [
  { icon: "✓", text: "Python and an LLM API", status: "met" },
  { icon: "✓", text: "REST APIs and Git", status: "met" },
  { icon: "½", text: "Testing AI outputs", status: "partial" },
  { icon: "✗", text: "Docker", status: "missing" },
];

function JobFitScene() {
  return (
    <div className="demo-paper demo-fit">
      <div className="demo-fit-list">
        {DEMO_REQS.map((r, i) => (
          <p key={r.text} className={`demo-req ${r.status}`} style={{ "--d": `${0.3 + i * 0.4}s` }}>
            <span>{r.icon}</span> {r.text}
          </p>
        ))}
      </div>
      <div className="demo-ring">
        <svg viewBox="0 0 80 80" aria-hidden="true">
          <circle className="ring-track" cx="40" cy="40" r="34" />
          <circle className="demo-ring-fill" cx="40" cy="40" r="34" transform="rotate(-90 40 40)" />
        </svg>
        <strong>78%</strong>
      </div>
      <div className="demo-stamp demo-stamp-wide">Strong match</div>
    </div>
  );
}

function CompanyScene() {
  return (
    <>
      <ol className="demo-steps">
        {["Searching the web", "Reading news and reviews", "Writing your prep sheet"].map((step, i) => (
          <li key={step} style={{ "--d": `${0.2 + i * 0.6}s` }}>
            <span className="demo-step-dot">✓</span> {step}
          </li>
        ))}
      </ol>
      <div className="demo-paper demo-question">
        <p className="demo-kicker">Likely question at Northwind Labs</p>
        <p className="demo-line"><strong>Why do you want to work on our AI products?</strong></p>
        <p className="demo-line demo-new">
          <mark>Link your answer to their mission: "AI that saves nurses time".</mark>
        </p>
      </div>
    </>
  );
}

const DEMO_TASKS = [
  { type: "learn", text: "FastAPI basics" },
  { type: "build", text: "A small CV-checker API" },
  { type: "practise", text: "Explain it in 2 minutes" },
];

function PlanScene() {
  return (
    <div className="demo-paper demo-plan">
      <div className="demo-week">
        <span className="demo-week-dot">✓</span>
        <div>
          <strong>Week 1 · Build your first API</strong>
          <span className="demo-week-sub">8 hours · 3 tasks</span>
        </div>
      </div>
      <ul className="demo-tasks">
        {DEMO_TASKS.map((t, i) => (
          <li key={t.text}>
            <span className="demo-check" style={{ "--d": `${0.6 + i * 0.6}s` }}>✓</span>
            <span className={`task-tag ${t.type}`}>{t.type}</span>
            {t.text}
          </li>
        ))}
      </ul>
      <div className="demo-progress"><span /></div>
    </div>
  );
}

// tab = which tab opens when you click the card
const SCENES = [
  { id: "interview", label: "Mock interview", tab: "interview", Scene: InterviewScene },
  { id: "jobs", label: "Job search", tab: "jobs", Scene: JobSearchScene },
  { id: "fit", label: "Job fit", tab: "fit", Scene: JobFitScene },
  { id: "company", label: "Company prep", tab: "company", Scene: CompanyScene },
  { id: "plan", label: "Learning plan", tab: "roadmap", Scene: PlanScene },
];

export default function Hero({ onStart }) {
  const [current, setCurrent] = useState(0);
  const [paused, setPaused] = useState(false); // true while the mouse is on the card

  // Every few seconds, go to the next scene (and back to the first after the last)
  useEffect(() => {
    if (paused || reduceMotion) return;
    const timer = setInterval(() => {
      setCurrent((c) => (c + 1) % SCENES.length);
    }, SCENE_SECONDS * 1000);
    return () => clearInterval(timer); // stop the old timer when paused or when the scene changes
  }, [paused, current]);

  const scene = SCENES[current];
  const Scene = scene.Scene;

  return (
    <section className="hero">
      <div className="hero-inner">
        <div className="hero-copy">
          <h1>
            Practise the interview before the <span className="hl">interview.</span>
          </h1>
          <p className="hero-sub">
            Find jobs that fit, practise the interview, fix your CV line by line,
            and learn what's missing.
          </p>
          <div className="hero-actions">
            <button className="btn btn-highlight" onClick={() => onStart("interview")}>
              Start a mock interview
            </button>
            <button className="btn btn-ghost" onClick={() => onStart("cv")}>
              Review my CV
            </button>
            <button className="btn btn-ghost" onClick={() => onStart("jobs")}>
              Find jobs
            </button>
          </div>
        </div>

        {/* Demo card: hover pauses it, click opens the feature, dots jump to a scene */}
        <div
          className="demo"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
        >
          {/* Clicking anywhere on the card opens the feature. The label is a real button for
              keyboard users: its click "bubbles up" to this div's onClick, so it needs no own handler. */}
          <div className="demo-stage" onClick={() => onStart(scene.tab)}>
            <button className="demo-label" aria-label={`Open ${scene.label}`}>
              {scene.label} <span aria-hidden="true">→</span>
            </button>
            {/* key = scene id: a new key makes React rebuild the scene, so its animations play again */}
            <div key={scene.id} className="demo-scene" aria-hidden="true">
              <Scene />
            </div>
          </div>

          <div className="demo-dots" role="group" aria-label="Choose a demo">
            {SCENES.map((s, i) => (
              <button
                key={s.id}
                className={i === current ? "demo-dot on" : "demo-dot"}
                onClick={() => setCurrent(i)}
                aria-label={`Show ${s.label} demo`}
                aria-pressed={i === current}
              >
                {/* The active dot fills up like a timer (paused = it stops) */}
                {i === current && !reduceMotion && (
                  <span key={`${s.id}-${paused}`} className={paused ? "dot-timer paused" : "dot-timer"} />
                )}
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
