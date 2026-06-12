// ---------------------------------------------------------------------------
// StarScape — procedural texture generation
// ---------------------------------------------------------------------------
// Every texture in the explorer is generated in-browser on a canvas at load
// time: no downloads, no external assets, no IP concerns, CSP-safe.
// Deterministic value-noise (seeded) keeps planets stable between visits.
// Resolutions kept at 256x128 so each texture generates in ~10-20ms — they
// are streamed in via a deferred queue to avoid blocking the main thread.
// ---------------------------------------------------------------------------

import * as THREE from 'three';

// --- deterministic value noise ----------------------------------------------

function hash2(x: number, y: number, seed: number): number {
  const s = Math.sin(x * 127.1 + y * 311.7 + seed * 74.7) * 43758.5453;
  return s - Math.floor(s);
}

function valueNoise(x: number, y: number, seed: number): number {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const xf = x - xi;
  const yf = y - yi;
  const u = xf * xf * (3 - 2 * xf);
  const v = yf * yf * (3 - 2 * yf);
  const a = hash2(xi, yi, seed);
  const b = hash2(xi + 1, yi, seed);
  const c = hash2(xi, yi + 1, seed);
  const d = hash2(xi + 1, yi + 1, seed);
  const ab = a + (b - a) * u;
  const cd = c + (d - c) * u;
  return ab + (cd - ab) * v;
}

function fbm(x: number, y: number, seed: number, octaves = 4): number {
  let value = 0;
  let amp = 0.5;
  let freq = 1;
  for (let i = 0; i < octaves; i++) {
    value += amp * valueNoise(x * freq, y * freq, seed + i * 13.7);
    freq *= 2;
    amp *= 0.5;
  }
  return value;
}

// Horizontally seamless fbm: blend back toward lon=0 near the wrap seam
function fbmWrap(lon: number, lat: number, sx: number, sy: number, seed: number, oct = 4): number {
  const n1 = fbm(lon * sx, lat * sy, seed, oct);
  if (lon < 0.78) return n1;
  const n2 = fbm((lon - 1) * sx, lat * sy, seed, oct);
  const t = (lon - 0.78) / 0.22;
  return n1 * (1 - t) + n2 * t;
}

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
}

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

function makeCanvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('2D canvas context unavailable');
  return [canvas, ctx];
}

