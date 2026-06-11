// ---------------------------------------------------------------------------
// StarScape — Cosmos Explorer: interactive 3D solar system
// ---------------------------------------------------------------------------
// Two renderers stacked on one container: WebGLRenderer draws the planets,
// CSS3DRenderer draws live HTML data panels that exist in 3D space beside
// them. One requestAnimationFrame loop drives both with the same camera.
// Custom spherical-coordinate orbit controls (drag rotate / wheel zoom),
// raycast click-to-select. Panels are built with DOM APIs — no innerHTML.
// ---------------------------------------------------------------------------

import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import {
  CSS3DRenderer,
  CSS3DObject,
} from 'three/examples/jsm/renderers/CSS3DRenderer.js';
import { PLANETS, type Planet } from '@data/planets';
import '../styles/cosmos.css';

// ---------------------------------------------------------------------------
// CSS3D panel factory — DOM construction only (project rule: no innerHTML)
// ---------------------------------------------------------------------------

function makeEl(tag: string, className: string, text?: string): HTMLElement {
  const el = document.createElement(tag);
  el.className = className;
  if (text) el.textContent = text;
  return el;
}

function buildPanel(planet: Planet): HTMLDivElement {
  const root = document.createElement('div');
  root.className = 'css3d-panel';
  root.style.pointerEvents = 'all';

  root.appendChild(makeEl('div', 'panel-scanline'));
  root.appendChild(makeEl('div', 'panel-eye', 'Target acquired'));
  root.appendChild(makeEl('div', 'panel-name', planet.name));
  root.appendChild(makeEl('div', 'panel-type', planet.type_label));

  const grid = makeEl('div', 'panel-grid');
  planet.stats.forEach(([key, value]) => {
    const cell = document.createElement('div');
    cell.appendChild(makeEl('div', 'sk', key));
    cell.appendChild(makeEl('div', 'sv', value));
    grid.appendChild(cell);
  });
  root.appendChild(grid);

  root.appendChild(makeEl('div', 'panel-desc', planet.description));
  return root;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface SceneApi {
  selectPlanet: (id: string | null) => void;
}

export function SolarSystemExplorer() {
  const containerRef = useRef<HTMLDivElement>(null);
  const apiRef = useRef<SceneApi | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  // Stable bridge so the scene (created once) can update React state
  const onPickRef = useRef<(id: string | null) => void>(() => {});
  onPickRef.current = (id) => setSelected(id);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let width = container.clientWidth;
    let height = container.clientHeight;

    // --- Scene, camera, renderers -----------------------------------------
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(55, width / height, 0.1, 2000);

    // Spherical orbit-control state: camera starts at (0, 28, 75)
    const sph = { theta: 0, phi: 1.215, radius: 80 };
    const applyCamera = () => {
      camera.position.set(
        sph.radius * Math.sin(sph.phi) * Math.sin(sph.theta),
        sph.radius * Math.cos(sph.phi),
        sph.radius * Math.sin(sph.phi) * Math.cos(sph.theta)
      );
      camera.lookAt(0, 0, 0);
    };
    applyCamera();

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.domElement.style.position = 'absolute';
    renderer.domElement.style.inset = '0';
    container.appendChild(renderer.domElement);

    const cssRenderer = new CSS3DRenderer();
    cssRenderer.setSize(width, height);
    const cssEl = cssRenderer.domElement;
    cssEl.style.position = 'absolute';
    cssEl.style.top = '0';
    cssEl.style.left = '0';
    // Essential: let clicks pass through to the WebGL canvas below;
    // individual panels re-enable pointer-events on themselves
    cssEl.style.pointerEvents = 'none';
    container.appendChild(cssEl);

    // --- Lights ------------------------------------------------------------
    // distance 0 / decay 0: constant intensity — physical falloff at these
    // scene scales (orbits out to 65 units) leaves outer planets black
    scene.add(new THREE.PointLight(0xfff5e0, 3, 0, 0));
    scene.add(new THREE.AmbientLight(0x112244, 0.6));

    // --- Star field ----------------------------------------------------------
    const starCount = 9000;
    const starPositions = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount * 3; i++) {
      starPositions[i] = (Math.random() - 0.5) * 900;
    }
    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    const starMat = new THREE.PointsMaterial({
      color: 0xeeeeff,
      size: 0.22,
      transparent: true,
      opacity: 0.9,
    });
    scene.add(new THREE.Points(starGeo, starMat));

    // --- Sun -----------------------------------------------------------------
    const sun = new THREE.Mesh(
      new THREE.SphereGeometry(4.5, 48, 48),
      new THREE.MeshBasicMaterial({ color: 0xffb347 })
    );
    const halo = new THREE.Mesh(
      new THREE.SphereGeometry(6.5, 32, 32),
      new THREE.MeshBasicMaterial({ color: 0xffb347, transparent: true, opacity: 0.07 })
    );
    scene.add(sun, halo);

    // --- Planets -------------------------------------------------------------
    interface PlanetEntity {
      planet: Planet;
      group: THREE.Group;
      mesh: THREE.Mesh;
      angle: number;
    }

    const entities: PlanetEntity[] = PLANETS.map((planet) => {
      const group = new THREE.Group();
      const mesh = new THREE.Mesh(
        new THREE.SphereGeometry(planet.radius, 40, 40),
        new THREE.MeshStandardMaterial({
          color: planet.color,
          roughness: 0.75,
          metalness: 0.05,
        })
      );
      group.add(mesh);

      if (planet.hasRings) {
        const ring = new THREE.Mesh(
          new THREE.RingGeometry(planet.radius * 1.6, planet.radius * 2.9, 64),
          new THREE.MeshBasicMaterial({
            color: 0xe4d191,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.35,
          })
        );
        ring.rotation.x = Math.PI / 2.8;
        group.add(ring);
      }

      const angle = Math.random() * Math.PI * 2;
      group.position.set(
        Math.cos(angle) * planet.orbitRadius,
        0,
        Math.sin(angle) * planet.orbitRadius
      );
      scene.add(group);

      // Orbit line
      const orbitPts: THREE.Vector3[] = [];
      for (let i = 0; i <= 128; i++) {
        const a = (i / 128) * Math.PI * 2;
        orbitPts.push(
          new THREE.Vector3(
            Math.cos(a) * planet.orbitRadius,
            0,
            Math.sin(a) * planet.orbitRadius
          )
        );
      }
      scene.add(
        new THREE.Line(
          new THREE.BufferGeometry().setFromPoints(orbitPts),
          new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.055 })
        )
      );

      return { planet, group, mesh, angle };
    });

    // --- Panel management -----------------------------------------------------
    let panelObj: CSS3DObject | null = null;
    let panelHost: THREE.Group | null = null;

    const selectPlanet = (id: string | null) => {
      if (panelObj && panelHost) {
        panelHost.remove(panelObj);
        panelObj.element.remove();
        panelObj = null;
        panelHost = null;
      }
      if (!id) return;
      const ent = entities.find((e) => e.planet.id === id);
      if (!ent) return;
      panelObj = new CSS3DObject(buildPanel(ent.planet));
      // Panel is parented to the planet group so it travels along the orbit.
      // 300px-wide panel × 0.05 = 15 scene units; offset clears the sphere.
      panelObj.position.set(ent.planet.radius + 10, ent.planet.radius + 2.5, 0);
      panelObj.scale.setScalar(0.05);
      ent.group.add(panelObj);
      panelHost = ent.group;
    };
    apiRef.current = { selectPlanet };

    // --- Pointer controls (custom — OrbitControls not in the bundle) ----------
    let dragging = false;
    let movedPx = 0;
    let lastX = 0;
    let lastY = 0;

    const onPointerDown = (e: PointerEvent) => {
      dragging = true;
      movedPx = 0;
      lastX = e.clientX;
      lastY = e.clientY;
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!dragging) return;
      const dx = e.clientX - lastX;
      const dy = e.clientY - lastY;
      lastX = e.clientX;
      lastY = e.clientY;
      movedPx += Math.abs(dx) + Math.abs(dy);
      sph.theta -= dx * 0.005;
      sph.phi = Math.min(Math.PI - 0.15, Math.max(0.15, sph.phi - dy * 0.005));
      applyCamera();
    };

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();

    const onPointerUp = (e: PointerEvent) => {
      const wasDrag = movedPx >= 6;
      dragging = false;
      if (wasDrag) return;
      // Treat as click — raycast against planet meshes
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
      const hits = raycaster.intersectObjects(entities.map((ent) => ent.mesh));
      if (hits.length > 0) {
        const ent = entities.find((en) => en.mesh === hits[0].object);
        if (ent) {
          selectPlanet(ent.planet.id);
          onPickRef.current(ent.planet.id);
        }
      } else {
        selectPlanet(null);
        onPickRef.current(null);
      }
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      sph.radius = Math.min(180, Math.max(18, sph.radius + e.deltaY * 0.05));
      applyCamera();
    };

    const glEl = renderer.domElement;
    glEl.addEventListener('pointerdown', onPointerDown);
    glEl.addEventListener('pointermove', onPointerMove);
    glEl.addEventListener('pointerup', onPointerUp);
    glEl.addEventListener('pointerleave', () => {
      dragging = false;
    });
    glEl.addEventListener('wheel', onWheel, { passive: false });

    // --- Resize ----------------------------------------------------------------
    const onResize = () => {
      width = container.clientWidth;
      height = container.clientHeight;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
      cssRenderer.setSize(width, height);
    };
    window.addEventListener('resize', onResize);

    // --- Animation loop ----------------------------------------------------------
    const clock = new THREE.Clock();
    let raf = 0;
    const animate = () => {
      raf = requestAnimationFrame(animate);
      const delta = clock.getDelta();
      const t = performance.now();

      sun.scale.setScalar(1 + Math.sin(t * 0.0009) * 0.015);

      entities.forEach((ent) => {
        ent.angle += ent.planet.orbitSpeed * delta;
        ent.group.position.set(
          Math.cos(ent.angle) * ent.planet.orbitRadius,
          0,
          Math.sin(ent.angle) * ent.planet.orbitRadius
        );
        ent.mesh.rotation.y += delta * 0.3;
      });

      // Billboard: panel always faces the camera (before cssRenderer.render)
      if (panelObj) panelObj.quaternion.copy(camera.quaternion);

      renderer.render(scene, camera);
      cssRenderer.render(scene, camera);
    };
    animate();

    // --- Cleanup --------------------------------------------------------------
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', onResize);
      glEl.removeEventListener('pointerdown', onPointerDown);
      glEl.removeEventListener('pointermove', onPointerMove);
      glEl.removeEventListener('pointerup', onPointerUp);
      glEl.removeEventListener('wheel', onWheel);
      apiRef.current = null;
      scene.traverse((obj) => {
        if (obj instanceof THREE.Mesh || obj instanceof THREE.Points || obj instanceof THREE.Line) {
          obj.geometry.dispose();
          const mat = obj.material;
          if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
          else mat.dispose();
        }
      });
      renderer.dispose();
      glEl.remove();
      cssEl.remove();
    };
  }, []);

  const handlePill = (id: string) => {
    const next = selected === id ? null : id;
    setSelected(next);
    apiRef.current?.selectPlanet(next);
  };

  return (
    <div className="cosmos-explorer" ref={containerRef} aria-label="Interactive 3D solar system">
      {/* HUD — top-left observatory readout */}
      <div className="cosmos-hud" aria-hidden="true">
        <div className="hud-title">Sol Observatory</div>
        <div className="hud-hint">drag to rotate · scroll to zoom · click a planet</div>
      </div>

      {/* Bottom pill navigation */}
      <nav className="planet-pills" aria-label="Planet selection">
        {PLANETS.map((p) => (
          <button
            key={p.id}
            className={`pill${selected === p.id ? ' pill-active' : ''}`}
            onClick={() => handlePill(p.id)}
            aria-pressed={selected === p.id}
          >
            <span className="pill-dot" style={{ background: p.displayColor }} aria-hidden="true" />
            {p.name}
          </button>
        ))}
      </nav>
    </div>
  );
}
