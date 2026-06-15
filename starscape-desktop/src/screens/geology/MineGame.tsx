// ---------------------------------------------------------------------------
// GeoScape — Mine Game
// ---------------------------------------------------------------------------
// Phase machine: Australia map → zoom transition → mine interior → mineral popup.
// Canvas renders the AU map; mine interior is pure CSS/HTML for performance.
// All mine site data is public scientific fact; no personal or auth data used.
// ---------------------------------------------------------------------------

import { useEffect, useRef, useState, useCallback, type CSSProperties } from 'react';
import { MINERALS, type Mineral } from '@data/geology';
import { GeoNav } from './GeoNav';

// --- Data -------------------------------------------------------------------

interface MineSite {
  id: string;
  name: string;
  lat: number;
  lon: number;
  minerals: string[]; // mineral IDs from geology.ts
  state: string;
  desc: string;
}

const MINE_SITES: MineSite[] = [
  {
    id: 'kalgoorlie', name: 'Kalgoorlie', lat: -30.75, lon: 121.46,
    minerals: ['gold', 'pyrite'], state: 'WA',
    desc: 'Super Pit — one of the world\'s largest open-cut gold mines, over 3.5 km long.',
  },
  {
    id: 'broken-hill', name: 'Broken Hill', lat: -31.95, lon: 141.47,
    minerals: ['galena', 'pyrite', 'magnetite'], state: 'NSW',
    desc: 'The Line of Lode — silver, lead and zinc ore body discovered in 1883, still producing.',
  },
  {
    id: 'mount-isa', name: 'Mount Isa', lat: -20.73, lon: 139.49,
    minerals: ['copper', 'galena', 'hematite'], state: 'QLD',
    desc: 'One of the most productive copper, lead, zinc and silver mines in the world.',
  },
  {
    id: 'newman', name: 'Mount Whaleback', lat: -23.35, lon: 119.73,
    minerals: ['hematite', 'magnetite'], state: 'WA',
    desc: 'Pilbara iron ore — the largest single-pit open-cut iron ore mine in the world.',
  },
  {
    id: 'argyle', name: 'Argyle Mine', lat: -16.71, lon: 128.39,
    minerals: ['diamond', 'ruby'], state: 'WA',
    desc: 'World\'s leading producer of pink diamonds — now underground after pit exhaustion.',
  },
  {
    id: 'olympic-dam', name: 'Olympic Dam', lat: -30.44, lon: 136.87,
    minerals: ['copper', 'gold', 'hematite'], state: 'SA',
    desc: 'The world\'s largest known uranium deposit — also rich in copper and gold.',
  },
  {
    id: 'mount-lyell', name: 'Mount Lyell', lat: -42.10, lon: 145.73,
    minerals: ['pyrite', 'copper', 'malachite'], state: 'TAS',
    desc: 'Over a century of copper extraction in the rugged West Coast wilderness of Tasmania.',
  },
];

// Simplified AU coastline — clockwise from Cape York (lat, lon)
const AU_COAST: [number, number][] = [
  [-10.7, 142.5], [-16.9, 145.8], [-19.3, 146.8], [-24.5, 152.0],
  [-27.5, 153.5], [-33.9, 151.2], [-37.8, 149.5], [-38.7, 146.2],
  [-38.4, 144.4], [-37.8, 140.8], [-35.5, 138.5], [-34.9, 137.6],
  [-33.5, 137.0], [-33.5, 134.5], [-31.5, 128.0], [-34.4, 115.1],
  [-31.9, 115.8], [-29.5, 114.6], [-26.0, 114.0], [-24.9, 113.6],
  [-21.5, 114.1], [-20.3, 118.9], [-17.9, 122.2], [-15.0, 128.0],
  [-12.5, 130.9], [-11.5, 131.8], [-12.0, 133.5], [-14.5, 135.6],
  [-16.5, 136.2], [-17.0, 139.0], [-14.5, 139.6], [-12.5, 141.0],
  [-10.7, 142.5],
];

const TAS_COAST: [number, number][] = [
  [-40.7, 145.3], [-41.6, 148.3], [-43.6, 146.9], [-42.5, 145.0], [-40.7, 145.3],
];

// Map projection bounds
const AU_N = -9.5, AU_S = -43.8, AU_W = 113.0, AU_E = 153.8;

