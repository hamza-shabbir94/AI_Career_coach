// The top of the page: headline + a small animated demo of what the app does.
export default function Hero({ onStart }) {
  return (
    <section className="hero">
      <div className="hero-inner">
        <div className="hero-copy">
          <h1>Practise the interview before the interview.</h1>
          <p className="hero-sub">
            Answer real questions for the role you want, get honest feedback,
            and fix your CV line by line.
          </p>
          <div className="hero-actions">
            <button className="btn btn-highlight" onClick={() => onStart("interview")}>
              Start a mock interview
            </button>
            <button className="btn btn-ghost" onClick={() => onStart("cv")}>
              Review my CV
            </button>
          </div>
        </div>

        {/* Demo card: plays once when the page loads */}
        <div className="demo" aria-hidden="true">
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
        </div>
      </div>
    </section>
  );
}
