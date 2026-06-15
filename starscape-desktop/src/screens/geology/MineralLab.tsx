// ---------------------------------------------------------------------------
// GeoScape — Mineral Lab (CSS 3D photo card edition)
// ---------------------------------------------------------------------------
// Displays a real Wikimedia Commons specimen photo mapped onto a CSS 3D card
// that the user can drag to rotate and that auto-spins when idle.
// Falls back to a procedural coloured swatch when no photo is available.
// ---------------------------------------------------------------------------

import { useEffect, useRef, useState } from 'react';
import { MINERALS, type Mineral } from '@data/geology';
import { GeoNav } from './GeoNav';
import '../../styles/geology.css';

interface MineralLabProps {
  pathname: string;
  onNavigate: (path: string) => void;
}

export function MineralLab({ pathname, onNavigate }: MineralLabProps) {
  const [selected, setSelected] = useState<Mineral>(MINERALS[0]);
  const [photoErr, setPhotoErr] = useState(false);

  const cardRef  = useRef<HTMLDivElement>(null);
  const rotRef   = useRef({ x: -8, y: 20 });
  const velRef   = useRef({ x: 0, y: 0.3 });
  const dragRef  = useRef({ on: false, lx: 0, ly: 0 });
  const idleRef  = useRef(0);

  // Single rAF loop — runs for the lifetime of the component
  useEffect(() => {
    let live = true;
    let prev = performance.now();

    const tick = (now: number) => {
      if (!live) return;
      const dt = Math.min((now - prev) / 1000, 0.05);
      prev = now;

      if (!dragRef.current.on) {
        idleRef.current += dt;
        const damp = Math.exp(-dt * 4);
        velRef.current.x *= damp;
        velRef.current.y *= damp;
        // Maintain gentle auto-spin after settling
        if (idleRef.current > 1.2) velRef.current.y = Math.max(velRef.current.y, 0.28);
        rotRef.current.x = Math.max(-50, Math.min(50, rotRef.current.x + velRef.current.x));
        rotRef.current.y += velRef.current.y;
        if (cardRef.current) {
          cardRef.current.style.transform =
            `rotateX(${rotRef.current.x}deg) rotateY(${rotRef.current.y}deg)`;
        }
      }

      requestAnimationFrame(tick);
    };

    requestAnimationFrame(tick);
    return () => { live = false; };
  }, []);

  // Reset pose when the selected mineral changes
  useEffect(() => {
    setPhotoErr(false);
    rotRef.current = { x: -8, y: 20 };
    velRef.current = { x: 0, y: 0.3 };
    idleRef.current = 0;
    if (cardRef.current) {
      cardRef.current.style.transform = 'rotateX(-8deg) rotateY(20deg)';
    }
  }, [selected.id]);

  const onPtrDown = (e: React.PointerEvent) => {
    dragRef.current = { on: true, lx: e.clientX, ly: e.clientY };
    idleRef.current = 0;
    velRef.current = { x: 0, y: 0 };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const onPtrMove = (e: React.PointerEvent) => {
    if (!dragRef.current.on) return;
    const dx = e.clientX - dragRef.current.lx;
    const dy = e.clientY - dragRef.current.ly;
    velRef.current = { x: dy * 0.35, y: dx * 0.35 };
    rotRef.current.x = Math.max(-50, Math.min(50, rotRef.current.x + dy * 0.35));
    rotRef.current.y += dx * 0.35;
    dragRef.current.lx = e.clientX;
    dragRef.current.ly = e.clientY;
    if (cardRef.current) {
      cardRef.current.style.transform =
        `rotateX(${rotRef.current.x}deg) rotateY(${rotRef.current.y}deg)`;
    }
  };

  const onPtrUp = () => { dragRef.current.on = false; };

  const hasPhoto = !!selected.photo && !photoErr;

  return (
    <div className="mineral-root">
      <GeoNav pathname={pathname} onNavigate={onNavigate} />

      <div className="mineral-stage" aria-label={`3D specimen of ${selected.name}`}>
        {/* ---- Left: CSS 3D rotatable photo card ---- */}
        <div
          className="mineral-photo-stage"
          onPointerDown={onPtrDown}
          onPointerMove={onPtrMove}
          onPointerUp={onPtrUp}
          onPointerLeave={onPtrUp}
        >
          <div
            ref={cardRef}
            className="mineral-photo-card"
            style={{ transform: 'rotateX(-8deg) rotateY(20deg)' }}
          >
            {/* Front face — real photo or colour swatch */}
            {hasPhoto ? (
              <img
                key={selected.id}
                src={selected.photo}
                alt={`${selected.name} specimen`}
                className="mineral-specimen-img"
                draggable={false}
                onError={() => setPhotoErr(true)}
              />
            ) : (
              <div
                className="mineral-swatch"
                style={{ background: selected.color }}
              >
                <div className="mineral-swatch-shine" aria-hidden="true" />
                <span className="mineral-swatch-name">{selected.name}</span>
              </div>
            )}

            {/* Back face — formula + name label */}
            <div className="mineral-card-back">
              <span className="mineral-card-back-formula">{selected.formula}</span>
              <span className="mineral-card-back-name">{selected.name}</span>
            </div>
          </div>
        </div>

        {/* ---- Right: info panel ---- */}
        <div className="mineral-info-panel">
          <div className="mip-formula">{selected.formula}</div>
          <h2 className="mip-name">{selected.name}</h2>
          <div className="mip-grid">
            <div><span>System</span><b>{selected.system}</b></div>
            <div><span>Hardness</span><b>{selected.mohs} Mohs</b></div>
            <div><span>Luster</span><b>{selected.luster}</b></div>
            <div><span>Class</span><b>{selected.group}</b></div>
          </div>
          <p className="mip-blurb">{selected.blurb}</p>
          <div className="mip-uses">
            <span className="mip-uses-label">Uses</span>
            <span className="mip-uses-text">{selected.uses}</span>
          </div>
          {hasPhoto && (
            <span className="mip-credit">Photo: Wikimedia Commons (CC BY-SA)</span>
          )}
        </div>
      </div>

      <div className="mineral-hint" aria-hidden="true">drag to rotate · flip 180° for back label</div>

      <div className="mineral-tray" role="listbox" aria-label="Mineral specimens">
        {MINERALS.map((m) => (
          <button
            key={m.id}
            role="option"
            aria-selected={selected.id === m.id}
            className={`mineral-chip${selected.id === m.id ? ' mineral-chip-active' : ''}`}
            onClick={() => setSelected(m)}
          >
            <span className="mineral-chip-dot" style={{ background: m.color }} aria-hidden="true" />
            {m.name}
          </button>
        ))}
      </div>
    </div>
  );
}
