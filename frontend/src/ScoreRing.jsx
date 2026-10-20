// A round score gauge, used by both features.
// Colour changes with the score: red (low), amber (ok), green (good).
export default function ScoreRing({ score, max = 10, label }) {
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const percent = Math.max(0, Math.min(score / max, 1));
  const level = score < 5 ? "low" : score < 7 ? "mid" : "high";

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
          strokeDashoffset={circumference * (1 - percent)}
          transform="rotate(-90 60 60)"
        />
      </svg>
      <div className="ring-text">
        <strong>{score}</strong>
        <span>/{max}</span>
      </div>
      {label && <p className="ring-label">{label}</p>}
    </div>
  );
}
