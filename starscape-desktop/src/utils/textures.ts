// ---------------------------------------------------------------------------
// StarScape — procedural texture generation
// ---------------------------------------------------------------------------
// Every texture is generated in-browser on a canvas: no downloads, no external
// assets, no IP concerns, CSP-safe. Deterministic seeded value-noise keeps
// planets stable between visits.
//
// Planet/sun/cloud surfaces are HIGH-RES (1024x512) and produced as time-sliced
// "jobs": the renderer fills them a few milliseconds per frame, so detail
// streams in progressively without ever producing a long main-thread task.
// Planets also emit a matching bump map so terrain catches the sunlight.
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
  tex.anisotropy = 16;
  tex.generateMipmaps = true;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  return tex;
}

// ---------------------------------------------------------------------------
// Time-sliced texture jobs
// ---------------------------------------------------------------------------

export interface TexJob {
  map: THREE.CanvasTexture;
  bump: THREE.CanvasTexture | null;
  /** Process rows for up to budgetMs; returns true once fully complete. */
  run(budgetMs: number): boolean;
}

// --- planet surface (high-res, color + bump) -----------------------------------

export function createPlanetJob(
  id: string,
  baseColor: string,
  W = 1024,
  H = 512,
  withBump = true
): TexJob {
  const [colorCanvas, colorCtx] = makeCanvas(W, H);
  // prefill so the very first frame shows the planet's flat colour, not black
  colorCtx.fillStyle = baseColor;
  colorCtx.fillRect(0, 0, W, H);
  const colorImg = colorCtx.createImageData(W, H);

  // Bump is only worth its upload cost on rocky bodies; gas/ice giants are smooth.
  let bumpCanvas: HTMLCanvasElement | null = null;
  let bumpCtx: CanvasRenderingContext2D | null = null;
  let bumpImg: ImageData | null = null;
  let bump: THREE.CanvasTexture | null = null;
  if (withBump) {
    [bumpCanvas, bumpCtx] = makeCanvas(W, H);
    bumpCtx.fillStyle = '#808080';
    bumpCtx.fillRect(0, 0, W, H);
    bumpImg = bumpCtx.createImageData(W, H);
    bump = toTexture(bumpCanvas);
    bump.colorSpace = THREE.NoColorSpace; // bump is linear data, not colour
  }

  const [br, bg, bb] = hexToRgb(baseColor);
  const seed = id.length * 17.3 + id.charCodeAt(0);
  const map = toTexture(colorCanvas);

  let y = 0;

  const processRow = (yRow: number) => {
    const lat = yRow / H;
    const polar = Math.abs(lat - 0.5) * 2;
    for (let x = 0; x < W; x++) {
      const lon = x / W;
      let r = br;
      let g = bg;
      let b = bb;
      let height = 0.5;

      if (id === 'earth') {
        const n = fbmWrap(lon, lat, 7, 4, seed, 6);
        if (n > 0.52) {
          const veg = fbmWrap(lon, lat, 16, 9, seed + 5, 4);
          r = 52 + veg * 95;
          g = 100 + veg * 78;
          b = 40 + veg * 38;
          height = 0.55 + (n - 0.52) * 1.4 + veg * 0.15;
        } else {
          const depth = clamp01((0.52 - n) * 4);
          r = 16 + depth * 12;
          g = 52 + depth * 28;
          b = 105 + depth * 55;
          height = 0.42 - depth * 0.12;
        }
        if (polar > 0.82 + fbmWrap(lon, lat, 20, 20, seed + 9, 3) * 0.1) {
          r = g = b = 238;
          height = 0.75;
        }
      } else if (id === 'mars') {
        const n = fbmWrap(lon, lat, 10, 6, seed, 6);
        const dark = clamp01((n - 0.45) * 2.2);
        r = br - dark * 72 + n * 26;
        g = bg - dark * 36 + n * 16;
        b = bb - dark * 12;
        height = n;
        if (polar > 0.9 + fbmWrap(lon, lat, 15, 15, seed + 3, 3) * 0.06) {
          r = g = b = 230;
          height = 0.8;
        }
      } else if (id === 'venus') {
        const swirl = fbmWrap((lon + lat * 0.35) % 1, lat, 6, 11, seed, 5);
        const tint = 0.78 + swirl * 0.44;
        r = br * tint;
        g = bg * tint;
        b = bb * tint * 0.95;
        height = 0.45 + swirl * 0.2;
      } else if (id === 'mercury') {
        const n = fbmWrap(lon, lat, 13, 8, seed, 6);
        const tone = 0.6 + n * 0.7;
        r = br * tone;
        g = bg * tone;
        b = bb * tone;
        height = n;
      } else if (id === 'jupiter' || id === 'saturn') {
        const turb = fbmWrap(lon, lat, 6, 3, seed + 2, 5) * 0.5;
        const band = Math.sin((lat + turb * 0.18) * Math.PI * (id === 'jupiter' ? 15 : 11));
        const shade = 0.82 + band * 0.2 + turb * 0.25;
        r = br * shade;
        g = bg * shade;
        b = bb * shade * (id === 'jupiter' ? 0.92 : 1);
        height = 0.5 + band * 0.08;
      } else {
        const band = Math.sin(lat * Math.PI * 6 + fbmWrap(lon, lat, 5, 3, seed, 4));
        const shade = 0.9 + band * 0.08;
        r = br * shade;
        g = bg * shade;
        b = bb * shade;
        height = 0.5 + band * 0.05;
      }

      const fall = 1 - polar * polar * 0.18;
      const idx = (yRow * W + x) * 4;
      colorImg.data[idx] = clamp01((r * fall) / 255) * 255;
      colorImg.data[idx + 1] = clamp01((g * fall) / 255) * 255;
      colorImg.data[idx + 2] = clamp01((b * fall) / 255) * 255;
      colorImg.data[idx + 3] = 255;
      if (bumpImg) {
        const bv = clamp01(height) * 255;
        bumpImg.data[idx] = bumpImg.data[idx + 1] = bumpImg.data[idx + 2] = bv;
        bumpImg.data[idx + 3] = 255;
      }
    }
  };

  const finish = () => {
    colorCtx.putImageData(colorImg, 0, 0);
    if (bumpCtx && bumpImg) bumpCtx.putImageData(bumpImg, 0, 0);

    if (id === 'mercury') {
      const n = Math.round((W * H) / 1400);
      for (let c = 0; c < n; c++) {
        const cx = hash2(c, 1, seed) * W;
        const cy = hash2(c, 2, seed) * H;
        const cr = 2 + hash2(c, 3, seed) * (W / 70);
        const grad = colorCtx.createRadialGradient(cx, cy, 0, cx, cy, cr);
        grad.addColorStop(0, 'rgba(0,0,0,0.35)');
        grad.addColorStop(0.7, 'rgba(0,0,0,0.12)');
        grad.addColorStop(0.85, 'rgba(255,255,255,0.18)');
        grad.addColorStop(1, 'rgba(255,255,255,0)');
        colorCtx.fillStyle = grad;
        colorCtx.beginPath();
        colorCtx.arc(cx, cy, cr, 0, Math.PI * 2);
        colorCtx.fill();
        // matching crater depression in the bump map
        if (bumpCtx) {
          const bgrad = bumpCtx.createRadialGradient(cx, cy, 0, cx, cy, cr);
          bgrad.addColorStop(0, 'rgba(40,40,40,0.8)');
          bgrad.addColorStop(0.8, 'rgba(120,120,120,0.3)');
          bgrad.addColorStop(1, 'rgba(200,200,200,0)');
          bumpCtx.fillStyle = bgrad;
          bumpCtx.beginPath();
          bumpCtx.arc(cx, cy, cr, 0, Math.PI * 2);
          bumpCtx.fill();
        }
      }
    }

    if (id === 'jupiter') {
      const sx = W * 0.68;
      const sy = H * 0.64;
      for (let ring = 5; ring >= 1; ring--) {
        colorCtx.fillStyle = `rgba(178, 60, 30, ${0.14 * (6 - ring)})`;
        colorCtx.beginPath();
        colorCtx.ellipse(sx, sy, (W / 28) * ring, (H / 28) * ring, 0, 0, Math.PI * 2);
        colorCtx.fill();
      }
    }

    map.needsUpdate = true;
    if (bump) bump.needsUpdate = true;
  };

  return {
    map,
    bump,
    run(budgetMs: number): boolean {
      // Generate noise time-sliced across frames (no long task), but only
      // upload to the GPU once complete — re-uploading + regenerating mipmaps
      // every frame is what makes software rendering crawl.
      const start = performance.now();
      while (y < H) {
        processRow(y);
        y++;
        if ((y & 15) === 0 && performance.now() - start > budgetMs) return false;
      }
      finish();
      return true;
    },
  };
}

