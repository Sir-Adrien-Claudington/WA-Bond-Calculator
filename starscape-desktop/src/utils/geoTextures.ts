// ---------------------------------------------------------------------------
// GeoScape — procedural rock & strata textures
// ---------------------------------------------------------------------------
// High-resolution rock surfaces generated on a canvas at runtime: no
// downloads, no external assets, CSP-safe. Distinct grain/structure per rock
// type (granite speckle, basalt vesicles, marble veins, gneiss banding, …).
// ---------------------------------------------------------------------------

import * as THREE from 'three';
import type { RockKind } from '@data/geology';

// --- noise -------------------------------------------------------------------

function hash2(x: number, y: number, s: number): number {
  const v = Math.sin(x * 127.1 + y * 311.7 + s * 74.7) * 43758.5453;
  return v - Math.floor(v);
}
function vnoise(x: number, y: number, s: number): number {
  const xi = Math.floor(x), yi = Math.floor(y);
  const xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const a = hash2(xi, yi, s), b = hash2(xi + 1, yi, s);
  const c = hash2(xi, yi + 1, s), d = hash2(xi + 1, yi + 1, s);
  return (a + (b - a) * u) + ((c + (d - c) * u) - (a + (b - a) * u)) * v;
}
function fbm(x: number, y: number, s: number, oct = 4): number {
  let val = 0, amp = 0.5, f = 1;
  for (let i = 0; i < oct; i++) { val += amp * vnoise(x * f, y * f, s + i * 13.7); f *= 2; amp *= 0.5; }
  return val;
}

const rnd = (i: number, s: number) => hash2(i * 1.13, i * 2.71, s);

// --- rock painter ------------------------------------------------------------

