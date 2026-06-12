// ---------------------------------------------------------------------------
// StarScape — Cosmos Explorer: Earth → Solar System → Kuiper Belt → Galaxy
// ---------------------------------------------------------------------------
// One continuous, inertially-damped zoom across ~10 orders of magnitude:
// procedurally-textured planets with atmospheres up close; the Kuiper Belt
// and Pluto past Neptune; named stars at interstellar range; and a full
// procedural spiral galaxy with Sagittarius A* (black hole + accretion disk)
// at the largest scale. All textures generated in-browser — zero downloads.
//
// Two renderers share one camera: WebGLRenderer (world) + CSS3DRenderer
// (floating data panels and spatial labels, always billboarded). Panels and
// labels are built with DOM APIs — no innerHTML (project security rule).
// ---------------------------------------------------------------------------

import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import {
  CSS3DRenderer,
  CSS3DObject,
} from 'three/examples/jsm/renderers/CSS3DRenderer.js';
import { PLANETS, type Planet } from '@data/planets';
import {
  DEEP_STARS,
  SUN_INFO,
  PLUTO_INFO,
  SAG_A,
  type DeepSpaceObject,
} from '@data/deepSpace';
import {
  planetTexture,
  cloudTexture,
  ringTexture,
  glowTexture,
  sunTexture,
  accretionTexture,
} from '@utils/textures';
import '../styles/cosmos.css';

// --- physical character per planet (axial tilt rad, spin rad/s visual) -----

const TILT: Record<string, number> = {
  mercury: 0.001, venus: 3.09, earth: 0.41, mars: 0.44,
  jupiter: 0.05, saturn: 0.47, uranus: 1.71, neptune: 0.49,
};
const SPIN: Record<string, number> = {
  mercury: 0.02, venus: -0.012, earth: 0.22, mars: 0.21,
  jupiter: 0.5, saturn: 0.44, uranus: 0.34, neptune: 0.31,
};

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const smoothstep = (a: number, b: number, v: number) => {
  const t = clamp01((v - a) / (b - a));
  return t * t * (3 - 2 * t);
};

// --- DOM helpers (no innerHTML) ----------------------------------------------

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

// --- fresnel atmosphere shader ---------------------------------------------------

