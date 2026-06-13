// ---------------------------------------------------------------------------
// GeoScape — Mineral Lab
// ---------------------------------------------------------------------------
// An interactive WebGL/Three.js mineralogy bench. Each mineral is rendered as
// a crystal with its true habit (cube, octahedron, dodecahedron, hexagonal
// prism, rhombohedron, botryoidal cluster) and a physically-based material —
// glassy gems use transmission, ores use metalness — lit by a studio
// environment map for realistic reflections. A Three.js CSS3DRenderer panel
// floats beside the crystal showing its properties (built with DOM APIs, no
// innerHTML). Drag to rotate, scroll to zoom, pick a specimen from the tray.
// ---------------------------------------------------------------------------

import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { CSS3DRenderer, CSS3DObject } from 'three/examples/jsm/renderers/CSS3DRenderer.js';
import { MINERALS, type Mineral } from '@data/geology';
import { GeoNav } from './GeoNav';
import '../../styles/geology.css';

// --- crystal habit builders --------------------------------------------------

function buildHabit(m: Mineral, mat: THREE.Material): THREE.Object3D {
  switch (m.habit) {
    case 'cube': {
      const g = new THREE.BoxGeometry(1.5, 1.5, 1.5);
      const mesh = new THREE.Mesh(g, mat);
      mesh.rotation.set(0.2, 0.4, 0);
      return mesh;
    }
    case 'octahedron':
      return new THREE.Mesh(new THREE.OctahedronGeometry(1.15), mat);
    case 'dodecahedron':
      return new THREE.Mesh(new THREE.DodecahedronGeometry(1.15), mat);
    case 'rhomb': {
      const g = new THREE.BoxGeometry(1.5, 1.5, 1.5);
      g.applyMatrix4(new THREE.Matrix4().set(
        1, 0.36, 0, 0,
        0, 1, 0, 0,
        0, 0.22, 1, 0,
        0, 0, 0, 1
      ));
      const mesh = new THREE.Mesh(g, mat);
      mesh.rotation.set(0.15, 0.5, 0);
      return mesh;
    }
    case 'hexPrism': {
      const group = new THREE.Group();
      const prism = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.8, 1.7, 6, 1), mat);
      group.add(prism);
      const top = new THREE.Mesh(new THREE.ConeGeometry(0.8, 0.7, 6), mat);
      top.position.y = 1.2; group.add(top);
      const bot = new THREE.Mesh(new THREE.ConeGeometry(0.8, 0.7, 6), mat);
      bot.position.y = -1.2; bot.rotation.x = Math.PI; group.add(bot);
      group.rotation.y = Math.PI / 6;
      return group;
    }
    case 'cluster': {
      const group = new THREE.Group();
      const blobs: Array<[number, number, number, number]> = [
        [0, 0, 0, 0.9], [0.72, 0.18, 0.3, 0.6], [-0.6, 0.32, 0.18, 0.56],
        [0.22, -0.5, 0.5, 0.5], [0.32, 0.6, -0.42, 0.46], [-0.42, -0.42, -0.3, 0.5],
        [0.05, 0.12, -0.72, 0.42],
      ];
      blobs.forEach(([x, y, z, r]) => {
        const s = new THREE.Mesh(new THREE.SphereGeometry(r, 40, 40), mat);
        s.position.set(x, y, z);
        group.add(s);
      });
      return group;
    }
  }
}

function buildMaterial(m: Mineral): THREE.Material {
  if (m.transmission > 0) {
    return new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(m.color),
      metalness: m.metalness,
      roughness: m.roughness,
      transmission: m.transmission,
      thickness: 1.1,
      ior: m.ior ?? 1.5,
      transparent: true,
      clearcoat: 0.15,
      clearcoatRoughness: 0.2,
      envMapIntensity: 1.4,
      attenuationColor: new THREE.Color(m.color),
      attenuationDistance: 3,
    });
  }
  return new THREE.MeshStandardMaterial({
    color: new THREE.Color(m.color),
    metalness: m.metalness,
    roughness: m.roughness,
    envMapIntensity: m.metalness > 0.5 ? 1.5 : 1.0,
  });
}

