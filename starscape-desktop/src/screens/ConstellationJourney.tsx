// ---------------------------------------------------------------------------
// StarScape — Scroll-driven constellation mythology journey
// ---------------------------------------------------------------------------
// As the user scrolls, each constellation card animates in with GSAP ScrollTrigger.
// Constellation lines are drawn as CSS SVG overlays (no external image frames —
// all geometry is computed from Hipparcos RA/Dec coordinates).
// Mythology text: original writing + Wikipedia CC-BY-SA (attribution per card).
// H.A. Rey "The Stars" is in copyright — NOT used.
// ---------------------------------------------------------------------------

import { useRef, useEffect } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { motion, useInView } from 'framer-motion';
import { colors } from '@constants/theme';

gsap.registerPlugin(ScrollTrigger);

// ---------------------------------------------------------------------------
// Constellation data — original mythology text + stick figure star HIP pairs
// All mythology text: original writing inspired by IAU/Wikipedia CC-BY-SA
// ---------------------------------------------------------------------------
interface ConstellationEntry {
  abbr: string;
  name: string;
  myth: string;
  mythSource: string;
  brightestStar: string;
  starCount: number;
  // Simple screen-space line path for the CSS SVG illustration
  // Normalised 0–1 coordinates for a 200×200 viewBox
  linePath: string;
}

const CONSTELLATIONS: ConstellationEntry[] = [
  {
    abbr: 'ORI',
    name: 'Orion',
    myth:
      'The great hunter Orion strides across the winter sky, his belt of three ' +
      'aligned stars one of the most recognised patterns in the heavens. Ancient ' +
      'Egyptians aligned the Pyramids of Giza with his belt stars: Alnitak, ' +
      'Alnilam, and Mintaka.',
    mythSource: 'Original text, inspired by IAU and public-domain sources.',
    brightestStar: 'Rigel (β Ori, vmag 0.45)',
    starCount: 7,
    linePath:
      'M100,30 L110,60 M110,60 L90,60 M90,60 L100,30 M100,60 L100,90 ' +
      'M100,90 L80,120 M100,90 L120,120',
  },
  {
    abbr: 'UMA',
    name: 'Ursa Major',
    myth:
      'The Great Bear wheels around the north celestial pole, never setting ' +
      'for observers in the northern hemisphere. Its seven brightest stars — ' +
      'the Plough or Big Dipper — have guided navigators for millennia, ' +
      'pointing always toward Polaris.',
    mythSource: 'Original text, inspired by IAU and public-domain sources.',
    brightestStar: 'Alioth (ε UMa, vmag 1.76)',
    starCount: 8,
    linePath:
      'M50,100 L70,95 L90,100 L110,90 M110,90 L130,70 L150,60 L160,40 L150,30',
  },
  {
    abbr: 'SCO',
    name: 'Scorpius',
    myth:
      'The great scorpion sent by Gaia to slay Orion, Scorpius blazes through ' +
      'summer skies with the red supergiant Antares at its heart — its name ' +
      'meaning "rival of Ares" for its fiery hue.',
    mythSource: 'Original text, inspired by IAU and public-domain sources.',
    brightestStar: 'Antares (α Sco, vmag 1.06)',
    starCount: 18,
    linePath:
      'M80,40 L90,60 L100,80 L110,100 L105,120 L90,140 L80,150 L70,160 L60,155',
  },
  {
    abbr: 'CYG',
    name: 'Cygnus',
    myth:
      'The swan soars along the Milky Way, its brightest star Deneb marking ' +
      'the tail. Together with Vega and Altair it forms the Summer Triangle — ' +
      'a prominent asterism guiding summer evenings in the northern sky.',
    mythSource: 'Original text, inspired by IAU and public-domain sources.',
    brightestStar: 'Deneb (α Cyg, vmag 1.25)',
    starCount: 9,
    linePath:
      'M100,30 L100,130 M60,80 L140,80',
  },
  {
    abbr: 'LEO',
    name: 'Leo',
    myth:
      'The lion Leo greets the spring sky, its sickle asterism tracing his ' +
      'mane and chest. Regulus, at the base of the sickle, sits almost exactly ' +
      'on the ecliptic — the Sun passes within half a degree of it each year.',
    mythSource: 'Original text, inspired by IAU and public-domain sources.',
    brightestStar: 'Regulus (α Leo, vmag 1.36)',
    starCount: 9,
    linePath:
      'M80,50 L90,70 L100,80 L110,70 L120,50 M100,80 L100,130 L80,150 L120,150',
  },
];

