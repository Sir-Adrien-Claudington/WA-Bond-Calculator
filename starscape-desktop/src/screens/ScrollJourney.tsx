// ---------------------------------------------------------------------------
// StarScape — Scroll Journey
// ---------------------------------------------------------------------------
// Pure CSS scroll-driven animation tour of the planets. All entrance
// animations use `animation-timeline: view()` — zero JS scroll listeners.
// In browsers without scroll-timeline support the elements simply render
// in their final visible state (0s animation with fill: both).
// ---------------------------------------------------------------------------

import { PLANETS } from '@data/planets';
import '../styles/journey.css';

export function ScrollJourney() {
  return (
    <main className="journey-scroll">
      <header className="journey-hero">
        <h1 className="journey-title">The Grand Tour</h1>
        <p className="journey-sub">Eight worlds. One star. Scroll to begin.</p>
      </header>

      {PLANETS.map((p, i) => (
        <section className="journey-section" key={p.id} aria-label={p.name}>
          <div className="section-visual">
            <div
              className="css-sphere"
              style={{
                background: p.displayColor,
                width: `${Math.min(320, 90 + p.radius * 75)}px`,
              }}
            >
              {p.hasRings && <div className="css-ring" aria-hidden="true" />}
            </div>
          </div>

          <div className="section-text">
            <div className="section-num">
              {String(i + 1).padStart(2, '0')} / {String(PLANETS.length).padStart(2, '0')}
            </div>
            <h2 className="section-name" style={{ color: p.displayColor }}>
              {p.name}
            </h2>
            <div className="section-type">{p.type_label}</div>
            <p className="section-desc">{p.description}</p>
            <div className="facts">
              {p.facts.map(([k, v]) => (
                <div className="fact" key={k}>
                  <div className="fact-k">{k}</div>
                  <div className="fact-v">{v}</div>
                </div>
              ))}
            </div>
          </div>
        </section>
      ))}

      <footer className="journey-end">
        <p>End of tour — {PLANETS.length} planets, 4.5 billion years in the making.</p>
      </footer>
    </main>
  );
}