// --- CSS3D info panel (DOM construction — no innerHTML) ----------------------

function el(tag: string, cls: string, text?: string): HTMLElement {
  const e = document.createElement(tag);
  e.className = cls;
  if (text) e.textContent = text;
  return e;
}

function buildPanel(m: Mineral): HTMLDivElement {
  const root = document.createElement('div');
  root.className = 'mineral-panel';
  root.appendChild(el('div', 'mineral-panel-formula', m.formula));
  root.appendChild(el('div', 'mineral-panel-name', m.name));
  const grid = el('div', 'mineral-panel-grid');
  const rows: Array<[string, string]> = [
    ['System', m.system], ['Hardness', `${m.mohs} Mohs`],
    ['Luster', m.luster],
  ];
  rows.forEach(([k, v]) => {
    const cell = document.createElement('div');
    cell.appendChild(el('div', 'mp-k', k));
    cell.appendChild(el('div', 'mp-v', v));
    grid.appendChild(cell);
  });
  root.appendChild(grid);
  root.appendChild(el('div', 'mineral-panel-blurb', m.blurb));
  const uses = el('div', 'mineral-panel-uses');
  uses.appendChild(el('span', 'mp-uses-label', 'Uses'));
  uses.appendChild(el('span', 'mp-uses-text', m.uses));
  root.appendChild(uses);
  return root;
}

interface MineralLabProps {
  pathname: string;
  onNavigate: (path: string) => void;
}

