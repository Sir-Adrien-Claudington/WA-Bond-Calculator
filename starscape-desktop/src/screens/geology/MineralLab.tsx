// ---------------------------------------------------------------------------
// GeoScape — Mineral Lab
// ---------------------------------------------------------------------------
// Three.js WebGL crystal viewer: each mineral renders as a faceted 3D mesh
// with physically-based material (transmission, IOR, metalness, dispersion).
// Drag to rotate, scroll to zoom. Specimen photo + stats in JSX panel.
// ---------------------------------------------------------------------------

import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { useEffect, useRef, useState } from 'react';
import { MINERALS, type Mineral } from '@data/geology';
import { GeoNav } from './GeoNav';
import '../../styles/geology.css';

interface MineralLabProps {
  pathname: string;
  onNavigate: (path: string) => void;
}

// ---- Geometry builders ----------------------------------------------------

function buildGeometry(m: Mineral): THREE.BufferGeometry {
  switch (m.habit) {
    case 'cube':         return new THREE.BoxGeometry(1.5, 1.5, 1.5);
    case 'octahedron':   return new THREE.OctahedronGeometry(1.08, 0);
    case 'dodecahedron': return new THREE.DodecahedronGeometry(0.95, 0);
    case 'rhomb': {
      const g = new THREE.BoxGeometry(1.3, 1.05, 0.78);
      g.applyMatrix4(new THREE.Matrix4().makeShear(0.35, 0, 0, 0, 0, 0));
      return g;
    }
    case 'hexPrism':    return new THREE.CylinderGeometry(0.72, 0.72, 1.9, 6, 1);
    case 'prismTrig':   return new THREE.CylinderGeometry(0.8, 0.8, 1.7, 3, 1);
    case 'prismSquare': return new THREE.CylinderGeometry(0.7, 0.7, 1.55, 4, 1);
    case 'bipyramid': {
      const g = new THREE.OctahedronGeometry(1.05, 0);
      g.scale(1, 1.5, 0.85);
      return g;
    }
    case 'bladed':  return new THREE.BoxGeometry(0.35, 2.1, 1.0);
    case 'tabular': return new THREE.BoxGeometry(1.6, 0.4, 1.3);
    case 'cluster': return new THREE.DodecahedronGeometry(1.0, 0);
    case 'nativeMass': {
      const g = new THREE.SphereGeometry(1.0, 10, 8);
      const pos = g.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < pos.count; i++) {
        pos.setXYZ(i,
          pos.getX(i) * (0.78 + Math.sin(i * 2.3 + 1.1) * 0.30),
          pos.getY(i) * (0.85 + Math.cos(i * 3.1 + 0.5) * 0.20),
          pos.getZ(i) * (0.82 + Math.sin(i * 1.7 + 2.0) * 0.25),
        );
      }
      pos.needsUpdate = true;
      g.computeVertexNormals();
      return g;
    }
    default: return new THREE.SphereGeometry(1.0, 16, 12);
  }
}

// ---- PBR material builder -------------------------------------------------

function buildMaterial(m: Mineral): THREE.MeshPhysicalMaterial {
  const mat = new THREE.MeshPhysicalMaterial({
    color:              new THREE.Color(m.color),
    metalness:          m.metalness,
    roughness:          m.roughness,
    transmission:       m.transmission,
    ior:                m.ior ?? 1.5,
    thickness:          m.transmission > 0 ? 1.4 : 0,
    clearcoat:          m.transmission > 0.3 ? 0.5 : (m.metalness > 0.7 ? 0.2 : 0),
    clearcoatRoughness: 0.12,
    anisotropy:         m.anisotropy ?? 0,
    sheen:              m.sheen ?? 0,
    sheenRoughness:     0.35,
    sheenColor:         new THREE.Color(m.color),
    side:               m.transmission > 0 ? THREE.DoubleSide : THREE.FrontSide,
    transparent:        m.transmission > 0,
  });
  // dispersion and iridescence added in Three.js r163/r164 — set via property
  // so older @types/three builds don't complain about unknown constructor keys
  const ext = mat as unknown as Record<string, number>;
  ext.dispersion  = m.dispersion  ?? 0;
  ext.iridescence = m.luster === 'Adamantine' ? 0.3 : 0;
  ext.iridescenceIOR = 1.6;
  return mat;
}

// ---- Component ------------------------------------------------------------