function makeAtmosphere(radius: number, hex: string, intensity: number): THREE.Mesh {
  const mat = new THREE.ShaderMaterial({
    uniforms: {
      uColor: { value: new THREE.Color(hex) },
      uIntensity: { value: intensity },
    },
    vertexShader: /* glsl */ `
      varying vec3 vN;
      varying vec3 vP;
      void main() {
        vN = normalize(normalMatrix * normal);
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vP = mv.xyz;
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor;
      uniform float uIntensity;
      varying vec3 vN;
      varying vec3 vP;
      void main() {
        float fres = pow(1.0 - abs(dot(normalize(vN), normalize(-vP))), 2.4);
        gl_FragColor = vec4(uColor, fres * uIntensity);
      }
    `,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  return new THREE.Mesh(new THREE.SphereGeometry(radius, 32, 32), mat);
}

// Re-map RingGeometry UVs so texture U follows the radial direction
function radialRing(inner: number, outer: number, segments = 96): THREE.RingGeometry {
  const geo = new THREE.RingGeometry(inner, outer, segments, 1);
  const pos = geo.attributes.position as THREE.BufferAttribute;
  const uv = geo.attributes.uv as THREE.BufferAttribute;
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    uv.setXY(i, (v.length() - inner) / (outer - inner), 0.5);
  }
  return geo;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

type JumpTarget = 'earth' | 'system' | 'belt' | 'galaxy';

interface SceneApi {
  selectPlanet: (id: string | null) => void;
  jumpTo: (target: JumpTarget) => void;
  releaseFocus: () => void;
}

const DEEP_LOOKUP: Record<string, DeepSpaceObject> = Object.fromEntries(
  [...DEEP_STARS, SUN_INFO, PLUTO_INFO, SAG_A].map((o) => [o.id, o])
);

export function SolarSystemExplorer() {
  const containerRef = useRef<HTMLDivElement>(null);
  const zoneRef = useRef<HTMLDivElement>(null);
  const apiRef = useRef<SceneApi | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [deepObject, setDeepObject] = useState<DeepSpaceObject | null>(null);

  // Stable bridges so the scene (created once) can update React state
  const onPickRef = useRef<(id: string | null) => void>(() => {});
  onPickRef.current = (id) => setSelected(id);
  const onDeepRef = useRef<(id: string | null) => void>(() => {});
  onDeepRef.current = (id) => setDeepObject(id ? DEEP_LOOKUP[id] ?? null : null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let width = container.clientWidth;
    let height = container.clientHeight;
    const disposables: Array<{ dispose: () => void }> = [];
    const track = <T extends { dispose: () => void }>(d: T): T => {
      disposables.push(d);
      return d;
    };

    // --- camera + inertial control state --------------------------------------
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(55, width / height, 0.5, 9000);

    const MIN_R = 3.2;
    const MAX_R = 2600;
    const current = { theta: 0.4, phi: 1.15, radius: 80 };
    const target = { theta: 0.4, phi: 1.15, radius: 80 };
    let spinVel = 0; // inertial horizontal velocity (rad/s)
    const pivot = new THREE.Vector3(); // smoothed camera focus point
    const pivotTarget = new THREE.Vector3();

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.domElement.style.position = 'absolute';
    renderer.domElement.style.inset = '0';
    container.appendChild(renderer.domElement);
    track(renderer);

    const cssRenderer = new CSS3DRenderer();
    cssRenderer.setSize(width, height);
    const cssEl = cssRenderer.domElement;
    cssEl.style.position = 'absolute';
    cssEl.style.top = '0';
    cssEl.style.left = '0';
    cssEl.style.pointerEvents = 'none'; // clicks pass through to the canvas
    container.appendChild(cssEl);

    const billboards: CSS3DObject[] = []; // everything that must face the camera

    // Procedural textures are streamed in one-per-tick after first paint so
    // generation never produces a long main-thread task (keeps TBT near zero).
    // Surfaces start as flat colours and upgrade as their texture lands.
    const texQueue: Array<() => void> = [];

    // --- lights ---------------------------------------------------------------------
    scene.add(new THREE.PointLight(0xfff5e0, 3.2, 0, 0));
    scene.add(new THREE.AmbientLight(0x223355, 0.55));

    // --- background star shell (constant-size points, valid at every zoom) ------------
    {
      const N = 7000;
      const posArr = new Float32Array(N * 3);
      const colArr = new Float32Array(N * 3);
      for (let i = 0; i < N; i++) {
        const dir = new THREE.Vector3(
          Math.random() - 0.5,
          Math.random() - 0.5,
          Math.random() - 0.5
        ).normalize();
        const d = 5200 + Math.random() * 1600;
        posArr.set([dir.x * d, dir.y * d, dir.z * d], i * 3);
        const warm = Math.random();
        colArr.set([0.8 + warm * 0.2, 0.82 + warm * 0.12, 0.95 - warm * 0.15], i * 3);
      }
      const geo = track(new THREE.BufferGeometry());
      geo.setAttribute('position', new THREE.BufferAttribute(posArr, 3));
      geo.setAttribute('color', new THREE.BufferAttribute(colArr, 3));
      const mat = track(
        new THREE.PointsMaterial({
          size: 1.6,
          sizeAttenuation: false,
          vertexColors: true,
          transparent: true,
          opacity: 0.85,
        })
      );
      scene.add(new THREE.Points(geo, mat));
    }

    // --- the Sun -----------------------------------------------------------------------
    const sunMat = track(new THREE.MeshBasicMaterial({ color: 0xffb347 }));
    const sun = new THREE.Mesh(track(new THREE.SphereGeometry(4.5, 48, 48)), sunMat);
    scene.add(sun);
    texQueue.push(() => {
      sunMat.map = track(sunTexture());
      sunMat.color.set(0xffffff);
      sunMat.needsUpdate = true;
    });

    const sunGlowTex = track(glowTexture('#FFB347'));
    const sunGlow = new THREE.Sprite(
      track(
        new THREE.SpriteMaterial({
          map: sunGlowTex,
          transparent: true,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
          opacity: 0.9,
        })
      )
    );
    sunGlow.scale.setScalar(26);
    scene.add(sunGlow);

    const sunHit = new THREE.Mesh(
      track(new THREE.SphereGeometry(5.2, 12, 12)),
      track(new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }))
    );
    scene.add(sunHit);

    // --- planets ----------------------------------------------------------------------
    interface PlanetEntity {
      planet: Planet;
      group: THREE.Group;
      mesh: THREE.Mesh;
      angle: number;
      clouds?: THREE.Mesh;
      moonOrbit?: THREE.Group;
    }

    const orbitMats: THREE.LineBasicMaterial[] = [];
    const planetLabels: HTMLElement[] = [];

    const makeLabel = (
      text: string,
      scale: number,
      cls = 'space-label'
    ): CSS3DObject => {
      const el = makeEl('div', cls, text);
      el.style.opacity = '0'; // faded in by the zoom-level logic
      const obj = new CSS3DObject(el);
      obj.scale.setScalar(scale);
      billboards.push(obj);
      return obj;
    };

    const entities: PlanetEntity[] = PLANETS.map((planet) => {
      const group = new THREE.Group();
      const tiltGroup = new THREE.Group();
      tiltGroup.rotation.z = TILT[planet.id] ?? 0;
      group.add(tiltGroup);

      const surfMat = track(
        new THREE.MeshStandardMaterial({ color: planet.color, roughness: 0.85, metalness: 0.02 })
      );
      const mesh = new THREE.Mesh(
        track(new THREE.SphereGeometry(planet.radius, 36, 36)),
        surfMat
      );
      tiltGroup.add(mesh);
      texQueue.push(() => {
        surfMat.map = track(planetTexture(planet.id, planet.color));
        surfMat.color.set(0xffffff);
        surfMat.needsUpdate = true;
      });

      const ent: PlanetEntity = { planet, group, mesh, angle: Math.random() * Math.PI * 2 };

      if (planet.id === 'earth') {
        const cloudMat = track(
          new THREE.MeshStandardMaterial({ transparent: true, depthWrite: false, roughness: 1 })
        );
        const clouds = new THREE.Mesh(
          track(new THREE.SphereGeometry(planet.radius * 1.02, 36, 36)),
          cloudMat
        );
        clouds.visible = false; // shown once the cloud texture lands
        texQueue.push(() => {
          cloudMat.map = track(cloudTexture());
          cloudMat.needsUpdate = true;
          clouds.visible = true;
        });
        tiltGroup.add(clouds);
        ent.clouds = clouds;
        tiltGroup.add(makeAtmosphere(planet.radius * 1.07, '#4FA8FF', 0.85));
        // the Moon
        const moonOrbit = new THREE.Group();
        const moonMat = track(
          new THREE.MeshStandardMaterial({ color: 0x9c9890, roughness: 0.95 })
        );
        const moon = new THREE.Mesh(track(new THREE.SphereGeometry(0.27, 24, 24)), moonMat);
        texQueue.push(() => {
          moonMat.map = track(planetTexture('mercury', '#9C9890'));
          moonMat.color.set(0xffffff);
          moonMat.needsUpdate = true;
        });
        moon.position.set(2.4, 0.2, 0);
        moonOrbit.add(moon);
        group.add(moonOrbit);
        ent.moonOrbit = moonOrbit;
      } else if (planet.id === 'venus') {
        tiltGroup.add(makeAtmosphere(planet.radius * 1.06, '#E8C87A', 0.55));
      } else if (planet.id === 'mars') {
        tiltGroup.add(makeAtmosphere(planet.radius * 1.05, '#D88B5A', 0.3));
      } else if (planet.type !== 'Terrestrial') {
        tiltGroup.add(makeAtmosphere(planet.radius * 1.04, planet.displayColor, 0.3));
      }

      if (planet.hasRings) {
        const ring = new THREE.Mesh(
          track(radialRing(planet.radius * 1.45, planet.radius * 2.6)),
          track(
            new THREE.MeshBasicMaterial({
              map: track(ringTexture('saturn')),
              side: THREE.DoubleSide,
              transparent: true,
              depthWrite: false,
            })
          )
        );
        ring.rotation.x = Math.PI / 2;
        tiltGroup.add(ring);
      }
      if (planet.id === 'uranus') {
        const ring = new THREE.Mesh(
          track(radialRing(planet.radius * 1.5, planet.radius * 2.1)),
          track(
            new THREE.MeshBasicMaterial({
              map: track(ringTexture('uranus')),
              side: THREE.DoubleSide,
              transparent: true,
              depthWrite: false,
            })
          )
        );
        ring.rotation.x = Math.PI / 2;
        tiltGroup.add(ring);
      }

      // floating name label
      const label = makeLabel(planet.name, 0.045);
      label.position.set(0, planet.radius + 1.4, 0);
      group.add(label);
      planetLabels.push(label.element);

      group.position.set(
        Math.cos(ent.angle) * planet.orbitRadius,
        0,
        Math.sin(ent.angle) * planet.orbitRadius
      );
      scene.add(group);

      // orbit line
      const pts: THREE.Vector3[] = [];
      for (let i = 0; i <= 160; i++) {
        const a = (i / 160) * Math.PI * 2;
        pts.push(new THREE.Vector3(Math.cos(a) * planet.orbitRadius, 0, Math.sin(a) * planet.orbitRadius));
      }
      const mat = track(
        new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.055 })
      );
      orbitMats.push(mat);
      scene.add(new THREE.Line(track(new THREE.BufferGeometry().setFromPoints(pts)), mat));

      return ent;
    });

    // --- Pluto + Kuiper Belt -------------------------------------------------------------
    const plutoGroup = new THREE.Group();
    const plutoMat = track(new THREE.MeshStandardMaterial({ color: 0xc9b29b, roughness: 0.9 }));
    const plutoMesh = new THREE.Mesh(track(new THREE.SphereGeometry(0.32, 28, 28)), plutoMat);
    texQueue.push(() => {
      plutoMat.map = track(planetTexture('mercury', '#C9B29B'));
      plutoMat.color.set(0xffffff);
      plutoMat.needsUpdate = true;
    });
    plutoGroup.add(plutoMesh);
    const plutoLabel = makeLabel('Pluto', 0.045);
    plutoLabel.position.set(0, 1.6, 0);
    plutoGroup.add(plutoLabel);
    planetLabels.push(plutoLabel.element);
    let plutoAngle = Math.random() * Math.PI * 2;
    const plutoTilted = new THREE.Group();
    plutoTilted.rotation.x = 0.3; // exaggerated orbital inclination
    plutoTilted.add(plutoGroup);
    scene.add(plutoTilted);

    let kuiperMat: THREE.PointsMaterial;
    let kuiperPoints: THREE.Points;
    {
      const N = 2600;
      const posArr = new Float32Array(N * 3);
      for (let i = 0; i < N; i++) {
        const a = Math.random() * Math.PI * 2;
        const r = 80 + Math.pow(Math.random(), 1.4) * 40;
        const y = (Math.random() - 0.5) * 7;
        posArr.set([Math.cos(a) * r, y, Math.sin(a) * r], i * 3);
      }
      const geo = track(new THREE.BufferGeometry());
      geo.setAttribute('position', new THREE.BufferAttribute(posArr, 3));
      kuiperMat = track(
        new THREE.PointsMaterial({
          color: 0x9fc4cc,
          size: 0.7,
          transparent: true,
          opacity: 0,
          depthWrite: false,
        })
      );
      kuiperPoints = new THREE.Points(geo, kuiperMat);
      kuiperPoints.visible = false;
      scene.add(kuiperPoints);
    }

    // --- named deep-space stars (interstellar layer) ----------------------------------------
    interface DeepEntity {
      data: DeepSpaceObject;
      sprite: THREE.Sprite;
      hit: THREE.Mesh;
      labelEl: HTMLElement;
    }

    const deepEntities: DeepEntity[] = DEEP_STARS.map((star) => {
      const sprite = new THREE.Sprite(
        track(
          new THREE.SpriteMaterial({
            map: track(glowTexture(star.color)),
            transparent: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            opacity: 0,
          })
        )
      );
      const [px, py, pz] = star.pos ?? [0, 0, 0];
      sprite.position.set(px, py, pz);
      sprite.scale.setScalar(star.size ?? 18);
      scene.add(sprite);

      const hit = new THREE.Mesh(
        track(new THREE.SphereGeometry((star.size ?? 18) * 0.5, 8, 8)),
        track(new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }))
      );
      hit.position.copy(sprite.position);
      scene.add(hit);

      const label = makeLabel(star.name, 0.7, 'space-label space-label-deep');
      label.position.copy(sprite.position).add(new THREE.Vector3(0, (star.size ?? 18) * 0.75, 0));
      scene.add(label);

      return { data: star, sprite, hit, labelEl: label.element };
    });

    // --- the galaxy ----------------------------------------------------------------------------
    const galaxyGroup = new THREE.Group();
    galaxyGroup.visible = false; // skipped entirely until zoomed out far enough
    const GC = new THREE.Vector3(-820, -40, -540); // galactic centre, scene units
    galaxyGroup.position.copy(GC);
    galaxyGroup.rotation.x = 0.18;
    galaxyGroup.rotation.z = 0.06;
    scene.add(galaxyGroup);

    let galaxyMat: THREE.PointsMaterial;
    {
      const N = 42000;
      const posArr = new Float32Array(N * 3);
      const colArr = new Float32Array(N * 3);
      const gauss = () =>
        (Math.random() + Math.random() + Math.random() + Math.random() - 2) / 2;
      for (let i = 0; i < N; i++) {
        let x: number, y: number, z: number;
        let cr: number, cg: number, cb: number;
        if (i < N * 0.22) {
          // central bulge — warm old stars
          const r = Math.abs(gauss()) * 200;
          const a = Math.random() * Math.PI * 2;
          const e = (Math.random() - 0.5) * Math.PI;
          x = Math.cos(a) * Math.cos(e) * r;
          z = Math.sin(a) * Math.cos(e) * r;
          y = Math.sin(e) * r * 0.45;
          const br = 0.5 + Math.random() * 0.5;
          cr = br;
          cg = br * 0.82;
          cb = br * 0.6;
        } else {
          // spiral arms — young blue stars with pink HII regions
          const arm = Math.floor(Math.random() * 2);
          const t = Math.pow(Math.random(), 0.6);
          const r = 90 + t * 1380;
          const a = arm * Math.PI + r * 0.0032 + gauss() * (0.5 - t * 0.32);
          x = Math.cos(a) * r + gauss() * 50;
          z = Math.sin(a) * r + gauss() * 50;
          y = gauss() * (34 - t * 22);
          const br = 0.3 + Math.random() * 0.7;
          if (Math.random() < 0.05) {
            cr = br;
            cg = br * 0.55;
            cb = br * 0.75; // HII pink
          } else {
            cr = br * 0.72;
            cg = br * 0.8;
            cb = br;
          }
        }
        posArr.set([x, y, z], i * 3);
        colArr.set([cr, cg, cb], i * 3);
      }
      const geo = track(new THREE.BufferGeometry());
      geo.setAttribute('position', new THREE.BufferAttribute(posArr, 3));
      geo.setAttribute('color', new THREE.BufferAttribute(colArr, 3));
      galaxyMat = track(
        new THREE.PointsMaterial({
          size: 2.4,
          vertexColors: true,
          transparent: true,
          opacity: 0,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
        })
      );
      galaxyGroup.add(new THREE.Points(geo, galaxyMat));
    }

    // Sagittarius A* — black hole, accretion disk, photon glow
    const bhCore = new THREE.Mesh(
      track(new THREE.SphereGeometry(13, 32, 32)),
      track(new THREE.MeshBasicMaterial({ color: 0x000000 }))
    );
    galaxyGroup.add(bhCore);

    const diskMat = track(
      new THREE.MeshBasicMaterial({
        map: track(accretionTexture()),
        side: THREE.DoubleSide,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        opacity: 0,
      })
    );
    const disk = new THREE.Mesh(track(radialRing(17, 52, 128)), diskMat);
    disk.rotation.x = Math.PI / 2 - 0.25;
    galaxyGroup.add(disk);

    const bhGlowMat = track(
      new THREE.SpriteMaterial({
        map: track(glowTexture('#FF8C42', false)),
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        opacity: 0,
      })
    );
    const bhGlow = new THREE.Sprite(bhGlowMat);
    bhGlow.scale.setScalar(120);
    galaxyGroup.add(bhGlow);

    const bhHit = new THREE.Mesh(
      track(new THREE.SphereGeometry(45, 8, 8)),
      track(new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }))
    );
    galaxyGroup.add(bhHit);

    const bhLabel = makeLabel('Sagittarius A*', 2.2, 'space-label space-label-deep');
    bhLabel.position.set(0, 80, 0);
    galaxyGroup.add(bhLabel);

    // Sun position marker — visible at galactic zoom ("you are here")
    const youAreHereMat = track(
      new THREE.SpriteMaterial({
        map: track(glowTexture('#00BFA5')),
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        opacity: 0,
      })
    );
    const youAreHere = new THREE.Sprite(youAreHereMat);
    youAreHere.scale.setScalar(46);
    scene.add(youAreHere); // sits at origin = the Sun

    // --- selection / focus ------------------------------------------------------------------------
    let panelObj: CSS3DObject | null = null;
    let panelHost: THREE.Group | null = null;
    let followEntity: PlanetEntity | null = null;
    // A deliberately-selected deep object stays lit regardless of zoom (the
    // ambient distance-fade is only for discovery). null = nothing forced.
    let focusedDeepId: string | null = null;

    const clearPanel = () => {
      if (panelObj && panelHost) {
        panelHost.remove(panelObj);
        panelObj.element.remove();
        const bi = billboards.indexOf(panelObj);
        if (bi >= 0) billboards.splice(bi, 1);
        panelObj = null;
        panelHost = null;
      }
    };

    const selectPlanet = (id: string | null) => {
      clearPanel();
      followEntity = null;
      focusedDeepId = null;
      if (!id) {
        pivotTarget.set(0, 0, 0);
        return;
      }
      const ent = entities.find((e) => e.planet.id === id);
      if (!ent) return;
      panelObj = new CSS3DObject(buildPanel(ent.planet));
      panelObj.position.set(ent.planet.radius + 10, ent.planet.radius + 2.5, 0);
      panelObj.scale.setScalar(0.05);
      ent.group.add(panelObj);
      billboards.push(panelObj);
      panelHost = ent.group;
      followEntity = ent;
      target.radius = Math.max(ent.planet.radius * 7, 6);
    };

    const focusPoint = (p: THREE.Vector3, radius: number) => {
      followEntity = null;
      focusedDeepId = null;
      pivotTarget.copy(p);
      target.radius = radius;
    };

    // Release any locked focus and return the camera toward the Sun, keeping
    // the current zoom so the user can keep scrolling outward.
    const releaseFocus = () => {
      clearPanel();
      followEntity = null;
      focusedDeepId = null;
      onPickRef.current(null);
      onDeepRef.current(null);
      pivotTarget.set(0, 0, 0);
    };

    const jumpTo = (j: JumpTarget) => {
      clearPanel();
      onDeepRef.current(null);
      onPickRef.current(null);
      focusedDeepId = null;
      if (j === 'earth') {
        const earth = entities.find((e) => e.planet.id === 'earth');
        if (earth) {
          followEntity = earth;
          target.radius = 8;
        }
      } else if (j === 'system') {
        focusPoint(new THREE.Vector3(0, 0, 0), 95);
      } else if (j === 'belt') {
        focusPoint(new THREE.Vector3(0, 0, 0), 240);
      } else {
        focusPoint(GC.clone(), 1500);
      }
    };

    apiRef.current = { selectPlanet, jumpTo, releaseFocus };

    // --- pointer input: drag-rotate with inertia, exponential wheel zoom -----------------------------
    let dragging = false;
    let movedPx = 0;
    let lastX = 0;
    let lastY = 0;
    let lastMoveT = 0;

    const onPointerDown = (e: PointerEvent) => {
      dragging = true;
      movedPx = 0;
      spinVel = 0;
      lastX = e.clientX;
      lastY = e.clientY;
      lastMoveT = performance.now();
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!dragging) return;
      const dx = e.clientX - lastX;
      const dy = e.clientY - lastY;
      const now = performance.now();
      const dt = Math.max(1, now - lastMoveT) / 1000;
      lastX = e.clientX;
      lastY = e.clientY;
      lastMoveT = now;
      movedPx += Math.abs(dx) + Math.abs(dy);
      target.theta -= dx * 0.005;
      target.phi = Math.min(Math.PI - 0.12, Math.max(0.12, target.phi - dy * 0.005));
      spinVel = (-dx * 0.005) / dt; // capture release velocity for inertia
    };

    const raycaster = new THREE.Raycaster();
    const ndc = new THREE.Vector2();

    const onPointerUp = (e: PointerEvent) => {
      const wasDrag = movedPx >= 6;
      dragging = false;
      if (wasDrag) return; // inertia continues from spinVel
      spinVel = 0;

      const rect = renderer.domElement.getBoundingClientRect();
      ndc.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      ndc.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(ndc, camera);

      const hitTargets: THREE.Object3D[] = [
        ...entities.map((en) => en.mesh),
        plutoMesh,
        sunHit,
        bhHit,
        ...deepEntities.map((d) => d.hit),
      ];
      const hits = raycaster.intersectObjects(hitTargets, false);

      if (hits.length === 0) {
        selectPlanet(null);
        onPickRef.current(null);
        onDeepRef.current(null);
        return;
      }
      const obj = hits[0].object;

      const planetEnt = entities.find((en) => en.mesh === obj);
      if (planetEnt) {
        onDeepRef.current(null);
        selectPlanet(planetEnt.planet.id);
        onPickRef.current(planetEnt.planet.id);
        return;
      }
      if (obj === plutoMesh) {
        clearPanel();
        onPickRef.current(null);
        onDeepRef.current('pluto');
        followEntity = null;
        const wp = new THREE.Vector3();
        plutoGroup.getWorldPosition(wp);
        focusPoint(wp, 7);
        return;
      }
      if (obj === sunHit) {
        clearPanel();
        onPickRef.current(null);
        onDeepRef.current('sun');
        focusPoint(new THREE.Vector3(0, 0, 0), 20);
        return;
      }
      if (obj === bhHit) {
        clearPanel();
        onPickRef.current(null);
        onDeepRef.current('sag-a');
        const wp = new THREE.Vector3();
        bhCore.getWorldPosition(wp);
        focusPoint(wp, 140); // frames the accretion disk; forced-visible below
        focusedDeepId = 'sag-a';
        return;
      }
      const deep = deepEntities.find((d) => d.hit === obj);
      if (deep) {
        clearPanel();
        onPickRef.current(null);
        onDeepRef.current(deep.data.id);
        // frame the sprite up close, then keep it lit regardless of zoom band
        focusPoint(deep.sprite.position.clone(), Math.max((deep.data.size ?? 18) * 3.2, 55));
        focusedDeepId = deep.data.id;
      }
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      // exponential zoom — consistent feel from planet surface to galaxy
      target.radius = Math.min(MAX_R, Math.max(MIN_R, target.radius * Math.exp(e.deltaY * 0.0011)));
    };

    const onPointerLeave = () => {
      dragging = false;
    };

    // Escape releases a locked focus and recentres on the Sun (without
    // leaving the view — App's global Esc is suppressed on /explorer).
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') releaseFocus();
    };

    const glEl = renderer.domElement;
    glEl.addEventListener('pointerdown', onPointerDown);
    glEl.addEventListener('pointermove', onPointerMove);
    glEl.addEventListener('pointerup', onPointerUp);
    glEl.addEventListener('pointerleave', onPointerLeave);
    glEl.addEventListener('wheel', onWheel, { passive: false });
    window.addEventListener('keydown', onKeyDown);

    const onResize = () => {
      width = container.clientWidth;
      height = container.clientHeight;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
      cssRenderer.setSize(width, height);
    };
    window.addEventListener('resize', onResize);

    // --- zone readout (direct DOM writes — no React re-render per frame) ---------------------------
    const zoneEl = zoneRef.current;
    const zoneFor = (r: number): string => {
      if (r < 45) return 'PLANETARY SPACE';
      if (r < 130) return 'INNER SYSTEM';
      if (r < 300) return 'KUIPER BELT';
      if (r < 700) return 'HELIOPAUSE';
      if (r < 1400) return 'INTERSTELLAR SPACE';
      return 'GALACTIC SCALE';
    };

    // --- animation loop -----------------------------------------------------------------------------------
    const clock = new THREE.Clock();
    const tmpQ = new THREE.Quaternion();
    let raf = 0;

    const animate = () => {
      raf = requestAnimationFrame(animate);
      const delta = Math.min(clock.getDelta(), 0.05);
      const t = performance.now();

      // inertia after drag release
      if (!dragging && Math.abs(spinVel) > 0.0001) {
        target.theta += spinVel * delta;
        spinVel *= Math.exp(-delta * 2.4);
      }

      // smooth-damped camera (the ARKit feel)
      const kAng = 1 - Math.exp(-delta * 9);
      const kRad = 1 - Math.exp(-delta * 5);
      current.theta += (target.theta - current.theta) * kAng;
      current.phi += (target.phi - current.phi) * kAng;
      current.radius += (target.radius - current.radius) * kRad;

      if (followEntity) pivotTarget.copy(followEntity.group.position);
      pivot.lerp(pivotTarget, 1 - Math.exp(-delta * 5));

      camera.position.set(
        pivot.x + current.radius * Math.sin(current.phi) * Math.sin(current.theta),
        pivot.y + current.radius * Math.cos(current.phi),
        pivot.z + current.radius * Math.sin(current.phi) * Math.cos(current.theta)
      );
      camera.lookAt(pivot);

      // orbital motion + spin
      sun.rotation.y += delta * 0.02;
      sun.scale.setScalar(1 + Math.sin(t * 0.0009) * 0.015);
      entities.forEach((ent) => {
        ent.angle += ent.planet.orbitSpeed * delta;
        ent.group.position.set(
          Math.cos(ent.angle) * ent.planet.orbitRadius,
          0,
          Math.sin(ent.angle) * ent.planet.orbitRadius
        );
        ent.mesh.rotation.y += delta * (SPIN[ent.planet.id] ?? 0.2);
        if (ent.clouds) ent.clouds.rotation.y += delta * 0.27;
        if (ent.moonOrbit) ent.moonOrbit.rotation.y += delta * 0.35;
      });
      plutoAngle += 0.004 * delta;
      plutoGroup.position.set(Math.cos(plutoAngle) * 96, 0, Math.sin(plutoAngle) * 96);
      plutoMesh.rotation.y += delta * 0.1;
      galaxyGroup.rotation.y += delta * 0.0035;
      disk.rotation.z += delta * 0.12;

      // --- scale-dependent fades; fully-faded layers are skipped by the renderer ---
      const r = current.radius;
      const orbitVis = 1 - smoothstep(450, 1000, r);
      orbitMats.forEach((m) => (m.opacity = 0.055 * orbitVis));
      kuiperMat.opacity = 0.55 * smoothstep(55, 130, r) * (1 - smoothstep(900, 1500, r));
      kuiperPoints.visible = kuiperMat.opacity > 0.004;
      const galaxyVis = smoothstep(420, 1100, r);
      const bhFocused = focusedDeepId === 'sag-a';
      galaxyGroup.visible = galaxyVis > 0.004 || bhFocused;
      galaxyMat.opacity = 0.85 * galaxyVis;
      // disk/glow/label stay lit when the black hole is the chosen target,
      // even though we zoom inside the galaxy-points fade band to frame it
      diskMat.opacity = Math.max(galaxyVis, bhFocused ? 0.95 : 0) * 0.9;
      bhGlowMat.opacity = Math.max(galaxyVis, bhFocused ? 1 : 0) * 0.55;
      youAreHereMat.opacity = galaxyVis * (0.5 + Math.sin(t * 0.003) * 0.3);
      youAreHere.visible = galaxyVis > 0.004;
      sunGlow.scale.setScalar(Math.max(26, r * 0.045));

      const deepVis = smoothstep(170, 380, r) * (1 - smoothstep(1300, 2000, r));
      const deepOn = deepVis > 0.004;
      deepEntities.forEach((d) => {
        const focused = d.data.id === focusedDeepId;
        const op = focused ? 1 : deepVis;
        (d.sprite.material as THREE.SpriteMaterial).opacity = op;
        d.sprite.visible = op > 0.004;
        d.hit.visible = deepOn || focused;
        d.labelEl.style.opacity = String(op);
      });
      const planetLabelVis = smoothstep(20, 42, r) * (1 - smoothstep(320, 520, r));
      planetLabels.forEach((el) => (el.style.opacity = String(planetLabelVis)));
      bhLabel.element.style.opacity = String(Math.max(galaxyVis, bhFocused ? 1 : 0));

      // zone readout
      if (zoneEl) {
        let scaleText: string;
        if (r < 700) {
          const au = r / 17;
          scaleText = `${au < 10 ? au.toFixed(1) : Math.round(au)} AU`;
        } else {
          const pct = (r - 700) / 1900;
          const ly = Math.round(4 + pct * pct * 100000);
          scaleText = `≈ ${ly.toLocaleString()} ly`;
        }
        zoneEl.textContent = `${zoneFor(r)} · ${scaleText}`;
      }

      // billboard all CSS3D objects (parent-aware: galaxy group rotates),
      // then render both layers
      billboards.forEach((obj) => {
        if (obj.parent) {
          obj.parent.getWorldQuaternion(tmpQ).invert();
          obj.quaternion.copy(tmpQ).multiply(camera.quaternion);
        } else {
          obj.quaternion.copy(camera.quaternion);
        }
      });
      renderer.render(scene, camera);
      cssRenderer.render(scene, camera);
    };
    animate();

    // stream procedural textures in after first paint, one per tick
    let texTimer = 0;
    const processTexQueue = () => {
      const task = texQueue.shift();
      if (!task) return;
      task();
      texTimer = window.setTimeout(processTexQueue, 24);
    };
    texTimer = window.setTimeout(processTexQueue, 150);

    // --- cleanup -------------------------------------------------------------------------------------
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(texTimer);
      window.removeEventListener('resize', onResize);
      glEl.removeEventListener('pointerdown', onPointerDown);
      glEl.removeEventListener('pointermove', onPointerMove);
      glEl.removeEventListener('pointerup', onPointerUp);
      glEl.removeEventListener('pointerleave', onPointerLeave);
      glEl.removeEventListener('wheel', onWheel);
      window.removeEventListener('keydown', onKeyDown);
      apiRef.current = null;
      disposables.forEach((d) => d.dispose());
      glEl.remove();
      cssEl.remove();
    };
  }, []);

  const handlePill = (id: string) => {
    const next = selected === id ? null : id;
    setSelected(next);
    setDeepObject(null);
    apiRef.current?.selectPlanet(next);
  };

  return (
    <div className="cosmos-explorer" ref={containerRef} aria-label="Interactive 3D universe explorer">
      {/* HUD — observatory readout + scale indicator */}
      <div className="cosmos-hud">
        <div className="hud-title">Sol Observatory</div>
        <div className="hud-hint">
          drag to rotate · scroll to zoom — all the way to the galaxy · Esc to release
        </div>
        <div className="hud-zone" ref={zoneRef} aria-live="off">
          INNER SYSTEM · 5 AU
        </div>
        <div className="hud-jumps" aria-label="Quick zoom levels">
          {(
            [
              ['earth', 'Earth'],
              ['system', 'System'],
              ['belt', 'Belt'],
              ['galaxy', 'Galaxy'],
            ] as Array<[JumpTarget, string]>
          ).map(([key, label]) => (
            <button key={key} className="jump-btn" onClick={() => apiRef.current?.jumpTo(key)}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Deep-space object panel (2D overlay — used beyond the planets) */}
      {deepObject && (
        <aside className="deep-panel" aria-label={`${deepObject.name} information`}>
          <div className="panel-scanline" />
          <button
            className="deep-close"
            onClick={() => {
              setDeepObject(null);
              apiRef.current?.releaseFocus();
            }}
            aria-label="Close panel"
          >
            ✕
          </button>
          <div className="panel-eye">Target acquired</div>
          <div className="panel-name">{deepObject.name}</div>
          <div className="panel-type">
            {deepObject.kind} · {deepObject.distance}
          </div>
          <div className="panel-grid">
            {deepObject.facts.map(([k, v]) => (
              <div key={k}>
                <div className="sk">{k}</div>
                <div className="sv">{v}</div>
              </div>
            ))}
          </div>
          <div className="panel-desc">{deepObject.description}</div>
        </aside>
      )}

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