export function MineralLab({ pathname, onNavigate }: MineralLabProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const apiRef = useRef<{ setMineral: (m: Mineral) => void } | null>(null);
  const [selected, setSelected] = useState<Mineral>(MINERALS[0]);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    let width = mount.clientWidth;
    let height = mount.clientHeight;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
    let targetDist = 6.2;
    let dist = targetDist;
    camera.position.set(0, 0, dist);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.domElement.style.position = 'absolute';
    renderer.domElement.style.inset = '0';
    mount.appendChild(renderer.domElement);

    // studio environment for realistic gem/metal reflections
    const pmrem = new THREE.PMREMGenerator(renderer);
    const envRT = pmrem.fromScene(new RoomEnvironment(), 0.04);
    scene.environment = envRT.texture;

    // accent lighting for sparkle
    const key = new THREE.DirectionalLight(0xffffff, 1.6);
    key.position.set(4, 5, 5);
    scene.add(key);
    const rim = new THREE.DirectionalLight(0xffe8c0, 0.8);
    rim.position.set(-5, -2, -4);
    scene.add(rim);

    // CSS3D layer for the floating panel
    const cssRenderer = new CSS3DRenderer();
    cssRenderer.setSize(width, height);
    const cssEl = cssRenderer.domElement;
    cssEl.style.position = 'absolute';
    cssEl.style.top = '0';
    cssEl.style.left = '0';
    cssEl.style.pointerEvents = 'none';
    mount.appendChild(cssEl);

    const crystalGroup = new THREE.Group(); // user/idle rotation
    scene.add(crystalGroup);

    let current: THREE.Object3D | null = null;
    let currentMat: THREE.Material | null = null;
    let panelObj: CSS3DObject | null = null;

    const disposeObject = (obj: THREE.Object3D) => {
      obj.traverse((o) => {
        if (o instanceof THREE.Mesh) o.geometry.dispose();
      });
    };

    const setMineral = (m: Mineral) => {
      if (current) { crystalGroup.remove(current); disposeObject(current); current = null; }
      if (currentMat) { currentMat.dispose(); currentMat = null; }
      currentMat = buildMaterial(m);
      current = buildHabit(m, currentMat);
      crystalGroup.add(current);

      if (panelObj) { scene.remove(panelObj); panelObj.element.remove(); panelObj = null; }
      panelObj = new CSS3DObject(buildPanel(m));
      panelObj.position.set(3.4, 0.2, 0);
      panelObj.scale.setScalar(0.012);
      scene.add(panelObj);
    };
    apiRef.current = { setMineral };
    setMineral(MINERALS[0]);

    // --- interaction --------------------------------------------------------
    let dragging = false, lastX = 0, lastY = 0, idle = 0;
    const onDown = (e: PointerEvent) => { dragging = true; idle = 0; lastX = e.clientX; lastY = e.clientY; };
    const onMove = (e: PointerEvent) => {
      if (!dragging) return;
      crystalGroup.rotation.y += (e.clientX - lastX) * 0.008;
      crystalGroup.rotation.x += (e.clientY - lastY) * 0.008;
      lastX = e.clientX; lastY = e.clientY; idle = 0;
    };
    const onUp = () => { dragging = false; };
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      targetDist = Math.min(11, Math.max(3.4, targetDist * Math.exp(e.deltaY * 0.0011)));
    };
    const cvs = renderer.domElement;
    cvs.style.touchAction = 'none';
    cvs.addEventListener('pointerdown', onDown);
    cvs.addEventListener('pointermove', onMove);
    cvs.addEventListener('pointerup', onUp);
    cvs.addEventListener('pointerleave', onUp);
    cvs.addEventListener('wheel', onWheel, { passive: false });

    const onResize = () => {
      width = mount.clientWidth; height = mount.clientHeight;
      camera.aspect = width / height; camera.updateProjectionMatrix();
      renderer.setSize(width, height); cssRenderer.setSize(width, height);
    };
    const ro = new ResizeObserver(onResize);
    ro.observe(mount);

    const clock = new THREE.Clock();
    let raf = 0;
    const animate = () => {
      raf = requestAnimationFrame(animate);
      const dt = Math.min(clock.getDelta(), 0.05);
      idle += dt;
      if (!dragging && idle > 0.6) crystalGroup.rotation.y += dt * 0.35;
      dist += (targetDist - dist) * (1 - Math.exp(-dt * 6));
      camera.position.set(0, 0, dist);
      camera.lookAt(0, 0, 0);
      if (panelObj) panelObj.quaternion.copy(camera.quaternion);
      renderer.render(scene, camera);
      cssRenderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      cvs.removeEventListener('pointerdown', onDown);
      cvs.removeEventListener('pointermove', onMove);
      cvs.removeEventListener('pointerup', onUp);
      cvs.removeEventListener('pointerleave', onUp);
      cvs.removeEventListener('wheel', onWheel);
      apiRef.current = null;
      if (current) disposeObject(current);
      currentMat?.dispose();
      if (panelObj) panelObj.element.remove();
      envRT.dispose();
      pmrem.dispose();
      renderer.dispose();
      cvs.remove();
      cssEl.remove();
    };
  }, []);

  const pick = (m: Mineral) => {
    setSelected(m);
    apiRef.current?.setMineral(m);
  };

  return (
    <div className="mineral-root">
      <GeoNav pathname={pathname} onNavigate={onNavigate} />
      <div className="mineral-stage" ref={mountRef} aria-label={`3D model of ${selected.name}`} />

      <div className="mineral-hint" aria-hidden="true">drag to rotate · pinch / scroll to zoom</div>

      {/* 2D info card — shown on narrow screens where the 3D CSS3D panel
          would fall outside the viewport. */}
      <div className="mineral-card-2d">
        <div className="m2d-formula">{selected.formula}</div>
        <div className="m2d-name">{selected.name}</div>
        <div className="m2d-grid">
          <div>
            <span>System</span>
            <b>{selected.system}</b>
          </div>
          <div>
            <span>Hardness</span>
            <b>{selected.mohs} Mohs</b>
          </div>
          <div>
            <span>Luster</span>
            <b>{selected.luster}</b>
          </div>
        </div>
        <p className="m2d-blurb">{selected.blurb}</p>
      </div>

      <div className="mineral-tray" role="listbox" aria-label="Mineral specimens">
        {MINERALS.map((m) => (
          <button
            key={m.id}
            role="option"
            aria-selected={selected.id === m.id}
            className={`mineral-chip${selected.id === m.id ? ' mineral-chip-active' : ''}`}
            onClick={() => pick(m)}
          >
            <span className="mineral-chip-dot" style={{ background: m.color }} aria-hidden="true" />
            {m.name}
          </button>
        ))}
      </div>
    </div>
  );
}
