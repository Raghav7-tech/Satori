import React from 'react';

interface LandingProps {
  onAnalyze: () => void;
}

export function Landing({ onAnalyze }: LandingProps) {
  return (
    <div className="page active" id="page-landing">
      <section className="hero">
        <div className="hero-content">
          <div className="eyebrow"><span className="eyebrow-dot"></span>Now analyzing public repos in seconds</div>
          <h1 className="hero-title">See where your codebase<br />is quietly <span className="accent">falling apart.</span></h1>
          <p className="hero-sub">Identify technical debt and structural risk before they break your build.</p>
          <div className="hero-actions">
            <button className="btn-primary" onClick={onAnalyze}>Analyze your repo</button>
            <a href="#features" className="btn-secondary">See how it works</a>
          </div>
        </div>
        <div className="hero-demo">
          <div className="hero-demo-bar">
            <span className="hero-demo-dot"></span><span className="hero-demo-dot"></span><span className="hero-demo-dot"></span>
            <span className="hero-demo-url mono">satori.dev/analyze/pallets/click</span>
          </div>
          <div className="hero-demo-body">
            <div className="mini-treemap">
              <div className="mini-tile high" style={{ gridRow: '1/3' }}>
                <div className="mini-tile-label">core.py</div><div className="mini-tile-score">RISK 100</div>
              </div>
              <div className="mini-tile mid">
                <div className="mini-tile-label">types.py</div><div className="mini-tile-score">RISK 93</div>
              </div>
              <div className="mini-tile low">
                <div className="mini-tile-label">exceptions.py</div><div className="mini-tile-score">RISK 5</div>
              </div>
              <div className="mini-tile mid">
                <div className="mini-tile-label">decorators.py</div><div className="mini-tile-score">RISK 24</div>
              </div>
              <div className="mini-tile low">
                <div className="mini-tile-label">testing.py</div><div className="mini-tile-score">RISK 9</div>
              </div>
            </div>
            <div className="mini-panel">
              <div className="mini-panel-title">core.py</div><div className="mini-panel-path">src/click/core.py</div>
              <div className="mini-badge"><b>100</b><span>Risk Score</span></div>
              <div className="mini-stat-row"><span>Churn</span><b>1,889</b></div>
              <div className="mini-stat-row"><span>Bugs fixed</span><b>32</b></div>
              <div className="mini-stat-row"><span>Bus factor</span><b>1</b></div>
            </div>
          </div>
        </div>
      </section>
      
      <div className="logos-strip">
        <p>Built to analyze codebases like</p>
        <div className="logos-row">
          <span>Django</span><span>FastAPI</span><span>React</span><span>Click</span><span>Vite</span>
        </div>
      </div>
      
      <section className="features" id="features">
        <div className="section-head">
          <div className="section-tag">// why satori</div>
          <h2>Onboarding shouldn't require tribal knowledge</h2>
          <p>Every mature codebase has a handful of files everyone's afraid to touch. Satori finds them before you have to learn the hard way.</p>
        </div>
        <div className="feature-grid">
          <div className="feature-card">
            <div className="feature-icon i1">🔥</div>
            <h3>Risk treemap</h3>
            <p>Churn, bug density, and bus factor combined into one score — see exactly where your codebase's danger is concentrated.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon i2">🕸️</div>
            <h3>Interactive dependency graph</h3>
            <p>A living, explorable map of how your files actually depend on each other — not a wiki diagram that's already out of date.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon i3">📊</div>
            <h3>Repo health grade</h3>
            <p>One letter grade, weighted toward your worst hotspots — not diluted by hundreds of files nobody worries about.</p>
          </div>
        </div>
      </section>
      
      <div className="cta-band">
        <h2>Point it at any public repo. Right now.</h2>
        <p>No signup required to try it.</p>
        <button className="btn-primary" onClick={onAnalyze}>Analyze a repository →</button>
      </div>
      
      <footer className="site-footer">
        <span>© 2026 Satori</span>
        <span>Built for engineering teams managing complex codebases.</span>
      </footer>
    </div>
  );
}