export function MineralLab({ pathname, onNavigate }: MineralLabProps) {
  const [selected,  setSelected]  = useState<Mineral>(MINERALS[0]);
  const [photoErr,  setPhotoErr]  = useState(false);

  const wrapRef      = useRef<HTMLDivElement>(null);
  const rendererRef  = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef    = useRef<THREE.PerspectiveCamera | null>(null);
  const groupRef     = useRef<THREE.Group | null>(null);
  const crystalRef   = useRef<THREE.Mesh | null>(null);
  const rafRef       = useRef(0);

  const dragRef = useRef({ on: false, lx: 0, ly: 0 });
  const velRef  = useRef({ x: 0, y: 0.005 });
  const idleRef = useRef(0);

  // Init Three.js scene once
  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;

    const W = Math.max(wrap.clientWidth,  100);
    const H = Math.max(wrap.clientHeight, 100);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(W, H);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    rendererRef.current = renderer;
    wrap.appendChild(renderer.domElement);

    const camera = new THREE.PerspectiveCamera(42, W / H, 0.1, 100);
    camera.position.set(0, 0, 5.5);
    cameraRef.current = camera;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#0e0a06');

    const pmrem  = new THREE.PMREMGenerator(renderer);
    const envRT  = pmrem.fromScene(new RoomEnvironment());
    scene.environment = envRT.texture;
    pmrem.dispose();

    scene.add(new THREE.AmbientLight(0xfff4d4, 0.5));
    const key = new THREE.DirectionalLight(0xffffff, 2.2);
    key.position.set(3, 5, 4);
    scene.add(key);
    const fill = new THREE.DirectionalLight(0xc8e0ff, 0.9);
    fill.position.set(-4, -2, 3);
    scene.add(fill);
    const rim = new THREE.DirectionalLight(0xffd4a0, 0.55);
    rim.position.set(0, -3, -4);
    scene.add(rim);

    const group = new THREE.Group();
    scene.add(group);
    groupRef.current = group;

    // rAF loop — runs while component is mounted
    const tick = () => {
      if (!dragRef.current.on && group) {
        idleRef.current += 0.016;
        velRef.current.x *= 0.96;
        velRef.current.y *= 0.96;
        if (idleRef.current > 1.5) velRef.current.y = Math.max(velRef.current.y, 0.005);
        group.rotation.x += velRef.current.x;
        group.rotation.y += velRef.current.y;
      }
      renderer.render(scene, camera);
      rafRef.current = requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);

    // Scroll-to-zoom
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      camera.position.z = Math.max(3.0, Math.min(9.0, camera.position.z + (e.deltaY > 0 ? 0.35 : -0.35)));
    };
    wrap.addEventListener('wheel', onWheel, { passive: false });

    // Resize observer
    const ro = new ResizeObserver(() => {
      const w = Math.max(wrap.clientWidth, 1);
      const h = Math.max(wrap.clientHeight, 1);
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    });
    ro.observe(wrap);

    return () => {
      cancelAnimationFrame(rafRef.current);
      ro.disconnect();
      wrap.removeEventListener('wheel', onWheel);
      const mesh = crystalRef.current;
      if (mesh) { mesh.geometry.dispose(); (mesh.material as THREE.Material).dispose(); }
      envRT.dispose();
      renderer.dispose();
      if (wrap.contains(renderer.domElement)) wrap.removeChild(renderer.domElement);
    };
  }, []); // run once

  // Swap crystal when selection changes
  useEffect(() => {
    const group = groupRef.current;
    if (!group) return;

    const old = crystalRef.current;
    if (old) {
      group.remove(old);
      old.geometry.dispose();
      (old.material as THREE.Material).dispose();
      crystalRef.current = null;
    }

    const mesh = new THREE.Mesh(buildGeometry(selected), buildMaterial(selected));
    group.add(mesh);
    crystalRef.current = mesh;

    group.rotation.set(0.15, 0.4, 0);
    velRef.current  = { x: 0, y: 0.005 };
    idleRef.current = 1.6; // start auto-spin immediately
    setPhotoErr(false);
  }, [selected]);

  // Pointer drag handlers
  const onPtrDown = (e: React.PointerEvent) => {
    dragRef.current = { on: true, lx: e.clientX, ly: e.clientY };
    velRef.current  = { x: 0, y: 0 };
    idleRef.current = 0;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const onPtrMove = (e: React.PointerEvent) => {
    if (!dragRef.current.on || !groupRef.current) return;
    const dx = e.clientX - dragRef.current.lx;
    const dy = e.clientY - dragRef.current.ly;
    velRef.current = { x: dy * 0.006, y: dx * 0.006 };
    groupRef.current.rotation.x += velRef.current.x;
    groupRef.current.rotation.y += velRef.current.y;
    dragRef.current.lx = e.clientX;
    dragRef.current.ly = e.clientY;
  };

  const onPtrUp = () => { dragRef.current.on = false; };

  const hasPhoto = !!selected.photo && !photoErr;

  return (
    <div className="mineral-root">
      <GeoNav pathname={pathname} onNavigate={onNavigate} />

      <div className="mineral-stage">
        {/* Left: Three.js 3D crystal canvas */}
        <div
          ref={wrapRef}
          className="mineral-3d-wrap"
          onPointerDown={onPtrDown}
          onPointerMove={onPtrMove}
          onPointerUp={onPtrUp}
          onPointerLeave={onPtrUp}
          aria-label={`3D rotating crystal of ${selected.name}`}
        />

        {/* Right: info panel */}
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
            <img
              src={selected.photo}
              alt={`${selected.name} specimen`}
              className="mip-photo"
              onError={() => setPhotoErr(true)}
            />
          )}
          {hasPhoto && (
            <span className="mip-credit">Photo: Wikimedia Commons (CC BY-SA)</span>
          )}
        </div>
      </div>

      <div className="mineral-hint" aria-hidden="true">drag to rotate · scroll to zoom</div>

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
