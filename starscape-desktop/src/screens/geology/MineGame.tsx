// ---------------------------------------------------------------------------
// GeoScape — Mine Game
// ---------------------------------------------------------------------------
// Phase machine: Australia map → zoom → first-person cave tap game → popup.
// Map uses real Natural Earth 1:110m coastline with cos-latitude correction.
// Cave: animated rock face, mineralogically-styled ore deposits (per-mineral
// crystal facets, specular highlights, glow), pickaxe overlay, score/combo
// system, particle feedback, and a rarity-tagged geological popup.
// ---------------------------------------------------------------------------

import { useEffect, useRef, useState, useCallback, type CSSProperties } from 'react';
import { MINERALS, type Mineral } from '@data/geology';
import { AU_COAST, TAS_COAST } from '@data/australiaCoast';
import { GeoNav } from './GeoNav';

// ---- Mine site data -------------------------------------------------------

interface MineSite {
  id: string; name: string; lat: number; lon: number;
  minerals: string[]; state: string; desc: string;
}

const MINE_SITES: MineSite[] = [
  { id: 'kalgoorlie', name: 'Kalgoorlie', lat: -30.75, lon: 121.46,
    minerals: ['gold', 'pyrite'], state: 'WA',
    desc: "Super Pit — one of the world's largest open-cut gold mines, over 3.5 km long." },
  { id: 'broken-hill', name: 'Broken Hill', lat: -31.95, lon: 141.47,
    minerals: ['galena', 'pyrite'], state: 'NSW',
    desc: 'The Line of Lode — silver, lead and zinc ore body discovered in 1883, still producing.' },
  { id: 'mount-isa', name: 'Mount Isa', lat: -20.73, lon: 139.49,
    minerals: ['copper', 'galena'], state: 'QLD',
    desc: 'One of the most productive copper, lead, zinc and silver mines in the world.' },
  { id: 'newman', name: 'Mount Whaleback', lat: -23.35, lon: 119.73,
    minerals: ['hematite', 'magnetite'], state: 'WA',
    desc: 'Pilbara iron ore — the largest single-pit open-cut iron ore mine in the world.' },
  { id: 'argyle', name: 'Argyle Mine', lat: -16.71, lon: 128.39,
    minerals: ['diamond'], state: 'WA',
    desc: "World's leading producer of pink diamonds — now underground after pit exhaustion." },
  { id: 'olympic-dam', name: 'Olympic Dam', lat: -30.44, lon: 136.87,
    minerals: ['copper', 'gold'], state: 'SA',
    desc: "The world's largest known uranium deposit — also rich in copper and gold." },
  { id: 'mount-lyell', name: 'Mount Lyell', lat: -42.10, lon: 145.73,
    minerals: ['pyrite', 'copper'], state: 'TAS',
    desc: 'Over a century of copper extraction in the rugged West Coast wilderness of Tasmania.' },
];

// ---- Map projection -------------------------------------------------------

const AU_N = -9.5, AU_S = -43.8, AU_W = 113.0, AU_E = 153.8;
const COS_CORR = Math.cos(26 * Math.PI / 180);

function projectCoord(lat: number, lon: number, w: number, h: number): [number, number] {
  const pad    = Math.min(w, h) * 0.05;
  const lonExt = (AU_E - AU_W) * COS_CORR;
  const latExt = Math.abs(AU_N - AU_S);
  const avW    = w - 2 * pad;
  const avH    = h - 2 * pad;
  const sc     = Math.min(avW / lonExt, avH / latExt);
  const ox     = pad + (avW - lonExt * sc) / 2;
  const oy     = pad + (avH - latExt * sc) / 2;
  return [ox + (lon - AU_W) * COS_CORR * sc, oy + (AU_N - lat) * sc];
}

// ---- Cave game types + helpers --------------------------------------------

interface CaveDeposit {
  id: string; mineral: Mineral;
  cx: number; cy: number; rx: number; ry: number;
  hp: number; maxHp: number;
  blob:     [number, number][];
  cracks:   [number, number][][];
  sparkles: [number, number][];
  extracted: boolean;
}

interface Particle {
  x: number; y: number; vx: number; vy: number;
  color: string; alpha: number; size: number;
}

interface Stal { x: number; w: number; h: number; shade: number; }

function seededRng(seed: number): () => number {
  let s = seed | 0;
  return () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; };
}

function makeBlob(n: number, rng: () => number): [number, number][] {
  return Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2;
    const r = 0.72 + rng() * 0.56;
    return [Math.cos(a) * r, Math.sin(a) * r] as [number, number];
  });
}