// --- Earth cloud layer (alpha, time-sliced) ------------------------------------

export function createCloudJob(W = 1024, H = 512): TexJob {
  const [canvas, ctx] = makeCanvas(W, H);
  const img = ctx.createImageData(W, H);
  const map = toTexture(canvas);
  let y = 0;
  const processRow = (yRow: number) => {
    for (let x = 0; x < W; x++) {
      const n = fbmWrap(x / W, yRow / H, 9, 6, 42.5, 6);
      const a = clamp01((n - 0.5) * 3.6) * 0.9;
      const idx = (yRow * W + x) * 4;
      img.data[idx] = img.data[idx + 1] = img.data[idx + 2] = 255;
      img.data[idx + 3] = a * 255;
    }
  };
  return {
    map,
    bump: null,
    run(budgetMs: number): boolean {
      const start = performance.now();
      while (y < H) {
        processRow(y);
        y++;
        if ((y & 15) === 0 && performance.now() - start > budgetMs) return false;
      }
      ctx.putImageData(img, 0, 0);
      map.needsUpdate = true;
      return true;
    },
  };
}

// --- sun photosphere (time-sliced) ---------------------------------------------

export function createSunJob(W = 1024, H = 512): TexJob {
  const [canvas, ctx] = makeCanvas(W, H);
  ctx.fillStyle = '#FFB347';
  ctx.fillRect(0, 0, W, H);
  const img = ctx.createImageData(W, H);
  const map = toTexture(canvas);
  let y = 0;
  const processRow = (yRow: number) => {
    for (let x = 0; x < W; x++) {
      const granule = fbmWrap(x / W, yRow / H, 18, 11, 99.1, 6);
      const spots = fbmWrap(x / W, yRow / H, 6, 3, 31.7, 4);
      let bright = 0.72 + granule * 0.55;
      if (spots < 0.3) bright *= 0.45 + spots;
      const idx = (yRow * W + x) * 4;
      img.data[idx] = clamp01(bright) * 255;
      img.data[idx + 1] = clamp01(bright * 0.72) * 255;
      img.data[idx + 2] = clamp01(bright * 0.35) * 255;
      img.data[idx + 3] = 255;
    }
  };
  return {
    map,
    bump: null,
    run(budgetMs: number): boolean {
      const start = performance.now();
      while (y < H) {
        processRow(y);
        y++;
        if ((y & 15) === 0 && performance.now() - start > budgetMs) return false;
      }
      ctx.putImageData(img, 0, 0);
      map.needsUpdate = true;
      return true;
    },
  };
}