function projectCoord(lat: number, lon: number, w: number, h: number): [number, number] {
  const pad = Math.min(w, h) * 0.06;
  const x = ((lon - AU_W) / (AU_E - AU_W)) * (w - 2 * pad) + pad;
  const y = ((AU_N - lat) / (AU_N - AU_S)) * (h - 2 * pad) + pad;
  return [x, y];
}

// Vein layout per mine slot (relative x%, y%, w%, h%)
const VEIN_SLOTS: Array<[number, number, number, number]> = [
  [12, 35, 18, 14],
  [40, 55, 20, 12],
  [68, 32, 16, 16],
];

// --- Types ------------------------------------------------------------------

type GamePhase = 'map' | 'zoom' | 'mine' | 'popup';

interface DotPos { id: string; x: number; y: number }

// --- Component --------------------------------------------------------------

interface MineGameProps {
  pathname: string;
  onNavigate: (path: string) => void;
}

export function MineGame({ pathname, onNavigate }: MineGameProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [phase, setPhase] = useState<GamePhase>('map');
  const [activeSite, setActiveSite] = useState<MineSite | null>(null);
  const [zoomPos, setZoomPos] = useState({ x: 0, y: 0 });
  const [zoomColor, setZoomColor] = useState('#d4af52');
  const [dotPositions, setDotPositions] = useState<DotPos[]>([]);
  const [selectedMineral, setSelectedMineral] = useState<Mineral | null>(null);

  // --- Map canvas drawing ---------------------------------------------------

  const drawMap = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;

    ctx.clearRect(0, 0, w, h);

    const drawPoly = (coords: [number, number][], fill: string, stroke: string) => {
      ctx.beginPath();
      coords.forEach(([lat, lon], i) => {
        const [x, y] = projectCoord(lat, lon, w, h);
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      });
      ctx.closePath();
      ctx.fillStyle = fill;
      ctx.fill();
      ctx.strokeStyle = stroke;
      ctx.lineWidth = 1.5;
      ctx.stroke();
    };

    drawPoly(AU_COAST, '#2a2215', '#d98e3c');
    drawPoly(TAS_COAST, '#2a2215', '#d98e3c');

    // State labels (approximate centres)
    ctx.fillStyle = 'rgba(242, 232, 216, 0.22)';
    ctx.font = `${Math.max(9, w * 0.015)}px JetBrains Mono, monospace`;
    ctx.textAlign = 'center';
    const stateLabels: [string, number, number][] = [
      ['WA', -25.0, 121.0], ['NT', -19.0, 133.5], ['QLD', -22.0, 143.0],
      ['SA', -31.0, 135.0], ['NSW', -33.0, 146.0], ['VIC', -37.0, 144.5],
    ];
    stateLabels.forEach(([label, lat, lon]) => {
      const [x, y] = projectCoord(lat, lon, w, h);
      ctx.fillText(label, x, y);
    });

    // Recompute dot positions from current canvas size
    setDotPositions(
      MINE_SITES.map((s) => {
        const [x, y] = projectCoord(s.lat, s.lon, w, h);
        return { id: s.id, x, y };
      })
    );
  }, []);

  // Draw on mount and on resize
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resize = () => {
      canvas.width = canvas.clientWidth;
      canvas.height = canvas.clientHeight;
      drawMap();
    };

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    return () => ro.disconnect();
  }, [drawMap]);

  // Redraw when returning to map
  useEffect(() => {
    if (phase === 'map') drawMap();
  }, [phase, drawMap]);

  // --- Interaction ----------------------------------------------------------

  const handleSiteClick = (site: MineSite, x: number, y: number) => {
    const primary = MINERALS.find((m) => m.id === site.minerals[0]);
    setActiveSite(site);
    setZoomPos({ x, y });
    setZoomColor(primary?.color ?? '#d4af52');
    setPhase('zoom');
  };

  const handleVeinClick = (mineralId: string) => {
    const m = MINERALS.find((min) => min.id === mineralId);
    if (m) { setSelectedMineral(m); setPhase('popup'); }
  };

  const goToMap = () => {
    setActiveSite(null);
    setSelectedMineral(null);
    setPhase('map');
  };

  const goToMine = () => {
    setSelectedMineral(null);
    setPhase('mine');
  };

  // --- Render ---------------------------------------------------------------

  return (
    <div className="mine-root">
      <GeoNav pathname={pathname} onNavigate={onNavigate} />

      {/* ---- MAP PHASE ---- */}
      <div
        className="mine-map-wrap"
        style={{ visibility: phase === 'mine' || phase === 'popup' ? 'hidden' : 'visible' }}
      >
        <canvas ref={canvasRef} className="mine-map-canvas" />

        {/* Site markers */}
        {phase === 'map' && dotPositions.map(({ id, x, y }) => {
          const site = MINE_SITES.find((s) => s.id === id)!;
          const color = MINERALS.find((m) => m.id === site.minerals[0])?.color ?? '#d4af52';
          return (
            <button
              key={id}
              className="mine-dot"
              style={{ left: x, top: y, '--mc': color } as CSSProperties}
              onClick={() => handleSiteClick(site, x, y)}
              aria-label={`Mine site: ${site.name}, ${site.state}`}
            >
              <span className="mine-dot-ring" />
              <span className="mine-dot-label">{site.name}</span>
            </button>
          );
        })}

        {/* Zoom circle overlay */}
        {phase === 'zoom' && (
          <div
            className="mine-zoom-circle"
            style={{ left: zoomPos.x, top: zoomPos.y, background: zoomColor } as CSSProperties}
            onAnimationEnd={() => setPhase('mine')}
          />
        )}

        <div className="mine-map-title">
          <span>Australian Mine Sites</span>
          <span className="mine-map-sub">Click a site to explore</span>
        </div>
      </div>

      {/* ---- MINE INTERIOR ---- */}
      {(phase === 'mine' || phase === 'popup') && activeSite && (
        <div className="mine-interior">
          {/* Cave background layers */}
          <div className="mine-cave-bg">
            <div className="mine-strata" />
          </div>

          <div className="mine-interior-header">
            <div className="mine-interior-site">{activeSite.name} — {activeSite.state}</div>
            <p className="mine-interior-desc">{activeSite.desc}</p>
          </div>

          <div className="mine-shaft">
            <div className="mine-shaft-label">MINE SHAFT — {activeSite.name.toUpperCase()}</div>
            {activeSite.minerals.slice(0, 3).map((mId, i) => {
              const m = MINERALS.find((min) => min.id === mId);
              if (!m) return null;
              const [vx, vy, vw, vh] = VEIN_SLOTS[i] ?? [20 + i * 25, 40, 18, 14];
              return (
                <button
                  key={mId}
                  className="mine-vein"
                  style={{
                    left: `${vx}%`, top: `${vy}%`,
                    width: `${vw}%`, height: `${vh}%`,
                    background: `radial-gradient(ellipse, ${m.color}cc 0%, ${m.color}55 60%, transparent 100%)`,
                    boxShadow: `0 0 24px 6px ${m.color}44`,
                  } as CSSProperties}
                  onClick={() => handleVeinClick(mId)}
                  aria-label={`Mine ${m.name} vein`}
                >
                  <span className="mine-vein-label">{m.name}</span>
                  <span className="mine-vein-hint">tap to mine</span>
                </button>
              );
            })}
          </div>

          <button className="mine-back-btn" onClick={goToMap}>← Back to Map</button>
        </div>
      )}

      {/* ---- POPUP ---- */}
      {phase === 'popup' && selectedMineral && (
        <div className="mine-popup-overlay" role="dialog" aria-label={`Mineral info: ${selectedMineral.name}`}>
          <div className="mine-popup">
            <div
              className="mine-popup-gem"
              style={{ background: `radial-gradient(ellipse at 35% 30%, ${selectedMineral.color}ee, ${selectedMineral.color}55)` }}
            />
            <div className="mine-popup-formula">{selectedMineral.formula}</div>
            <h2 className="mine-popup-name">{selectedMineral.name}</h2>
            <p className="mine-popup-blurb">{selectedMineral.blurb}</p>
            <div className="mine-popup-grid">
              <div>
                <span>Hardness</span>
                <b>{selectedMineral.mohs} Mohs</b>
              </div>
              <div>
                <span>System</span>
                <b>{selectedMineral.system}</b>
              </div>
              <div>
                <span>Luster</span>
                <b>{selectedMineral.luster}</b>
              </div>
              <div>
                <span>Class</span>
                <b>{selectedMineral.group}</b>
              </div>
            </div>
            <p className="mine-popup-uses">{selectedMineral.uses}</p>
            <div className="mine-popup-actions">
              <button className="mine-action-btn mine-action-primary" onClick={goToMine}>Mine More</button>
              <button className="mine-action-btn" onClick={goToMap}>New Site</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