function makeCracks(count: number, rng: () => number): [number, number][][] {
  return Array.from({ length: count }, (_, i) => {
    let angle = (i / count) * Math.PI * 2 + (rng() - 0.5) * 0.6;
    const len  = 0.32 + rng() * 0.5;
    const segs: [number, number][] = [];
    let rem = len;
    while (rem > 0.05) {
      const segLen = Math.min(rem, 0.08 + rng() * 0.12);
      angle += (rng() - 0.5) * 0.9;
      segs.push([Math.cos(angle) * segLen, Math.sin(angle) * segLen]);
      rem -= segLen;
    }
    return segs;
  });
}

function makeSparkles(count: number, rng: () => number): [number, number][] {
  return Array.from({ length: count }, () => {
    const a = rng() * Math.PI * 2;
    const r = 0.15 + rng() * 0.55;
    return [Math.cos(a) * r, Math.sin(a) * r] as [number, number];
  });
}

function createDeposit(
  mineral: Mineral, cx: number, cy: number, rx: number, ry: number, hp: number
): CaveDeposit {
  const rng = seededRng(Math.floor(cx * 7919 + cy * 6271));
  return {
    id: `${mineral.id}-${(cx * 1000) | 0}`,
    mineral, cx, cy, rx, ry, hp, maxHp: hp,
    blob:     makeBlob(12, rng),
    cracks:   makeCracks(8, rng),
    sparkles: makeSparkles(7, rng),
    extracted: false,
  };
}

const DEPOSIT_LAYOUTS: [number, number, number, number][][] = [
  [[0.50, 0.42, 0.13, 0.15]],
  [[0.30, 0.40, 0.11, 0.12], [0.70, 0.42, 0.11, 0.13]],
  [[0.22, 0.38, 0.10, 0.11], [0.52, 0.44, 0.11, 0.12], [0.78, 0.40, 0.10, 0.11]],
];

const STALS: Stal[] = (() => {
  const rng = seededRng(55721);
  const stals: Stal[] = [];
  let x = 0.01;
  while (x < 1.0) {
    const w = 0.03 + rng() * 0.08;
    stals.push({ x: x + w * 0.3, w, h: 0.04 + rng() * 0.16, shade: rng() });
    x += w * 0.55 + rng() * 0.05;
  }
  return stals;
})();

function hexToRgb(hex: string): [number, number, number] {
  const c = parseInt(hex.replace('#', ''), 16);
  return [(c >> 16) & 0xff, (c >> 8) & 0xff, c & 0xff];
}

// Mineral scoring and rarity -----------------------------------------------

const MINERAL_PTS: Record<string, number> = {
  diamond: 200, ruby: 180, sapphire: 160, emerald: 150, topaz: 130,
  tourmaline: 110, amethyst: 90, citrine: 85, peridot: 80,
  gold: 120, copper: 55, pyrite: 50, galena: 60,
  hematite: 45, magnetite: 40, fluorite: 35,
  malachite: 30, azurite: 30, rhodochrosite: 25,
  halite: 15, calcite: 18, gypsum: 12, sulfur: 20,
};

function mineralPts(id: string): number { return MINERAL_PTS[id] ?? 30; }

function getRarity(m: Mineral): { label: string; color: string } {
  const mohs = parseFloat(m.mohs);
  if (m.luster === 'Adamantine' || mohs >= 9)    return { label: 'Legendary', color: '#f4e8b3' };
  if (mohs >= 7   || m.transmission > 0.5)       return { label: 'Rare',      color: '#c77dff' };
  if (mohs >= 5   || m.metalness > 0.8)          return { label: 'Uncommon',  color: '#4cc9f0' };
  return { label: 'Common', color: '#8ecae6' };
}

// ---- Canvas helpers -------------------------------------------------------

function traceBlobPath(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number, rx: number, ry: number,
  blob: [number, number][]
) {
  const n = blob.length;
  const bsx = (blob[n - 1][0] + blob[0][0]) / 2;
  const bsy = (blob[n - 1][1] + blob[0][1]) / 2;
  ctx.beginPath();
  ctx.moveTo(cx + bsx * rx, cy + bsy * ry);
  for (let i = 0; i < n; i++) {
    const [px, py] = blob[i];
    const [nx, ny] = blob[(i + 1) % n];
    ctx.quadraticCurveTo(
      cx + px * rx, cy + py * ry,
      cx + (px + nx) / 2 * rx, cy + (py + ny) / 2 * ry
    );
  }
  ctx.closePath();
}

// ---- Cave background ------------------------------------------------------

