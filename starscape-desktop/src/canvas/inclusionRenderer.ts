// Phase 1 — Canvas 2D inclusion renderer
// Draws a deposit's inclusions over the existing ore body. Called every frame
// from the cave loop, so positions must be deterministic: we re-seed a tiny
// LCG from a stable per-deposit seed each call rather than using Math.random.

import type { InclusionType } from '../utils/inclusions';

function makeRng(seed: number): () => number {
  let s = (seed | 0) || 1;
  return () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; };
}

// Render inclusions inside the ore ellipse (cx,cy,rx,ry). Each type uses the
// colour + form specified in the blueprint (section 1.2).
export function drawInclusions(
  ctx: CanvasRenderingContext2D,
  inclusions: InclusionType[],
  cx: number, cy: number, rx: number, ry: number,
  seed: number,
): void {
  if (inclusions.length === 0) return;
  const rng = makeRng(seed);
  ctx.save();

  inclusions.forEach((type, idx) => {
    // Stable position within the ore for this inclusion instance.
    const a  = rng() * Math.PI * 2;
    const rr = 0.15 + rng() * 0.55;
    const ix = cx + Math.cos(a) * rx * rr;
    const iy = cy + Math.sin(a) * ry * rr;

    switch (type) {
      case 'fluid': {
        // Small ellipse clusters — trapped fluid/gas bubbles.
        ctx.fillStyle = 'rgba(180, 220, 255, 0.40)';
        const n = 3 + Math.floor(rng() * 3);
        for (let i = 0; i < n; i++) {
          const ox = ix + (rng() - 0.5) * rx * 0.3;
          const oy = iy + (rng() - 0.5) * ry * 0.3;
          const w  = 1.2 + rng() * 2.2;
          ctx.beginPath();
          ctx.ellipse(ox, oy, w, w * 0.7, rng() * Math.PI, 0, Math.PI * 2);
          ctx.fill();
        }
        break;
      }
      case 'mineral': {
        // Hair-thin foreign crystal needles.
        ctx.strokeStyle = 'rgba(200, 180, 100, 0.60)';
        ctx.lineWidth = 0.8;
        const lines = 3 + Math.floor(rng() * 3);
        for (let i = 0; i < lines; i++) {
          const la = rng() * Math.PI * 2;
          const ll = (0.2 + rng() * 0.4) * Math.min(rx, ry);
          const sx = ix + (rng() - 0.5) * rx * 0.4;
          const sy = iy + (rng() - 0.5) * ry * 0.4;
          ctx.beginPath();
          ctx.moveTo(sx, sy);
          ctx.lineTo(sx + Math.cos(la) * ll, sy + Math.sin(la) * ll);
          ctx.stroke();
        }
        break;
      }
      case 'structural': {
        // Jagged fracture plane across the ore face.
        ctx.strokeStyle = 'rgba(80, 80, 80, 0.50)';
        ctx.lineWidth = 1.1;
        const fa = rng() * Math.PI * 2;
        let px = cx + Math.cos(fa) * rx * 0.9;
        let py = cy + Math.sin(fa) * ry * 0.9;
        ctx.beginPath();
        ctx.moveTo(px, py);
        const steps = 4 + Math.floor(rng() * 3);
        for (let i = 0; i < steps; i++) {
          px += (Math.cos(fa + Math.PI) * rx * 1.8 / steps) + (rng() - 0.5) * rx * 0.25;
          py += (Math.sin(fa + Math.PI) * ry * 1.8 / steps) + (rng() - 0.5) * ry * 0.25;
          ctx.lineTo(px, py);
        }
        ctx.stroke();
        break;
      }
      case 'gangue': {
        // Grey host-rock stipple mottling.
        ctx.fillStyle = 'rgba(140, 130, 120, 0.35)';
        const dots = 18 + Math.floor(rng() * 14);
        for (let i = 0; i < dots; i++) {
          const da = rng() * Math.PI * 2;
          const dr = rng() * 0.8;
          const dx = cx + Math.cos(da) * rx * dr;
          const dy = cy + Math.sin(da) * ry * dr;
          ctx.beginPath();
          ctx.arc(dx, dy, 0.6 + rng() * 1.1, 0, Math.PI * 2);
          ctx.fill();
        }
        break;
      }
    }
    void idx;
  });

  ctx.restore();
}
