// ---------------------------------------------------------------------------
// GeoScape — Strata Journey
// ---------------------------------------------------------------------------
// A scroll-driven descent through Earth's interior, the rock cycle, and
// geologic time. All scroll motion is the native CSS Scroll-driven Animations
// API — `view()` for entrance reveals and `scroll()` for parallax — with zero
// JS scroll listeners. CSS 3D `perspective` / `translateZ` give the layers
// depth and parallax. Rock surfaces are procedurally painted (geoTextures).
// ---------------------------------------------------------------------------

import { useEffect, useRef } from 'react';
import { EARTH_LAYERS, ROCK_TYPES, GEO_TIME, type RockKind } from '@data/geology';
import { paintRock } from '@utils/geoTextures';
import { GeoNav } from './GeoNav';
import '../../styles/geology.css';

function RockSwatch({ kind, label }: { kind: RockKind; label: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    // Paint the procedural texture only once the swatch nears view — keeps the
    // initial load free of a synchronous burst of canvas work (low TBT).
    let painted = false;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting && !painted) {
          const ctx = c.getContext('2d');
          if (ctx) paintRock(ctx, c.width, c.height, kind);
          painted = true;
          io.disconnect();
        }
      },
      { rootMargin: '250px' }
    );
    io.observe(c);
    return () => io.disconnect();
  }, [kind]);
  return (
    <figure className="rock-swatch">
      <canvas ref={ref} width={256} height={256} aria-label={`${label} rock texture`} />
      <figcaption>{label}</figcaption>
    </figure>
  );
}

interface StrataJourneyProps {
  pathname: string;
  onNavigate: (path: string) => void;
}

export function StrataJourney({ pathname, onNavigate }: StrataJourneyProps) {
  return (
    <main className="geo-root">
      <GeoNav pathname={pathname} onNavigate={onNavigate} />

      {/* Hero with CSS 3D parallax layers */}
      <header className="geo-hero">
        <div className="geo-hero-parallax" aria-hidden="true">
          <div className="geo-hero-layer geo-hero-far" />
          <div className="geo-hero-layer geo-hero-mid" />
          <div className="geo-hero-layer geo-hero-near" />
        </div>
        <div className="geo-hero-content">
          <div className="geo-kicker">GeoScape</div>
          <h1 className="geo-h1">Journey to the Core</h1>
          <p className="geo-hero-sub">
            Descend through Earth’s layers, follow the rock cycle, and travel 4.6 billion years of time.
          </p>
          <div className="geo-scrollcue" aria-hidden="true">
            <span>Scroll to descend</span>
            <div className="geo-scrollcue-line" />
          </div>
        </div>
      </header>

      {/* Into the Earth — layer descent */}
      <section className="geo-section" aria-labelledby="layers-h">
        <div className="geo-section-head">
          <div className="geo-eyebrow">Structure</div>
          <h2 className="geo-h2" id="layers-h">Into the Earth</h2>
          <p className="geo-lead">
            From the brittle crust to a solid metal core hotter than the Sun’s surface — each step down is a
            jump in heat, pressure and density.
          </p>
        </div>

        <div className="strata-stack">
          <div className="strata-progress" aria-hidden="true">
            <div className="strata-progress-fill" />
          </div>
          {EARTH_LAYERS.map((layer, i) => (
            <article className="layer-row" key={layer.id} style={{ ['--layer' as string]: layer.color }}>
              <div className="layer-core" aria-hidden="true">
                <div className="layer-core-face" />
                <span className="layer-depth">{layer.depth}</span>
              </div>
              <div className="layer-info">
                <div className="layer-index">{String(i + 1).padStart(2, '0')}</div>
                <h3 className="layer-name">{layer.name}</h3>
                <div className="layer-tags">
                  <span>{layer.state}</span>
                  <span>{layer.composition}</span>
                  <span>{layer.temperature}</span>
                </div>
                <p className="layer-fact">{layer.fact}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* Rock cycle */}
      <section className="geo-section geo-section-rock" aria-labelledby="rock-h">
        <div className="geo-section-head">
          <div className="geo-eyebrow">Petrology</div>
          <h2 className="geo-h2" id="rock-h">The Rock Cycle</h2>
          <p className="geo-lead">
            Every rock is on a journey. Heat, pressure, weathering and time turn one type into another — an
            endless recycling of the crust.
          </p>
        </div>

        <div className="rock-grid">
          {ROCK_TYPES.map((rt) => (
            <article className="rock-card" key={rt.id} style={{ ['--accent' as string]: rt.accent }}>
              <div className="rock-card-head">
                <h3 className="rock-name">{rt.name}</h3>
                <span className="rock-origin">{rt.origin}</span>
              </div>
              <p className="rock-formation">{rt.formation}</p>
              <div className="rock-swatches">
                {rt.examples.map((ex) => (
                  <RockSwatch key={ex.kind} kind={ex.kind} label={ex.name} />
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* Geologic time */}
      <section className="geo-section geo-section-time" aria-labelledby="time-h">
        <div className="geo-section-head">
          <div className="geo-eyebrow">Deep Time</div>
          <h2 className="geo-h2" id="time-h">4.6 Billion Years</h2>
          <p className="geo-lead">
            Earth’s whole history compressed into a single thread — from a molten ball of rock to the world
            of today.
          </p>
        </div>

        <div className="timeline">
          <div className="timeline-spine" aria-hidden="true" />
          {GEO_TIME.map((t, i) => (
            <div className={`time-row time-${i % 2 === 0 ? 'left' : 'right'}`} key={t.id}>
              <div className="time-node" style={{ background: t.color }} aria-hidden="true" />
              <article className="time-card" style={{ ['--accent' as string]: t.color }}>
                <div className="time-span">{t.span}</div>
                <h3 className="time-name">{t.name}</h3>
                <p className="time-event">{t.event}</p>
              </article>
            </div>
          ))}
        </div>
      </section>

      <footer className="geo-end">
        <p>The ground beneath you is 4.6 billion years in the making.</p>
        <a
          href="/minerals"
          className="geo-end-cta"
          onClick={(e) => {
            e.preventDefault();
            onNavigate('/minerals');
          }}
        >
          Explore the Mineral Lab →
        </a>
      </footer>
    </main>
  );
}