function drawCaveBackground(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const bg = ctx.createLinearGradient(0, 0, 0, h);
  bg.addColorStop(0,    '#0d0a06');
  bg.addColorStop(0.12, '#1d1610');
  bg.addColorStop(0.3,  '#2a1f14');
  bg.addColorStop(0.62, '#311e12');
  bg.addColorStop(0.86, '#251508');
  bg.addColorStop(1,    '#180e06');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  // Rock strata
  for (let i = 0; i < 6; i++) {
    const y = h * (0.18 + i * 0.12);
    ctx.fillStyle = `rgba(${170 + i * 8},${100 + i * 6},${50 + i * 4},${0.035 + i * 0.008})`;
    ctx.fillRect(0, y, w, 1 + (i % 2) * 2);
  }

  // Stalactites
  STALS.forEach(s => {
    const sx = s.x * w, sw = s.w * w, sh = s.h * h;
    const v = (s.shade * 28) | 0;
    ctx.beginPath();
    ctx.moveTo(sx - sw / 2, 0);
    ctx.lineTo(sx + sw / 2, 0);
    ctx.lineTo(sx + sw * 0.12, sh * 0.84);
    ctx.lineTo(sx, sh);
    ctx.lineTo(sx - sw * 0.12, sh * 0.84);
    ctx.closePath();
    ctx.fillStyle = `rgb(${10 + v},${7 + ((v * 2 / 3) | 0)},${4 + ((v / 2) | 0)})`;
    ctx.fill();
    ctx.strokeStyle = 'rgba(217,142,60,0.10)';
    ctx.lineWidth = 0.5;
    ctx.stroke();
  });

  // Ceiling darkening
  const ceil = ctx.createLinearGradient(0, 0, 0, h * 0.20);
  ceil.addColorStop(0, 'rgba(0,0,0,0.90)');
  ceil.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = ceil;
  ctx.fillRect(0, 0, w, h * 0.20);

  // Perspective floor
  ctx.beginPath();
  ctx.moveTo(-w * 0.05, h);
  ctx.lineTo(w * 1.05, h);
  ctx.lineTo(w * 0.63, h * 0.78);
  ctx.lineTo(w * 0.37, h * 0.78);
  ctx.closePath();
  const fg = ctx.createLinearGradient(0, h * 0.78, 0, h);
  fg.addColorStop(0, '#180e06');
  fg.addColorStop(1, '#0c0704');
  ctx.fillStyle = fg;
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(w * 0.37, h * 0.78);
  ctx.lineTo(w * 0.63, h * 0.78);
  ctx.strokeStyle = 'rgba(217,142,60,0.10)';
  ctx.lineWidth = 1;
  ctx.stroke();

  // Side vignettes
  const vL = ctx.createLinearGradient(0, 0, w * 0.22, 0);
  vL.addColorStop(0, 'rgba(0,0,0,0.72)');
  vL.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = vL;
  ctx.fillRect(0, 0, w, h);

  const vR = ctx.createLinearGradient(w, 0, w * 0.78, 0);
  vR.addColorStop(0, 'rgba(0,0,0,0.72)');
  vR.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = vR;
  ctx.fillRect(0, 0, w, h);
}

// ---- Deposit rendering ----------------------------------------------------