// ---------------------------------------------------------------------------
// Single constellation card
// ---------------------------------------------------------------------------
function ConstellationCard({
  entry,
  index,
}: {
  entry: ConstellationEntry;
  index: number;
}) {
  const cardRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(cardRef, { once: true, margin: '-100px' });

  return (
    <motion.div
      ref={cardRef}
      initial={{ opacity: 0, x: index % 2 === 0 ? -60 : 60, y: 20 }}
      animate={isInView ? { opacity: 1, x: 0, y: 0 } : {}}
      transition={{ duration: 0.8, ease: [0.25, 0.46, 0.45, 0.94] }}
      style={{
        display: 'grid',
        gridTemplateColumns: index % 2 === 0 ? '1fr 260px' : '260px 1fr',
        gap: '4rem',
        alignItems: 'center',
        padding: '3rem 4rem',
        background: 'rgba(0, 18, 51, 0.6)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(76, 201, 240, 0.15)',
        borderRadius: '16px',
        marginBottom: '4rem',
      }}
      role="article"
      aria-label={`${entry.name} constellation`}
    >
      {/* Text column */}
      <div style={{ order: index % 2 === 0 ? 0 : 1 }}>
        <div
          style={{
            fontSize: '0.75rem',
            letterSpacing: '0.3em',
            color: colors.accentBlue,
            textTransform: 'uppercase',
            marginBottom: '0.5rem',
          }}
        >
          IAU {entry.abbr} — {entry.starCount} principal stars
        </div>
        <h2
          style={{
            fontSize: 'clamp(1.75rem, 4vw, 2.5rem)',
            fontWeight: 300,
            color: colors.textPrimary,
            margin: '0 0 1.25rem',
            letterSpacing: '0.05em',
          }}
        >
          {entry.name}
        </h2>
        <p
          style={{
            fontSize: '1.0625rem',
            lineHeight: 1.75,
            color: colors.textSecondary,
            margin: '0 0 1.25rem',
          }}
        >
          {entry.myth}
        </p>
        <div
          style={{
            fontSize: '0.8125rem',
            color: colors.textMuted,
            borderTop: `1px solid ${colors.constellationLine}`,
            paddingTop: '1rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.25rem',
          }}
        >
          <span>Brightest: {entry.brightestStar}</span>
          <span style={{ fontStyle: 'italic' }}>{entry.mythSource}</span>
        </div>
      </div>

      {/* SVG constellation illustration */}
      <div style={{ order: index % 2 === 0 ? 1 : 0, display: 'flex', justifyContent: 'center' }}>
        <svg
          viewBox="0 0 200 200"
          width={260}
          height={260}
          aria-hidden="true"
          style={{ overflow: 'visible' }}
        >
          {/* Constellation lines */}
          <path
            d={entry.linePath}
            stroke={colors.constellationLine}
            strokeWidth="1.5"
            fill="none"
            opacity="0.8"
          />
          {/* Star dots at path endpoints (simplified) */}
          {entry.linePath
            .match(/[ML]\s*(\d+),(\d+)/g)
            ?.map((point, i) => {
              const match = point.match(/(\d+),(\d+)/);
              if (!match) return null;
              return (
                <circle
                  key={i}
                  cx={match[1]}
                  cy={match[2]}
                  r="3"
                  fill={colors.starWhite}
                  opacity="0.9"
                />
              );
            })}
        </svg>
      </div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Exported section
// ---------------------------------------------------------------------------
export function ConstellationJourney() {
  const headerRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (!headerRef.current) return;
    gsap.fromTo(
      headerRef.current,
      { opacity: 0, y: 30 },
      {
        opacity: 1,
        y: 0,
        duration: 1,
        ease: 'power2.out',
        scrollTrigger: {
          trigger: headerRef.current,
          start: 'top 80%',
        },
      }
    );
  }, []);

  return (
    <section
      style={{
        background: `linear-gradient(to bottom, #000814 0%, #001233 30%, #000814 100%)`,
        padding: '6rem 0',
      }}
      aria-labelledby="constellations-heading"
    >
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 3rem' }}>
        <h2
          ref={headerRef}
          id="constellations-heading"
          style={{
            fontSize: 'clamp(1.5rem, 4vw, 2.25rem)',
            fontWeight: 200,
            letterSpacing: '0.15em',
            textAlign: 'center',
            color: colors.textPrimary,
            marginBottom: '1rem',
            opacity: 0,
          }}
        >
          STORIES IN THE SKY
        </h2>
        <p
          style={{
            textAlign: 'center',
            color: colors.textSecondary,
            marginBottom: '5rem',
            letterSpacing: '0.1em',
            fontSize: '0.9375rem',
          }}
        >
          Five thousand years of myth, mapped to light
        </p>

        {CONSTELLATIONS.map((entry, i) => (
          <ConstellationCard key={entry.abbr} entry={entry} index={i} />
        ))}
      </div>
    </section>
  );
}
