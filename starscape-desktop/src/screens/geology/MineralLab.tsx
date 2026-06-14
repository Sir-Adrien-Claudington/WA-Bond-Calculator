// ---------------------------------------------------------------------------
// GeoScape — Mineral Lab
// ---------------------------------------------------------------------------
// An interactive WebGL/Three.js mineralogy bench rendered at near-textbook
// quality. Each mineral is built with its true crystal habit (cube,
// octahedron, dodecahedron, hexagonal/triangular/square prisms, dipyramid,
// rhombohedron, tabular plate, bladed selenite, botryoidal cluster, native
// nugget) and a physically-based material: gems use transmission + IOR +
// chromatic dispersion + clearcoat, ores use metalness with a mottled bump,
// botryoidal minerals get concentric colour banding, prisms get growth
// striations. Crystalline forms are flat-shaded for crisp facets, lit by a
// studio environment map with a soft contact shadow. A Three.js CSS3DRenderer
// panel floats beside the specimen (built with DOM APIs, no innerHTML); on
// narrow screens a 2D card is shown instead. Drag to rotate, scroll to zoom,
// pick a specimen from the tray.
// ---------------------------------------------------------------------------

import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { CSS3DRenderer, CSS3DObject } from 'three/examples/jsm/renderers/CSS3DRenderer.js';
import { MINERALS, type Mineral } from '@data/geology';
import { striationBump, mottleBump, bandedColor, contactShadow } from '@utils/geoTextures';
import { GeoNav } from './GeoNav';
import '../../styles/geology.css';

// --- crystal habit builders --------------------------------------------------
// All return an Object3D; the shared material carries flatShading for facets.