// ---------------------------------------------------------------------------
// Small instant textures
// ---------------------------------------------------------------------------

// Soft round dot — used as the point sprite for stars, Kuiper bodies and the
// galaxy, so particles render as round glows instead of square quads.
export function roundPointTexture(): THREE.CanvasTexture {
  const S = 64;
  const [canvas, ctx] = makeCanvas(S, S);
  const g = ctx.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.4, 'rgba(255,255,255,0.85)');
  g.addColorStop(0.75, 'rgba(255,255,255,0.28)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, S, S);
  return toTexture(canvas);
}

// --- ring textures (radial bands; UV.x = radial position) ---------------------------

export function ringTexture(style: 'saturn' | 'uranus'): THREE.CanvasTexture {
  const W = 1024;
  const H = 8;
  const [canvas, ctx] = makeCanvas(W, H);
  for (let x = 0; x < W; x++) {
    const t = x / W;
    let alpha: number;
    let r: number, g: number, b: number;
    if (style === 'saturn') {
      const bands = fbm(t * 40, 0.5, 7.7, 4);
      alpha = 0.25 + bands * 0.75;
      if (t > 0.58 && t < 0.66) alpha *= 0.12; // Cassini division
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
  const S = 256;
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

// --- black hole accretion disk (radial bands, hot inner edge) -----------------------------

export function accretionTexture(): THREE.CanvasTexture {
  const W = 1024;
  const H = 8;
  const [canvas, ctx] = makeCanvas(W, H);
  for (let x = 0; x < W; x++) {
    const t = x / W;
    const heat = Math.pow(1 - t, 1.6);
    const bands = 0.6 + fbm(t * 44, 0.5, 55.5, 4) * 0.7;
    const alpha = clamp01(heat * bands) * clamp01(t * 14) * clamp01((1 - t) * 4 + 0.2);
    const r = 255;
    const g = 140 + heat * 115;
    const b = 60 + heat * 195;
    ctx.fillStyle = `rgba(${r},${Math.round(g)},${Math.round(b)},${alpha})`;
    ctx.fillRect(x, 0, 1, H);
  }
  return toTexture(canvas);
}
