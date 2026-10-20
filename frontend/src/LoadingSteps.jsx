import { useEffect, useState } from "react";

// Shows progress steps while a slow request runs (web search takes 20-40 seconds).
// The steps move on a TIMER: they only show that something is happening,
// they do not know exactly what the backend is doing right now.
export default function LoadingSteps({ steps, secondsPerStep = 10 }) {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    // Every few seconds go to the next step, but stop at the last one
    const timer = setInterval(() => {
      setCurrent((c) => Math.min(c + 1, steps.length - 1));
    }, secondsPerStep * 1000);
    return () => clearInterval(timer); // stop the timer when loading ends
  }, [steps.length, secondsPerStep]);

  return (
    <ol className="loading-steps" aria-live="polite">
      {steps.map((step, i) => {
        const state = i < current ? "done" : i === current ? "now" : "todo";
        return (
          <li key={step} className={state}>
            <span className="loading-dot">{state === "done" ? "✓" : ""}</span>
            {step}{state === "now" && "…"}
          </li>
        );
      })}
    </ol>
  );
}