function buildHabit(m: Mineral, mat: THREE.Material): THREE.Object3D {
  switch (m.habit) {
    case 'cube': {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1.5, 1.5), mat);
      mesh.rotation.set(0.22, 0.42, 0);
      return mesh;
    }
    case 'octahedron':
      return new THREE.Mesh(new THREE.OctahedronGeometry(1.22), mat);
    case 'dodecahedron':
      return new THREE.Mesh(new THREE.DodecahedronGeometry(1.22), mat);
    case 'rhomb': {
      const g = new THREE.BoxGeometry(1.5, 1.5, 1.5);
      g.applyMatrix4(new THREE.Matrix4().set(1, 0.36, 0, 0, 0, 1, 0, 0, 0, 0.22, 1, 0, 0, 0, 0, 1));
      const mesh = new THREE.Mesh(g, mat);
      mesh.rotation.set(0.15, 0.5, 0);
      return mesh;
    }
    case 'hexPrism': {
      const group = new THREE.Group();
      group.add(new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.8, 1.8, 6, 1), mat));
      if (m.termination === 'pyramid') {
        const top = new THREE.Mesh(new THREE.ConeGeometry(0.8, 0.72, 6), mat);
        top.position.y = 1.26;
        group.add(top);
        const bot = new THREE.Mesh(new THREE.ConeGeometry(0.8, 0.72, 6), mat);
        bot.position.y = -1.26;
        bot.rotation.x = Math.PI;
        group.add(bot);
      }
      group.rotation.set(0.12, Math.PI / 6, 0.05);
      return group;
    }
    case 'prismTrig': {
      const group = new THREE.Group();
      group.add(new THREE.Mesh(new THREE.CylinderGeometry(0.92, 0.92, 2.2, 3, 1), mat));
      group.rotation.set(0.1, 0.5, 0.04);
      return group;
    }
    case 'prismSquare': {
      const group = new THREE.Group();
      group.add(new THREE.Mesh(new THREE.CylinderGeometry(0.72, 0.72, 2.0, 4, 1), mat));
      if (m.termination === 'pyramid') {
        const cap = new THREE.Mesh(new THREE.ConeGeometry(0.72, 0.8, 4), mat);
        cap.position.y = 1.4;
        group.add(cap);
      }
      group.rotation.set(0.1, Math.PI / 4, 0.05);
      return group;
    }
    case 'bipyramid': {
      const group = new THREE.Group();
      const up = new THREE.Mesh(new THREE.ConeGeometry(0.95, 1.25, 6), mat);
      up.position.y = 0.6;
      group.add(up);
      const dn = new THREE.Mesh(new THREE.ConeGeometry(0.95, 1.25, 6), mat);
      dn.position.y = -0.6;
      dn.rotation.x = Math.PI;
      group.add(dn);
      group.rotation.set(0.12, 0.4, 0);
      return group;
    }
    case 'bladed': {
      const group = new THREE.Group();
      const angles = [-0.32, 0, 0.34];
      angles.forEach((a, i) => {
        const blade = new THREE.Mesh(new THREE.BoxGeometry(0.55, 2.3, 0.16), mat);
        blade.rotation.z = a;
        blade.position.x = (i - 1) * 0.28;
        blade.position.y = -Math.abs(i - 1) * 0.18;
        group.add(blade);
      });
      group.rotation.set(0.05, 0.5, 0);
      return group;
    }
    case 'tabular': {
      const group = new THREE.Group();
      // iron-rose: a few thin hexagonal plates fanned about the centre
      [0, 0.5, 1.0, 1.55].forEach((rot, i) => {
        const plate = new THREE.Mesh(new THREE.CylinderGeometry(1.05 - i * 0.04, 1.05 - i * 0.04, 0.16, 6), mat);
        plate.rotation.y = rot;
        plate.rotation.x = 0.12 * (i - 1.5);
        group.add(plate);
      });
      group.rotation.set(0.45, 0.3, 0.1);
      return group;
    }
    case 'nativeMass': {
      const g = new THREE.IcosahedronGeometry(1.1, 3);
      const pos = g.attributes.position as THREE.BufferAttribute;
      const v = new THREE.Vector3();
      for (let i = 0; i < pos.count; i++) {
        v.fromBufferAttribute(pos, i);
        const lump =
          Math.sin(v.x * 3.1 + v.y * 1.7) * 0.4 +
          Math.sin(v.y * 2.5 + v.z * 2.9) * 0.4 +
          Math.sin(v.z * 3.7 + v.x * 1.3) * 0.4;
        v.multiplyScalar(1 + lump * 0.18);
        pos.setXYZ(i, v.x, v.y, v.z);
      }
      g.computeVertexNormals();
      const mesh = new THREE.Mesh(g, mat);
      mesh.rotation.set(0.2, 0.5, 0);
      return mesh;
    }
    case 'cluster': {
      const group = new THREE.Group();
      const blobs: Array<[number, number, number, number]> = [
        [0, 0, 0, 0.92], [0.72, 0.18, 0.3, 0.6], [-0.6, 0.32, 0.18, 0.56],
        [0.22, -0.5, 0.5, 0.5], [0.32, 0.6, -0.42, 0.46], [-0.42, -0.42, -0.3, 0.5],
        [0.05, 0.12, -0.72, 0.42], [-0.2, -0.1, 0.66, 0.4],
      ];
      blobs.forEach(([x, y, z, r]) => {
        const s = new THREE.Mesh(new THREE.SphereGeometry(r, 48, 48), mat);
        s.position.set(x, y, z);
        group.add(s);
      });
      return group;
    }
  }
}

interface BuiltMaterial {
  material: THREE.Material;
  own: THREE.Texture[]; // per-mineral textures to dispose on switch
}