function toTexture(canvas: HTMLCanvasElement): THREE.CanvasTexture {
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

// --- planet surface textures ---------------------------------------------------

export function planetTexture(id: string, baseColor: string): THREE.CanvasTexture {
  const W = 256;
  const H = 128;
  const [canvas, ctx] = makeCanvas(W, H);
  const img = ctx.createImageData(W, H);
  const [br, bg, bb] = hexToRgb(baseColor);
  const seed = id.length * 17.3 + id.charCodeAt(0);

  for (let y = 0; y < H; y++) {
    const lat = y / H; // 0 = north pole, 1 = south pole
    const polar = Math.abs(lat - 0.5) * 2; // 0 equator → 1 poles
    for (let x = 0; x < W; x++) {
      const lon = x / W;
      let r = br;
      let g = bg;
      let b = bb;

      if (id === 'earth') {
        const n = fbmWrap(lon, lat, 7, 4, seed, 5);
        const isLand = n > 0.52;
        if (isLand) {
          const veg = fbmWrap(lon, lat, 13, 8, seed + 5, 3);
          r = 60 + veg * 90;
          g = 105 + veg * 70;
          b = 45 + veg * 35;
        } else {
          const depth = clamp01((0.52 - n) * 4);
          r = 18 + depth * 10;
          g = 55 + depth * 25;
          b = 110 + depth * 50;
        }
        // polar ice with noisy edge
        if (polar > 0.82 + fbmWrap(lon, lat, 18, 18, seed + 9, 2) * 0.1) {
          r = g = b = 235;
        }
      } else if (id === 'mars') {
        const n = fbmWrap(lon, lat, 9, 5, seed, 5);
        const dark = clamp01((n - 0.45) * 2.2);
        r = br - dark * 70 + n * 25;
        g = bg - dark * 35 + n * 15;
        b = bb - dark * 12;
        if (polar > 0.9 + fbmWrap(lon, lat, 14, 14, seed + 3, 2) * 0.06) {
          r = g = b = 228;
        }
      } else if (id === 'venus') {
        // swirling sulphuric cloud bands sheared by latitude
        const swirl = fbmWrap((lon + lat * 0.35) % 1, lat, 5, 9, seed, 4);
        const tint = 0.78 + swirl * 0.44;
        r = br * tint;
        g = bg * tint;
        b = bb * tint * 0.95;
      } else if (id === 'mercury') {
        const n = fbmWrap(lon, lat, 11, 7, seed, 5);
        const tone = 0.6 + n * 0.7;
        r = br * tone;
        g = bg * tone;
        b = bb * tone;
      } else if (id === 'jupiter' || id === 'saturn') {
        // turbulent latitude bands
        const turb = fbmWrap(lon, lat, 5, 3, seed + 2, 4) * 0.5;
        const band = Math.sin((lat + turb * 0.18) * Math.PI * (id === 'jupiter' ? 13 : 9));
        const shade = 0.82 + band * 0.2 + turb * 0.25;
        r = br * shade;
        g = bg * shade;
        b = bb * shade * (id === 'jupiter' ? 0.92 : 1);
      } else {
        // ice giants: smooth with faint banding and methane haze
        const band = Math.sin(lat * Math.PI * 5 + fbmWrap(lon, lat, 4, 3, seed, 3));
        const shade = 0.9 + band * 0.08;
        r = br * shade;
        g = bg * shade;
        b = bb * shade;
      }

      // subtle limb-to-pole falloff for depth
      const fall = 1 - polar * polar * 0.18;
      const i = (y * W + x) * 4;
      img.data[i] = clamp01((r * fall) / 255) * 255;
      img.data[i + 1] = clamp01((g * fall) / 255) * 255;
      img.data[i + 2] = clamp01((b * fall) / 255) * 255;
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);

  // Mercury: stamped craters on top of the noise base
  if (id === 'mercury') {
    for (let c = 0; c < 240; c++) {
      const cx = hash2(c, 1, seed) * W;
      const cy = hash2(c, 2, seed) * H;
      const cr = 1 + hash2(c, 3, seed) * 5;
      const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, cr);
      grad.addColorStop(0, 'rgba(0,0,0,0.35)');
      grad.addColorStop(0.7, 'rgba(0,0,0,0.12)');
      grad.addColorStop(0.85, 'rgba(255,255,255,0.18)');
      grad.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(cx, cy, cr, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Jupiter: the Great Red Spot
  if (id === 'jupiter') {
    const sx = W * 0.68;
    const sy = H * 0.64;
    for (let ring = 5; ring >= 1; ring--) {
      ctx.fillStyle = `rgba(178, 60, 30, ${0.14 * (6 - ring)})`;
      ctx.beginPath();
      ctx.ellipse(sx, sy, 4.5 * ring, 2.2 * ring, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  return toTexture(canvas);
}

// --- Earth cloud layer ------------------------------------------------------------

export function cloudTexture(): THREE.CanvasTexture {
  const W = 256;
  const H = 128;
  const [canvas, ctx] = makeCanvas(W, H);
  const img = ctx.createImageData(W, H);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const n = fbmWrap(x / W, y / H, 8, 5, 42.5, 5);
      const a = clamp01((n - 0.52) * 4) * 0.85;
      const i = (y * W + x) * 4;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = 255;
      img.data[i + 3] = a * 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return toTexture(canvas);
}

// --- ring textures (radial bands; UV.x = radial position) ---------------------------

export function ringTexture(style: 'saturn' | 'uranus'): THREE.CanvasTexture {
  const W = 512;
  const H = 8;
  const [canvas, ctx] = makeCanvas(W, H);
  for (let x = 0; x < W; x++) {
    const t = x / W;
    let alpha: number;
    let r: number, g: number, b: number;
    if (style === 'saturn') {
      const bands = fbm(t * 26, 0.5, 7.7, 3);
      alpha = 0.25 + bands * 0.75;
      // Cassini division
      if (t > 0.58 && t < 0.66) alpha *= 0.12;
      // inner edge fade
      alpha *= clamp01(t * 8) * clamp01((1 - t) * 6);
      r = 228;
      g = 209;
      b = 165;
    } else {
      alpha = t > 0.42 && t < 0.52 ? 0.35 : t > 0.7 && t < 0.74 ? 0.25 : 0.04;
      r = 160;
      g = 200;
      b = 205;
    }
    ctx.fillStyle = `rgba(${r},${g},${b},${alpha})`;
    ctx.fillRect(x, 0, 1, H);
  }
  return toTexture(canvas);
}

// --- glow sprite (radial falloff) ----------------------------------------------------

export function glowTexture(hex: string, coreWhite = true): THREE.CanvasTexture {
  const S = 128;
  const [canvas, ctx] = makeCanvas(S, S);
  const [r, g, b] = hexToRgb(hex);
  const grad = ctx.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
  if (coreWhite) grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(coreWhite ? 0.18 : 0, `rgba(${r},${g},${b},0.9)`);
  grad.addColorStop(0.45, `rgba(${r},${g},${b},0.32)`);
  grad.addColorStop(1, `rgba(${r},${g},${b},0)`);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, S, S);
  return toTexture(canvas);
}

// --- sun photosphere ---------------------------------------------------------------------

export function sunTexture(): THREE.CanvasTexture {
  const W = 256;
  const H = 128;
  const [canvas, ctx] = makeCanvas(W, H);
  const img = ctx.createImageData(W, H);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const granule = fbmWrap(x / W, y / H, 14, 9, 99.1, 5);
      const spots = fbmWrap(x / W, y / H, 5, 3, 31.7, 3);
      let bright = 0.72 + granule * 0.55;
      if (spots < 0.3) bright *= 0.45 + spots; // sunspots
      const i = (y * W + x) * 4;
      img.data[i] = clamp01(bright) * 255;
      img.data[i + 1] = clamp01(bright * 0.72) * 255;
      img.data[i + 2] = clamp01(bright * 0.35) * 255;
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return toTexture(canvas);
}

// --- black hole accretion disk (radial bands, hot inner edge) -----------------------------

export function accretionTexture(): THREE.CanvasTexture {
  const W = 512;
  const H = 8;
  const [canvas, ctx] = makeCanvas(W, H);
  for (let x = 0; x < W; x++) {
    const t = x / W; // 0 = inner edge, 1 = outer
    const heat = Math.pow(1 - t, 1.6);
    const bands = 0.6 + fbm(t * 30, 0.5, 55.5, 3) * 0.7;
    const alpha = clamp01(heat * bands) * clamp01(t * 14) * clamp01((1 - t) * 4 + 0.2);
    const r = 255;
    const g = 140 + heat * 115;
    const b = 60 + heat * 195;
    ctx.fillStyle = `rgba(${r},${Math.round(g)},${Math.round(b)},${alpha})`;
    ctx.fillRect(x, 0, 1, H);
  }
  return toTexture(canvas);
}