export function paintRock(ctx: CanvasRenderingContext2D, w: number, h: number, kind: RockKind): void {
  const img = ctx.createImageData(w, h);
  const base: Record<RockKind, [number, number, number]> = {
    granite: [150, 138, 124], basalt: [44, 42, 40], obsidian: [22, 19, 26],
    sandstone: [201, 160, 106], limestone: [216, 208, 189], shale: [104, 96, 86],
    marble: [236, 230, 220], slate: [69, 74, 82], gneiss: [150, 134, 116],
  };
  const [br, bg, bb] = base[kind];
  const seed = kind.length * 7.3 + kind.charCodeAt(0);

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const u = x / w, v = y / h;
      let r = br, g = bg, b = bb;

      if (kind === 'sandstone') {
        const band = Math.sin((v * 26 + fbm(u * 3, v * 9, seed, 3) * 2) * Math.PI) * 0.5 + 0.5;
        const t = 0.82 + band * 0.3 + fbm(u * 30, v * 30, seed, 4) * 0.2;
        r *= t; g *= t * 0.98; b *= t * 0.92;
      } else if (kind === 'shale') {
        const lam = Math.sin(v * 140 + fbm(u * 4, v * 4, seed, 2)) * 0.08;
        const t = 0.92 + lam + fbm(u * 18, v * 60, seed, 3) * 0.16;
        r *= t; g *= t; b *= t;
      } else if (kind === 'limestone') {
        const m = fbm(u * 6, v * 6, seed, 5);
        const t = 0.9 + m * 0.22;
        r *= t; g *= t; b *= t * 0.99;
      } else if (kind === 'obsidian') {
        const sheen = fbm(u * 2.5, v * 2.5, seed, 4);
        const t = 0.7 + sheen * 0.9;
        r = br * t + sheen * 18; g = bg * t + sheen * 14; b = bb * t + sheen * 26;
      } else if (kind === 'basalt') {
        const n = fbm(u * 40, v * 40, seed, 4);
        const t = 0.8 + n * 0.5;
        r *= t; g *= t; b *= t;
      } else if (kind === 'slate') {
        const fol = Math.sin((u + v) * 90 + fbm(u * 5, v * 5, seed, 2) * 3) * 0.06;
        const t = 0.9 + fol + fbm(u * 22, v * 22, seed, 3) * 0.14;
        r *= t; g *= t * 1.01; b *= t * 1.05;
      } else if (kind === 'gneiss') {
        const band = Math.sin((v * 12 + fbm(u * 3, v * 2, seed, 3) * 4) * Math.PI);
        if (band > 0.1) { r = 216; g = 202; b = 188; } else if (band < -0.1) { r = 62; g = 53; b = 44; }
        const t = 0.85 + fbm(u * 26, v * 26, seed, 3) * 0.3;
        r *= t; g *= t; b *= t;
      } else if (kind === 'marble') {
        const t = 0.94 + fbm(u * 5, v * 5, seed, 4) * 0.12;
        r *= t; g *= t; b *= t;
      } else {
        // granite base — speckle added below
        const t = 0.9 + fbm(u * 20, v * 20, seed, 4) * 0.2;
        r *= t; g *= t; b *= t;
      }

      const i = (y * w + x) * 4;
      img.data[i] = Math.max(0, Math.min(255, r));
      img.data[i + 1] = Math.max(0, Math.min(255, g));
      img.data[i + 2] = Math.max(0, Math.min(255, b));
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);

  // --- grain & feature stamping (canvas 2D) ---------------------------------
  if (kind === 'granite') {
    const grains = Math.round((w * h) / 90);
    const palette = ['#d9c2b0', '#e8e0d6', '#b0a89e', '#3a342e', '#c9b0a0'];
    for (let i = 0; i < grains; i++) {
      ctx.fillStyle = palette[Math.floor(rnd(i, seed) * palette.length)];
      const gx = rnd(i, seed + 1) * w, gy = rnd(i, seed + 2) * h, gr = 1.5 + rnd(i, seed + 3) * 4.5;
      ctx.globalAlpha = 0.5 + rnd(i, seed + 4) * 0.5;
      ctx.beginPath(); ctx.arc(gx, gy, gr, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
  } else if (kind === 'basalt') {
    const ves = Math.round((w * h) / 1400);
    for (let i = 0; i < ves; i++) {
      const vx = rnd(i, seed) * w, vy = rnd(i, seed + 1) * h, vr = 2 + rnd(i, seed + 2) * 7;
      const g = ctx.createRadialGradient(vx, vy, 0, vx, vy, vr);
      g.addColorStop(0, 'rgba(10,9,8,0.85)'); g.addColorStop(0.75, 'rgba(20,18,16,0.4)');
      g.addColorStop(0.9, 'rgba(120,112,104,0.35)'); g.addColorStop(1, 'rgba(120,112,104,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(vx, vy, vr, 0, Math.PI * 2); ctx.fill();
    }
  } else if (kind === 'marble') {
    ctx.lineCap = 'round';
    for (let i = 0; i < 10; i++) {
      const veinSeed = seed + i * 3;
      ctx.strokeStyle = i % 3 === 0 ? 'rgba(191,164,106,0.5)' : 'rgba(120,114,104,0.45)';
      ctx.lineWidth = 1 + rnd(i, veinSeed) * 3;
      ctx.beginPath();
      let px = rnd(i, veinSeed) * w;
      ctx.moveTo(px, -10);
      for (let yy = 0; yy <= h; yy += 14) {
        px += (fbm(px * 0.02, yy * 0.02, veinSeed, 3) - 0.5) * 60;
        ctx.lineTo(px, yy);
      }
      ctx.stroke();
    }
  } else if (kind === 'limestone') {
    for (let i = 0; i < Math.round((w * h) / 8000); i++) {
      ctx.strokeStyle = 'rgba(250,248,240,0.6)';
      ctx.lineWidth = 1;
      const fx = rnd(i, seed) * w, fy = rnd(i, seed + 1) * h, fr = 4 + rnd(i, seed + 2) * 8;
      ctx.beginPath(); ctx.arc(fx, fy, fr, 0.4, Math.PI * 1.8); ctx.stroke();
    }
  } else if (kind === 'obsidian') {
    for (let i = 0; i < 5; i++) {
      ctx.strokeStyle = `rgba(180,170,200,${0.04 + rnd(i, seed) * 0.05})`;
      ctx.lineWidth = 30 + rnd(i, seed + 1) * 60;
      ctx.beginPath();
      ctx.moveTo(rnd(i, seed) * w, 0);
      ctx.bezierCurveTo(rnd(i, seed + 1) * w, h * 0.4, rnd(i, seed + 2) * w, h * 0.6, rnd(i, seed + 3) * w, h);
      ctx.stroke();
    }
  }
}

// --- THREE texture wrapper ----------------------------------------------------

export function rockTexture(kind: RockKind, size = 1024): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('2D context unavailable');
  paintRock(ctx, size, size, kind);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 16;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

// --- mineral surface maps -----------------------------------------------------

function hex3(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

function mineralTex(canvas: HTMLCanvasElement, linear: boolean): THREE.CanvasTexture {
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = linear ? THREE.NoColorSpace : THREE.SRGBColorSpace;
  tex.anisotropy = 16;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

/** Fine horizontal growth striations — bump map for prism faces. */
export function striationBump(size = 512): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d');
  if (!ctx) throw new Error('2D context unavailable');
  const img = ctx.createImageData(size, size);
  for (let y = 0; y < size; y++) {
    const lines = Math.sin(y * 0.7) * 0.5 + Math.sin(y * 0.23 + 1.3) * 0.28 + Math.sin(y * 1.9) * 0.12;
    for (let x = 0; x < size; x++) {
      const n = fbm(x * 0.03, y * 0.14, 3.1, 3);
      let v = 0.5 + lines * 0.2 + (n - 0.5) * 0.22;
      v = Math.max(0, Math.min(1, v));
      const i = (y * size + x) * 4;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = v * 255;
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return mineralTex(c, true);
}

/** Cellular mottle — bump map that breaks up perfectly flat metal faces. */
export function mottleBump(size = 512): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d');
  if (!ctx) throw new Error('2D context unavailable');
  const img = ctx.createImageData(size, size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const n = fbm(x * 0.05, y * 0.05, 9.3, 4);
      const fine = fbm(x * 0.22, y * 0.22, 4.1, 3);
      let v = 0.5 + (n - 0.5) * 0.55 + (fine - 0.5) * 0.18;
      v = Math.max(0, Math.min(1, v));
      const i = (y * size + x) * 4;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = v * 255;
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return mineralTex(c, true);
}

/** Wavy concentric colour banding — botryoidal minerals (malachite, rhodochrosite). */
export function bandedColor(colors: [string, string, string], size = 512): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d');
  if (!ctx) throw new Error('2D context unavailable');
  const img = ctx.createImageData(size, size);
  const [a, b, d] = colors.map(hex3);
  const lerp = (p: number[], q: number[], t: number) => [
    p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t, p[2] + (q[2] - p[2]) * t,
  ];
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const wav = fbm(x * 0.012, y * 0.03, 5.5, 4) * 4.5;
      const p = (Math.sin(y * 0.09 + wav) + 1) / 2; // 0..1
      const col = p < 0.5 ? lerp(a, b, p * 2) : lerp(b, d, (p - 0.5) * 2);
      const grain = 0.92 + fbm(x * 0.3, y * 0.3, 2.2, 2) * 0.16;
      const i = (y * size + x) * 4;
      img.data[i] = Math.min(255, col[0] * grain);
      img.data[i + 1] = Math.min(255, col[1] * grain);
      img.data[i + 2] = Math.min(255, col[2] * grain);
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return mineralTex(c, false);
}

/** Soft radial contact-shadow sprite for grounding a specimen. */
export function contactShadow(size = 256): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d');
  if (!ctx) throw new Error('2D context unavailable');
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, 'rgba(0,0,0,0.55)');
  g.addColorStop(0.45, 'rgba(0,0,0,0.32)');
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  return mineralTex(c, false);
}

// --- decorative sedimentary strata (parallax layer) ---------------------------

export function paintStrata(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  const bands = [
    '#3a2a1e', '#5a3a24', '#7a5230', '#9a6a3c', '#b5824a', '#8a5e36',
    '#6a4226', '#caa15c', '#a07444', '#7a4e2c',
  ];
  let y = 0;
  let i = 0;
  while (y < h) {
    const bh = h * (0.05 + hash2(i, 3.3, 11) * 0.08);
    ctx.fillStyle = bands[i % bands.length];
    ctx.beginPath();
    ctx.moveTo(0, y);
    for (let x = 0; x <= w; x += 16) {
      ctx.lineTo(x, y + (fbm(x * 0.01, i, 11, 2) - 0.5) * 16);
    }
    ctx.lineTo(w, y + bh);
    for (let x = w; x >= 0; x -= 16) {
      ctx.lineTo(x, y + bh + (fbm(x * 0.01, i + 99, 11, 2) - 0.5) * 16);
    }
    ctx.closePath();
    ctx.fill();
    y += bh;
    i++;
  }
  // grain overlay
  for (let k = 0; k < (w * h) / 400; k++) {
    ctx.fillStyle = `rgba(20,12,6,${hash2(k, 1, 7) * 0.15})`;
    ctx.fillRect(hash2(k, 2, 7) * w, hash2(k, 3, 7) * h, 1.5, 1.5);
  }
}