function buildMaterial(m: Mineral, striation: THREE.Texture, mottle: THREE.Texture): BuiltMaterial {
  const own: THREE.Texture[] = [];
  const faceted = m.habit !== 'cluster';
  const mat = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(m.color),
    metalness: m.metalness,
    roughness: m.roughness,
    envMapIntensity: m.metalness > 0.5 ? 1.7 : 1.35,
    flatShading: faceted && m.surface !== 'banded',
  });

  if (m.transmission > 0) {
    mat.transmission = m.transmission;
    mat.thickness = 1.3;
    mat.ior = m.ior ?? 1.5;
    mat.transparent = true;
    mat.dispersion = m.dispersion ?? 0;
    mat.clearcoat = 0.4;
    mat.clearcoatRoughness = 0.12;
    mat.attenuationColor = new THREE.Color(m.color);
    mat.attenuationDistance = 2.8;
    mat.envMapIntensity = 1.6;
  }
  if (m.anisotropy) mat.anisotropy = m.anisotropy;
  if (m.sheen) {
    mat.sheen = m.sheen;
    mat.sheenColor = new THREE.Color(m.color).multiplyScalar(1.4);
  }

  if (m.surface === 'striated') {
    mat.bumpMap = striation;
    mat.bumpScale = 0.015;
  } else if (m.surface === 'metallic') {
    mat.bumpMap = mottle;
    mat.bumpScale = 0.022;
  } else if (m.surface === 'banded' && m.bandColors) {
    const bt = bandedColor(m.bandColors);
    bt.repeat.set(1.5, 1.5);
    own.push(bt);
    mat.map = bt;
    mat.color.set('#ffffff');
    mat.bumpMap = bt;
    mat.bumpScale = 0.012;
  }

  return { material: mat, own };
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
    ['Luster', m.luster], ['Class', m.group],
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
    let targetDist = 6.4;
    let dist = targetDist;
    camera.position.set(0, 0, dist);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
    renderer.domElement.style.position = 'absolute';
    renderer.domElement.style.inset = '0';
    mount.appendChild(renderer.domElement);

    // studio environment for realistic gem/metal reflections
    const pmrem = new THREE.PMREMGenerator(renderer);
    const envRT = pmrem.fromScene(new RoomEnvironment(), 0.04);
    scene.environment = envRT.texture;

    // studio lighting: key, fill, rim, top sparkle
    const key = new THREE.DirectionalLight(0xffffff, 1.7);
    key.position.set(4, 5, 5);
    scene.add(key);
    const fill = new THREE.DirectionalLight(0xcfe0ff, 0.5);
    fill.position.set(-4, 1, 3);
    scene.add(fill);
    const rim = new THREE.DirectionalLight(0xffe8c0, 0.85);
    rim.position.set(-5, -2, -4);
    scene.add(rim);
    const top = new THREE.DirectionalLight(0xffffff, 0.7);
    top.position.set(0, 7, 1);
    scene.add(top);

    // shared procedural surface maps (reused across specimens)
    const striationTex = striationBump();
    striationTex.repeat.set(2, 5);
    const mottleTex = mottleBump();
    mottleTex.repeat.set(2, 2);
    const shadowTex = contactShadow();

    // soft contact shadow grounding the specimen
    const shadow = new THREE.Mesh(
      new THREE.PlaneGeometry(5, 5),
      new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false, opacity: 0.85 })
    );
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = -1.75;
    scene.add(shadow);

    // CSS3D layer for the floating panel
    const cssRenderer = new CSS3DRenderer();
    cssRenderer.setSize(width, height);
    const cssEl = cssRenderer.domElement;
    cssEl.style.position = 'absolute';
    cssEl.style.top = '0';
    cssEl.style.left = '0';
    cssEl.style.pointerEvents = 'none';
    mount.appendChild(cssEl);

    const crystalGroup = new THREE.Group();
    scene.add(crystalGroup);

    let current: THREE.Object3D | null = null;
    let currentMat: THREE.Material | null = null;
    let currentOwn: THREE.Texture[] = [];
    let panelObj: CSS3DObject | null = null;

    const disposeObject = (obj: THREE.Object3D) => {
      obj.traverse((o) => {
        if (o instanceof THREE.Mesh) o.geometry.dispose();
      });
    };

    const setMineral = (m: Mineral) => {
      if (current) { crystalGroup.remove(current); disposeObject(current); current = null; }
      if (currentMat) { currentMat.dispose(); currentMat = null; }
      currentOwn.forEach((t) => t.dispose());
      currentOwn = [];

      const built = buildMaterial(m, striationTex, mottleTex);
      currentMat = built.material;
      currentOwn = built.own;
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
      targetDist = Math.min(11, Math.max(3.6, targetDist * Math.exp(e.deltaY * 0.0011)));
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
      if (!dragging && idle > 0.6) crystalGroup.rotation.y += dt * 0.32;
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
      currentOwn.forEach((t) => t.dispose());
      if (panelObj) panelObj.element.remove();
      striationTex.dispose();
      mottleTex.dispose();
      shadowTex.dispose();
      shadow.geometry.dispose();
      (shadow.material as THREE.Material).dispose();
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