function drawDeposits(
  ctx: CanvasRenderingContext2D, w: number, h: number,
  deposits: CaveDeposit[], frame: number
) {
  deposits.forEach(dep => {
    const cx = dep.cx * w, cy = dep.cy * h;
    const rx = dep.rx * w, ry = dep.ry * h;

    if (dep.extracted) {
      ctx.beginPath();
      ctx.ellipse(cx, cy, rx * 0.9, ry * 0.9, 0, 0, Math.PI * 2);
      const eg = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(rx, ry));
      eg.addColorStop(0, 'rgba(0,0,0,0.80)');
      eg.addColorStop(1, 'rgba(0,0,0,0.15)');
      ctx.fillStyle = eg;
      ctx.fill();
      return;
    }

    const [cr, cg, cb] = hexToRgb(dep.mineral.color);
    const hiCol = `rgb(${Math.min(255, cr + 85)},${Math.min(255, cg + 65)},${Math.min(255, cb + 45)})`;
    const loCol = `rgb(${Math.max(0, cr - 65)},${Math.max(0, cg - 45)},${Math.max(0, cb - 35)})`;

    // 1. Rock matrix shadow (embedded-in-rock look)
    ctx.save();
    traceBlobPath(ctx, cx + 2, cy + 4, rx * 1.14, ry * 1.14, dep.blob);
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.shadowColor = 'rgba(0,0,0,0.95)';
    ctx.shadowBlur = 12;
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.restore();

    // 2. Main ore blob with radial gradient
    ctx.save();
    traceBlobPath(ctx, cx, cy, rx, ry, dep.blob);
    const grd = ctx.createRadialGradient(cx - rx * 0.28, cy - ry * 0.32, 0, cx, cy, Math.max(rx, ry));
    grd.addColorStop(0, hiCol);
    grd.addColorStop(0.48, dep.mineral.color);
    grd.addColorStop(1,   loCol);
    ctx.fillStyle = grd;
    ctx.fill();

    // 3. Ore rim highlight
    ctx.strokeStyle = 'rgba(255,255,255,0.18)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.restore();

    // 4. Type-specific surface detail
    const isMetallic   = dep.mineral.metalness > 0.5;
    const isGem        = dep.mineral.transmission > 0.3;
    const isAdamantine = dep.mineral.luster === 'Adamantine';

    if (isMetallic) {
      // Metallic sheen band + cubic/hexagonal facet lines
      ctx.save();
      traceBlobPath(ctx, cx, cy, rx, ry, dep.blob);
      ctx.clip();

      // Horizontal specular band
      const sheen = ctx.createLinearGradient(cx - rx, cy - ry * 0.18, cx + rx, cy + ry * 0.18);
      sheen.addColorStop(0,    'rgba(255,255,255,0)');
      sheen.addColorStop(0.35, 'rgba(255,255,255,0.18)');
      sheen.addColorStop(0.5,  'rgba(255,255,255,0.32)');
      sheen.addColorStop(0.65, 'rgba(255,255,255,0.18)');
      sheen.addColorStop(1,    'rgba(255,255,255,0)');
      ctx.fillStyle = sheen;
      ctx.fillRect(cx - rx, cy - ry, rx * 2, ry * 2);

      // Crystal facet lines (cubic for cube habit, hexagonal otherwise)
      const facetN = dep.mineral.habit === 'cube' ? 4 : 6;
      ctx.globalAlpha = 0.28;
      ctx.strokeStyle = 'rgba(255,255,255,0.7)';
      ctx.lineWidth = 0.8;
      for (let i = 0; i < facetN; i++) {
        const ang = (i / facetN) * Math.PI;
        const cos = Math.cos(ang), sin = Math.sin(ang);
        ctx.beginPath();
        ctx.moveTo(cx - cos * rx * 0.85, cy - sin * ry * 0.85);
        ctx.lineTo(cx + cos * rx * 0.85, cy + sin * ry * 0.85);
        ctx.stroke();
      }
      ctx.restore();
    }

    if (isGem) {
      // Gem facet star + inner glow
      ctx.save();
      traceBlobPath(ctx, cx, cy, rx, ry, dep.blob);
      ctx.clip();

      // Inner glow
      const glow = ctx.createRadialGradient(cx - rx*0.25, cy - ry*0.3, 0, cx, cy, Math.max(rx, ry) * 0.9);
      glow.addColorStop(0, `rgba(${Math.min(255, cr + 120)},${Math.min(255, cg + 120)},${Math.min(255, cb + 120)},0.35)`);
      glow.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = glow;
      ctx.fillRect(cx - rx, cy - ry, rx * 2, ry * 2);

      // Facet lines (more for adamantine / diamond)
      const fN = isAdamantine ? 8 : 6;
      ctx.globalAlpha = 0.3;
      ctx.strokeStyle = 'rgba(255,255,255,0.85)';
      ctx.lineWidth = 0.7;
      for (let i = 0; i < fN; i++) {
        const ang = (i / fN) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + Math.cos(ang) * rx * 0.82, cy + Math.sin(ang) * ry * 0.82);
        ctx.stroke();
      }
      ctx.restore();
    }

    if (isAdamantine) {
      // Rainbow prismatic rays radiating from center
      const rainbowColors = ['#ff4444', '#ff9933', '#ffee22', '#33dd55', '#3399ff', '#9944ff'];
      ctx.save();
      traceBlobPath(ctx, cx, cy, rx * 1.15, ry * 1.15, dep.blob);
      ctx.clip();
      ctx.globalAlpha = 0.18;
      ctx.lineWidth = 3;
      rainbowColors.forEach((col, i) => {
        const ang = (i / rainbowColors.length) * Math.PI * 2 + frame * 0.012;
        ctx.strokeStyle = col;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + Math.cos(ang) * rx * 1.1, cy + Math.sin(ang) * ry * 1.1);
        ctx.stroke();
      });
      ctx.restore();
    }

    // 5. Bright specular highlight spot (top-left)
    ctx.save();
    traceBlobPath(ctx, cx, cy, rx, ry, dep.blob);
    ctx.clip();
    const spec = ctx.createRadialGradient(cx - rx * 0.32, cy - ry * 0.38, 0, cx - rx * 0.1, cy - ry * 0.1, rx * 0.7);
    spec.addColorStop(0, 'rgba(255,255,255,0.55)');
    spec.addColorStop(0.3, 'rgba(255,255,255,0.12)');
    spec.addColorStop(1,   'rgba(255,255,255,0)');
    ctx.fillStyle = spec;
    ctx.fillRect(cx - rx, cy - ry, rx * 2, ry * 2);
    ctx.restore();

    // 6. Vein tendrils into surrounding rock
    const rng2 = seededRng(Math.floor(dep.cx * 9337 + dep.cy * 8191));
    ctx.save();
    ctx.strokeStyle = `rgba(${cr},${cg},${cb},0.22)`;
    ctx.lineWidth = 1;
    for (let v = 0; v < 4; v++) {
      const ang  = rng2() * Math.PI * 2;
      const len  = 0.25 + rng2() * 0.3;
      const bx   = cx + Math.cos(ang) * rx;
      const by   = cy + Math.sin(ang) * ry;
      const ex   = bx + Math.cos(ang) * rx * len;
      const ey   = by + Math.sin(ang) * ry * len;
      const kx   = (bx + ex) / 2 + (rng2() - 0.5) * rx * 0.5;
      const ky   = (by + ey) / 2 + (rng2() - 0.5) * ry * 0.5;
      ctx.beginPath();
      ctx.moveTo(bx, by);
      ctx.quadraticCurveTo(kx, ky, ex, ey);
      ctx.stroke();
    }
    ctx.restore();

    // 7. Twinkling sparkles
    dep.sparkles.forEach(([spx, spy], si) => {
      if ((frame + si * 7) % 14 > 6) return;
      const sx = cx + spx * rx, sy = cy + spy * ry;
      ctx.beginPath();
      ctx.arc(sx, sy, isAdamantine ? 2.5 : 1.8, 0, Math.PI * 2);
      ctx.fillStyle = isAdamantine ? `hsl(${(frame * 3 + si * 60) % 360},90%,90%)` : 'rgba(255,255,255,0.88)';
      ctx.fill();
    });

    // 8. Progressive cracks
    const damage    = 1 - dep.hp / dep.maxHp;
    const crackCount = Math.ceil(damage * dep.cracks.length);
    dep.cracks.slice(0, crackCount).forEach(segs => {
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      let ccx = cx, ccy = cy;
      segs.forEach(([ddx, ddy]) => {
        ccx += ddx * rx;
        ccy += ddy * ry;
        ctx.lineTo(ccx, ccy);
      });
      ctx.strokeStyle = 'rgba(0,0,0,0.80)';
      ctx.lineWidth = 1.8;
      ctx.stroke();
      ctx.strokeStyle = 'rgba(255,240,200,0.18)';
      ctx.lineWidth = 0.5;
      ctx.stroke();
    });

    // 9. Mineral name label
    const fontSize = Math.max(11, Math.min(rx * 0.38, 16));
    ctx.font = `bold ${fontSize}px Inter, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(255,255,255,0.92)';
    ctx.shadowColor = 'rgba(0,0,0,0.9)';
    ctx.shadowBlur = 7;
    ctx.fillText(dep.mineral.name, cx, cy + ry * 0.08);
    ctx.shadowBlur = 0;

    if (dep.hp === dep.maxHp) {
      ctx.font = `${Math.max(9, (fontSize * 0.62) | 0)}px JetBrains Mono, monospace`;
      ctx.fillStyle = 'rgba(255,255,255,0.42)';
      ctx.fillText('tap to mine', cx, cy + ry * 0.48);
    } else {
      // HP bar
      const barW = rx * 1.6, barH = 5;
      const barX = cx - barW / 2, barY = cy - ry - 13;
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      ctx.fillRect(barX, barY, barW, barH);
      ctx.fillStyle = `rgba(${cr},${cg},${cb},0.88)`;
      ctx.fillRect(barX, barY, barW * (dep.hp / dep.maxHp), barH);
    }
  });
}

function drawParticles(ctx: CanvasRenderingContext2D, particles: Particle[]) {
  particles.forEach(p => {
    ctx.globalAlpha = Math.max(0, p.alpha);
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fillStyle = p.color;
    ctx.fill();
  });
  ctx.globalAlpha = 1;
}

// ---- Phase types ----------------------------------------------------------

type GamePhase = 'map' | 'zoom' | 'cave' | 'popup';
interface DotPos { id: string; x: number; y: number }
interface ExtractFlash { text: string; x: number; y: number; key: number }

// ---- Component ------------------------------------------------------------

interface MineGameProps { pathname: string; onNavigate: (path: string) => void; }

export function MineGame({ pathname, onNavigate }: MineGameProps) {
  const mapCanvasRef  = useRef<HTMLCanvasElement>(null);
  const caveCanvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef        = useRef(0);
  const depositsRef   = useRef<CaveDeposit[]>([]);
  const particlesRef  = useRef<Particle[]>([]);
  const frameRef      = useRef(0);
  const phaseRef      = useRef<GamePhase>('map');

  // Game state
  const scoreRef    = useRef(0);
  const comboRef    = useRef(1);
  const lastTapRef  = useRef(0);
  const lastPtsRef  = useRef(0);

  const [phase,           setPhase]           = useState<GamePhase>('map');
  const [activeSite,      setActiveSite]       = useState<MineSite | null>(null);
  const [zoomPos,         setZoomPos]          = useState({ x: 0, y: 0 });
  const [zoomColor,       setZoomColor]        = useState('#d4af52');
  const [dotPositions,    setDotPositions]     = useState<DotPos[]>([]);
  const [selectedMineral, setSelectedMineral]  = useState<Mineral | null>(null);
  const [pickaxeSwing,    setPickaxeSwing]     = useState(false);
  const [score,           setScore]            = useState(0);
  const [combo,           setCombo]            = useState(1);
  const [comboAnim,       setComboAnim]        = useState(false);
  const [extractFlash,    setExtractFlash]     = useState<ExtractFlash | null>(null);
  const [lastPts,         setLastPts]          = useState(0);

  // ---- Map drawing -------------------------------------------------------
  const drawMap = useCallback(() => {
    const canvas = mapCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const w = canvas.width, h = canvas.height;
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

    ctx.fillStyle = 'rgba(242,232,216,0.22)';
    ctx.font = `${Math.max(9, w * 0.015)}px JetBrains Mono, monospace`;
    ctx.textAlign = 'center';
    const labels: [string, number, number][] = [
      ['WA', -25.0, 121.0], ['NT', -19.0, 133.5], ['QLD', -22.0, 143.5],
      ['SA', -31.0, 135.0], ['NSW', -33.0, 146.0], ['VIC', -37.0, 144.5],
    ];
    labels.forEach(([label, lat, lon]) => {
      const [x, y] = projectCoord(lat, lon, w, h);
      ctx.fillText(label, x, y);
    });

    setDotPositions(
      MINE_SITES.map(s => {
        const [x, y] = projectCoord(s.lat, s.lon, w, h);
        return { id: s.id, x, y };
      })
    );
  }, []);

  useEffect(() => {
    const canvas = mapCanvasRef.current;
    if (!canvas) return;
    const resize = () => {
      canvas.width  = canvas.clientWidth;
      canvas.height = canvas.clientHeight;
      drawMap();
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    return () => ro.disconnect();
  }, [drawMap]);

  useEffect(() => { if (phase === 'map') drawMap(); }, [phase, drawMap]);

  // ---- Cave rAF loop -----------------------------------------------------
  const startCave = useCallback((canvas: HTMLCanvasElement) => {
    cancelAnimationFrame(rafRef.current);

    const tick = () => {
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      const w = canvas.clientWidth, h = canvas.clientHeight;
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w; canvas.height = h;
      }

      particlesRef.current = particlesRef.current
        .map(p => ({ ...p, x: p.x + p.vx, y: p.y + p.vy, vy: p.vy + 0.15, alpha: p.alpha * 0.94 }))
        .filter(p => p.alpha > 0.03);

      drawCaveBackground(ctx, w, h);
      drawDeposits(ctx, w, h, depositsRef.current, frameRef.current);
      drawParticles(ctx, particlesRef.current);
      frameRef.current++;
      rafRef.current = requestAnimationFrame(tick);
    };
    tick();
  }, []);

  // ---- Site click → zoom → cave -----------------------------------------
  const handleSiteClick = useCallback((site: MineSite, x: number, y: number) => {
    const primary = MINERALS.find(m => m.id === site.minerals[0]);
    setActiveSite(site);
    setZoomPos({ x, y });
    setZoomColor(primary?.color ?? '#d4af52');
    setPhase('zoom');
    phaseRef.current = 'zoom';
  }, []);

  const onZoomEnd = useCallback(() => {
    if (!activeSite) return;
    const minerals = activeSite.minerals
      .slice(0, 3)
      .map(id => MINERALS.find(m => m.id === id))
      .filter((m): m is Mineral => !!m);
    const n      = Math.min(minerals.length, 3);
    const layout = DEPOSIT_LAYOUTS[n - 1] ?? DEPOSIT_LAYOUTS[0];
    depositsRef.current = minerals.map((m, i) => {
      const [cx, cy, rx, ry] = layout[i] ?? layout[0];
      return createDeposit(m, cx, cy, rx, ry, 8);
    });
    particlesRef.current = [];
    frameRef.current = 0;
    // Reset combo on new cave
    comboRef.current  = 1;
    lastTapRef.current = 0;
    setCombo(1);
    setPhase('cave');
    phaseRef.current = 'cave';
  }, [activeSite]);

  useEffect(() => {
    if (phase === 'cave') {
      const canvas = caveCanvasRef.current;
      if (canvas) startCave(canvas);
    }
    if (phase !== 'cave') cancelAnimationFrame(rafRef.current);
  }, [phase, startCave]);

  // ---- Tap / click mechanic with score + combo --------------------------
  const onCaveTap = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = caveCanvasRef.current;
    if (!canvas || phaseRef.current !== 'cave') return;
    const rect = canvas.getBoundingClientRect();
    const px = (e.clientX - rect.left) / canvas.clientWidth;
    const py = (e.clientY - rect.top)  / canvas.clientHeight;

    for (const dep of depositsRef.current) {
      if (dep.extracted) continue;
      const dx = (px - dep.cx) / dep.rx;
      const dy = (py - dep.cy) / dep.ry;
      if (dx * dx + dy * dy > 1.6) continue;

      // Combo logic
      const now = Date.now();
      if (now - lastTapRef.current < 600) {
        comboRef.current = Math.min(comboRef.current + 1, 8);
      } else {
        comboRef.current = 1;
      }
      lastTapRef.current = now;
      setCombo(comboRef.current);
      if (comboRef.current > 1) {
        setComboAnim(true);
        setTimeout(() => setComboAnim(false), 220);
      }

      dep.hp = Math.max(0, dep.hp - 1);

      // Rock-chip particles
      const hitX = e.clientX - rect.left;
      const hitY = e.clientY - rect.top;
      const [pr, pg, pb] = hexToRgb(dep.mineral.color);
      for (let i = 0; i < 8; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 1.5 + Math.random() * 3;
        particlesRef.current.push({
          x: hitX, y: hitY,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 2,
          color: `rgb(${pr},${pg},${pb})`,
          alpha: 0.9 + Math.random() * 0.1,
          size: 2 + Math.random() * 3,
        });
      }

      // Tap points
      const tapPts = Math.ceil(parseFloat(dep.mineral.mohs) / 3) * comboRef.current;
      scoreRef.current += tapPts;
      setScore(scoreRef.current);

      setPickaxeSwing(true);
      setTimeout(() => setPickaxeSwing(false), 200);

      if (dep.hp === 0) {
        dep.extracted = true;
        const cw = canvas.clientWidth, ch = canvas.clientHeight;

        // Extraction burst particles
        for (let i = 0; i < 30; i++) {
          const angle = Math.random() * Math.PI * 2;
          const speed = 2 + Math.random() * 6.5;
          particlesRef.current.push({
            x: dep.cx * cw, y: dep.cy * ch,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed - 3.5,
            color: i % 3 === 0 ? '#fff' : `rgb(${pr},${pg},${pb})`,
            alpha: 1, size: 1.5 + Math.random() * 4.5,
          });
        }

        // Extraction bonus
        const extractPts = mineralPts(dep.mineral.id) * Math.max(1, comboRef.current - 1);
        scoreRef.current += extractPts;
        lastPtsRef.current = extractPts;
        setScore(scoreRef.current);
        setLastPts(extractPts);

        // "EXTRACTED!" flash text
        setExtractFlash({ text: 'EXTRACTED!', x: dep.cx * cw, y: dep.cy * ch, key: Date.now() });
        setTimeout(() => setExtractFlash(null), 1100);

        const mineral = dep.mineral;
        setTimeout(() => {
          cancelAnimationFrame(rafRef.current);
          setSelectedMineral(mineral);
          setPhase('popup');
          phaseRef.current = 'popup';
        }, 800);
      }
      break;
    }
  }, []);

  const goToMap = () => {
    cancelAnimationFrame(rafRef.current);
    setActiveSite(null);
    setSelectedMineral(null);
    setPhase('map');
    phaseRef.current = 'map';
  };

  const goToCave = () => {
    setSelectedMineral(null);
    depositsRef.current.forEach(d => { if (d.extracted) { d.extracted = false; d.hp = d.maxHp; } });
    setPhase('cave');
    phaseRef.current = 'cave';
  };

  useEffect(() => () => cancelAnimationFrame(rafRef.current), []);

  // ---- Render ------------------------------------------------------------
  return (
    <div className="mine-root">
      <GeoNav pathname={pathname} onNavigate={onNavigate} />

      {/* MAP + ZOOM phases */}
      <div
        className="mine-map-wrap"
        style={{ visibility: phase === 'cave' || phase === 'popup' ? 'hidden' : 'visible' }}
      >
        <canvas ref={mapCanvasRef} className="mine-map-canvas" />

        {phase === 'map' && dotPositions.map(({ id, x, y }) => {
          const site  = MINE_SITES.find(s => s.id === id)!;
          const color = MINERALS.find(m => m.id === site.minerals[0])?.color ?? '#d4af52';
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

        {phase === 'zoom' && (
          <div
            className="mine-zoom-circle"
            style={{ left: zoomPos.x, top: zoomPos.y, background: zoomColor } as CSSProperties}
            onAnimationEnd={onZoomEnd}
          />
        )}

        <div className="mine-map-title">
          <span>Australian Mine Sites</span>
          <span className="mine-map-sub">Click a site to explore</span>
        </div>

        {/* Persistent score display on map */}
        {score > 0 && (
          <div className="mine-map-score">{score} pts</div>
        )}
      </div>

      {/* CAVE phase — first-person canvas */}
      {(phase === 'cave' || phase === 'popup') && activeSite && (
        <div className="mine-cave-root">
          {/* HUD — site info */}
          <div className="mine-cave-hud">
            <span className="mine-cave-site">{activeSite.name} — {activeSite.state}</span>
            <span className="mine-cave-sub">{activeSite.desc}</span>
          </div>

          {/* Score + combo (top right) */}
          {phase === 'cave' && (
            <div className="mine-cave-score">
              <span className="mine-score-val">{score}</span>
              <span className="mine-score-label">pts</span>
              {combo > 1 && (
                <span className={`mine-combo${comboAnim ? ' mine-combo-pop' : ''}`}>
                  ×{combo}
                </span>
              )}
            </div>
          )}

          {phase === 'cave' && (
            <>
              <canvas
                ref={caveCanvasRef}
                className="mine-cave-canvas"
                onPointerDown={onCaveTap}
                style={{ touchAction: 'none' }}
              />
              {/* "EXTRACTED!" float text */}
              {extractFlash && (
                <div
                  key={extractFlash.key}
                  className="mine-extract-flash"
                  style={{ left: extractFlash.x, top: extractFlash.y }}
                >
                  {extractFlash.text}
                </div>
              )}
              <div
                className={`mine-pickaxe${pickaxeSwing ? ' mine-pickaxe-swing' : ''}`}
                aria-hidden="true"
              >
                ⛏️
              </div>
            </>
          )}

          <button className="mine-back-btn" onClick={goToMap}>← Back to Map</button>
        </div>
      )}

      {/* POPUP phase */}
      {phase === 'popup' && selectedMineral && (() => {
        const rarity = getRarity(selectedMineral);
        return (
          <div className="mine-popup-overlay" role="dialog" aria-label={`Mineral info: ${selectedMineral.name}`}>
            <div className="mine-popup">
              <div
                className="mine-popup-gem"
                style={{ background: `radial-gradient(ellipse at 35% 30%, ${selectedMineral.color}ee, ${selectedMineral.color}55)` }}
              />
              <div className="mine-popup-formula">{selectedMineral.formula}</div>
              <div className="mine-popup-rarity" style={{ color: rarity.color }}>{rarity.label}</div>
              <h2 className="mine-popup-name">{selectedMineral.name}</h2>
              {lastPts > 0 && (
                <div className="mine-popup-pts">+{lastPts} extraction bonus</div>
              )}
              <p className="mine-popup-blurb">{selectedMineral.blurb}</p>
              <div className="mine-popup-grid">
                <div><span>Hardness</span><b>{selectedMineral.mohs} Mohs</b></div>
                <div><span>System</span><b>{selectedMineral.system}</b></div>
                <div><span>Luster</span><b>{selectedMineral.luster}</b></div>
                <div><span>Class</span><b>{selectedMineral.group}</b></div>
              </div>
              <p className="mine-popup-uses">{selectedMineral.uses}</p>
              <div className="mine-popup-score-total">
                <span>Total Score</span>
                <strong>{score} pts</strong>
              </div>
              <div className="mine-popup-actions">
                <button className="mine-action-btn mine-action-primary" onClick={goToCave}>Mine More</button>
                <button className="mine-action-btn" onClick={goToMap}>New Site</button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
