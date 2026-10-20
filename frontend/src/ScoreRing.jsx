import { useEffect, useState } from "react";

// A round score gauge, used by all features.
// max=10 shows "7/10", max=100 shows "72%", max=5 shows "4.2/5".
// Colour depends on the percentage: red (<50%), amber (<70%), green (70%+).
export default function ScoreRing({ score, max = 10, label }) {
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const percent = Math.max(0, Math.min(score / max, 1)); // 0 to 1
  const level = percent < 0.5 ? "low" : percent < 0.7 ? "mid" : "high";

  // Start empty, then fill up to the score. The CSS transition on .ring-fill animates it.
  // (People who turn off animations get no transition, see the end of styles.css.)
  const [shown, setShown] = useState(0);
  useEffect(() => {
    const timer = setTimeout(() => setShown(percent), 50); // wait until the empty ring is drawn
    return () => clearTimeout(timer);
  }, [percent]);

  return (
    <div className={`ring ${level}`}>
      <svg viewBox="0 0 120 120" aria-hidden="true">
        <circle className="ring-track" cx="60" cy="60" r={radius} />
        <circle
          className="ring-fill"
          cx="60"
          cy="60"
          r={radius}
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - shown)}
          transform="rotate(-90 60 60)"
        />
      </svg>
      <div className="ring-text">
        <strong>{score}</strong>
        <span>{max === 100 ? "%" : `/${max}`}</span>
      </div>
      {label && <p className="ring-label">{label}</p>}
    </div>
  );
}
