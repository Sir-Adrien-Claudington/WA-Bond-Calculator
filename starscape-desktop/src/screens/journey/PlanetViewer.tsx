// ---------------------------------------------------------------------------
// StarScape — interactive high-resolution planet viewer (Journey)
// ---------------------------------------------------------------------------
// Each Journey planet is a real Three.js sphere with a procedurally generated
// surface + bump map, fresnel atmosphere, cloud layer (Earth) and rings
// (Saturn/Uranus). The learner can drag to rotate, scroll to zoom, and click
// labelled hotspots to fly in on key topographic / atmospheric features.
//
// Detail streams in progressively: the surface loads at 2K, then upgrades to a
// genuine 4K (4096×2048) texture the moment you zoom in or focus a hotspot, so
// close-up topography stays crisp without paying 4K cost up-front. The whole
// scene is lazily created only when the planet scrolls near view and disposed
// when it leaves, so memory and GPU contexts stay bounded.
// ---------------------------------------------------------------------------

import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { createPlanetJob, createCloudJob, ringTexture, type TexJob } from '@utils/textures';
import { makeAtmosphere, radialRing, latLonToVec3 } from '@utils/planetMesh';
import { PLANET_DETAIL, type Hotspot } from '@data/planetDetail';
import type { Planet } from '@data/planets';

const SPIN: Record<string, number> = {
  mercury: 0.05, venus: -0.03, earth: 0.12, mars: 0.11,
  jupiter: 0.18, saturn: 0.16, uranus: 0.13, neptune: 0.12,
};

interface PlanetViewerProps {
  planet: Planet;
}

export function PlanetViewer({ planet }: PlanetViewerProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const hotspotRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
  const focusApi = useRef<{ focus: (hs: Hotspot) => void; reset: () => void } | null>(null);
  const [active, setActive] = useState<Hotspot | null>(null);
  const [zoomed, setZoomed] = useState(false);
  const [ready, setReady] = useState(false);

  // imperative control channel shared between React handlers and the rAF loop
  const ctrl = useRef({
    focusQ: null as THREE.Quaternion | null, // target orientation when focusing
    targetDist: 3.0, // in planet-radii
    wantHiRes: false,
    dragging: false,
    idle: 0, // seconds since last interaction
  });

  const detail = PLANET_DETAIL[planet.id];

  // Lazily activate when the planet scrolls near the viewport; deactivate when
  // it leaves so we tear the scene down.
  useEffect(() => {
    const el = mountRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => setReady(e.isIntersecting),
      { rootMargin: '120px', threshold: 0.08 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!ready) return;
    const mount = mountRef.current;
    if (!mount) return;

    let width = mount.clientWidth;
    let height = mount.clientHeight;
    const R = 1.4; // on-screen sphere radius (scene units)
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 100);
    const baseDist = R * 3.0;
    ctrl.current.targetDist = 3.0;
    let dist = baseDist;
    camera.position.set(0, 0, dist);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    mount.appendChild(renderer.domElement);

    // lighting — key light from upper right, soft fill
    const key = new THREE.DirectionalLight(0xffffff, 2.4);
    key.position.set(3, 1.5, 2.5);
    scene.add(key);
    scene.add(new THREE.AmbientLight(0x334455, 0.55));

    // groups: orient (user/idle/focus rotation) > tilt (fixed axial tilt)
    const orient = new THREE.Group();
    const tiltGroup = new THREE.Group();
    tiltGroup.rotation.z = detail.tilt;
    orient.add(tiltGroup);
    scene.add(orient);

    const rocky = planet.type === 'Terrestrial';
    const surfMat = new THREE.MeshStandardMaterial({
      color: planet.color, roughness: 0.85, metalness: 0.02,
    });
    const sphere = new THREE.Mesh(new THREE.SphereGeometry(R, 128, 128), surfMat);
    tiltGroup.add(sphere);

    // start at 2K; track jobs so we can drive + dispose them
    const jobs: TexJob[] = [];
    const tex2k = createPlanetJob(planet.id, planet.color, 2048, 1024, rocky);
    surfMat.map = tex2k.map;
    surfMat.bumpMap = tex2k.bump;
    surfMat.bumpScale = rocky ? 0.05 : 0.02;
    surfMat.color.set(0xffffff);
    surfMat.needsUpdate = true;
    jobs.push(tex2k);
    let tex4k: TexJob | null = null;
    let hiResActive = false;

    // clouds (Earth)
    let clouds: THREE.Mesh | null = null;
    if (detail.clouds) {
      const cloudJob = createCloudJob(2048, 1024);
      const cloudMat = new THREE.MeshStandardMaterial({
        map: cloudJob.map, transparent: true, depthWrite: false, roughness: 1,
      });
      cloudMat.needsUpdate = true;
      jobs.push(cloudJob);
      clouds = new THREE.Mesh(new THREE.SphereGeometry(R * 1.012, 96, 96), cloudMat);
      tiltGroup.add(clouds);
    }

    // atmosphere
    if (detail.atmosphere) {
      tiltGroup.add(makeAtmosphere(R * 1.04, detail.atmosphere.color, detail.atmosphere.intensity));
    }

    // rings
    if (detail.ring) {
      const ring = new THREE.Mesh(
        radialRing(R * (detail.ring === 'saturn' ? 1.45 : 1.5), R * (detail.ring === 'saturn' ? 2.5 : 2.1)),
        new THREE.MeshBasicMaterial({
          map: ringTexture(detail.ring), side: THREE.DoubleSide,
          transparent: true, depthWrite: false,
        })
      );
      ring.rotation.x = Math.PI / 2;
      tiltGroup.add(ring);
    }

    // hotspot anchor objects in the geographic (sphere) frame
    const anchors = detail.hotspots.map((hs) => {
      const o = new THREE.Object3D();
      o.position.copy(latLonToVec3(hs.lat, hs.lon, R));
      tiltGroup.add(o);
      return { hs, obj: o };
    });

    // --- interaction --------------------------------------------------------
    let lastX = 0, lastY = 0;
    const yAxis = new THREE.Vector3(0, 1, 0);
    const xAxis = new THREE.Vector3(1, 0, 0);
    const qd = new THREE.Quaternion();

    const onDown = (e: PointerEvent) => {
      ctrl.current.dragging = true;
      ctrl.current.idle = 0;
      ctrl.current.focusQ = null;
      lastX = e.clientX; lastY = e.clientY;
      (e.target as Element).setPointerCapture?.(e.pointerId);
    };
    const onMove = (e: PointerEvent) => {
      if (!ctrl.current.dragging) return;
      const dx = e.clientX - lastX, dy = e.clientY - lastY;
      lastX = e.clientX; lastY = e.clientY;
      qd.setFromAxisAngle(yAxis, dx * 0.006);
      orient.quaternion.premultiply(qd);
      qd.setFromAxisAngle(xAxis, dy * 0.006);
      orient.quaternion.premultiply(qd);
      ctrl.current.idle = 0;
    };
    const onUp = () => { ctrl.current.dragging = false; };
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      ctrl.current.targetDist = Math.min(4.0, Math.max(1.45, ctrl.current.targetDist * Math.exp(e.deltaY * 0.0012)));
      ctrl.current.idle = 0;
    };
    const cvs = renderer.domElement;
    cvs.style.touchAction = 'none';
    cvs.addEventListener('pointerdown', onDown);
    cvs.addEventListener('pointermove', onMove);
    cvs.addEventListener('pointerup', onUp);
    cvs.addEventListener('pointerleave', onUp);
    cvs.addEventListener('wheel', onWheel, { passive: false });

    // expose focus to React click handlers
    focusApi.current = {
      focus(hs: Hotspot) {
        const anchor = anchors.find((a) => a.hs.id === hs.id);
        if (!anchor) return;
        // rotate `orient` so this anchor's world direction points to +Z (camera)
        const dir = anchor.obj.position.clone().applyQuaternion(tiltGroup.quaternion).normalize();
        ctrl.current.focusQ = new THREE.Quaternion().setFromUnitVectors(dir, new THREE.Vector3(0, 0, 1));
        ctrl.current.targetDist = 1.75;
        ctrl.current.wantHiRes = true;
        ctrl.current.idle = 0;
      },
      reset() {
        ctrl.current.focusQ = null;
        ctrl.current.targetDist = 3.0;
        ctrl.current.idle = 0;
      },
    };

    // --- resize -------------------------------------------------------------
    const onResize = () => {
      width = mount.clientWidth; height = mount.clientHeight;
      camera.aspect = width / height; camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };
    const ro = new ResizeObserver(onResize);
    ro.observe(mount);

    // --- loop ---------------------------------------------------------------
    const clock = new THREE.Clock();
    const tmp = new THREE.Vector3();
    let raf = 0;

    const swapHiRes = () => {
      if (!tex4k) return;
      surfMat.map = tex4k.map;
      surfMat.bumpMap = tex4k.bump;
      surfMat.needsUpdate = true;
      hiResActive = true;
    };

    const animate = () => {
      raf = requestAnimationFrame(animate);
      const dt = Math.min(clock.getDelta(), 0.05);
      const c = ctrl.current;
      c.idle += dt;

      // stream textures (time-sliced); when the 4K job finishes, swap it in
      if (jobs.length) {
        const done = jobs[0].run(3);
        if (done) {
          const finished = jobs.shift()!;
          if (tex4k && finished === tex4k) swapHiRes();
        }
      }

      // on-demand 4K upgrade / downgrade
      const wantHi = c.wantHiRes || c.targetDist < 2.15;
      if (wantHi && !tex4k && !hiResActive) {
        tex4k = createPlanetJob(planet.id, planet.color, 4096, 2048, rocky);
        jobs.push(tex4k);
      } else if (!wantHi && hiResActive && c.targetDist > 2.5) {
        // downgrade to free memory
        surfMat.map = tex2k.map;
        surfMat.bumpMap = tex2k.bump;
        surfMat.needsUpdate = true;
        hiResActive = false;
        if (tex4k) {
          tex4k.map.dispose();
          tex4k.bump?.dispose();
          const i = jobs.indexOf(tex4k);
          if (i >= 0) jobs.splice(i, 1);
          tex4k = null;
        }
      }

      // orientation: focus slerp, else idle auto-rotate
      if (c.focusQ) {
        orient.quaternion.slerp(c.focusQ, 1 - Math.exp(-dt * 6));
      } else if (!c.dragging && !reduceMotion && c.idle > 1.2) {
        qd.setFromAxisAngle(yAxis, (SPIN[planet.id] ?? 0.1) * dt);
        orient.quaternion.premultiply(qd);
      }
      // cloud drift
      if (clouds) clouds.rotation.y += dt * 0.04;

      // camera zoom (smooth)
      dist += (R * c.targetDist - dist) * (1 - Math.exp(-dt * 6));
      camera.position.set(0, 0, dist);
      camera.lookAt(0, 0, 0);

      // project hotspots to screen, update the overlay buttons
      anchors.forEach(({ hs, obj }) => {
        const btn = hotspotRefs.current.get(hs.id);
        if (!btn) return;
        obj.getWorldPosition(tmp);
        const normal = tmp.clone().normalize();
        const toCam = camera.position.clone().sub(tmp).normalize();
        const facing = normal.dot(toCam) > 0.12;
        tmp.project(camera);
        const x = (tmp.x * 0.5 + 0.5) * width;
        const y = (-tmp.y * 0.5 + 0.5) * height;
        btn.style.transform = `translate(${x}px, ${y}px) translate(-50%, -50%)`;
        btn.style.opacity = facing ? '1' : '0';
        btn.style.pointerEvents = facing ? 'auto' : 'none';
      });

      renderer.render(scene, camera);
    };
    animate();

    // --- teardown -----------------------------------------------------------
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      cvs.removeEventListener('pointerdown', onDown);
      cvs.removeEventListener('pointermove', onMove);
      cvs.removeEventListener('pointerup', onUp);
      cvs.removeEventListener('pointerleave', onUp);
      cvs.removeEventListener('wheel', onWheel);
      focusApi.current = null;
      scene.traverse((o) => {
        if (o instanceof THREE.Mesh) {
          o.geometry.dispose();
          const m = o.material;
          if (Array.isArray(m)) m.forEach((mm) => mm.dispose());
          else m.dispose();
        }
      });
      tex2k.map.dispose(); tex2k.bump?.dispose();
      tex4k?.map.dispose(); tex4k?.bump?.dispose();
      renderer.dispose();
      if (cvs.parentNode) cvs.parentNode.removeChild(cvs);
    };
  }, [ready, planet, detail]);

  const clickHotspot = (hs: Hotspot) => {
    setActive(hs);
    setZoomed(true);
    focusApi.current?.focus(hs);
  };
  const resetView = () => {
    setActive(null);
    setZoomed(false);
    focusApi.current?.reset();
  };

  return (
    <div className="planet-viewer">
      <div className="planet-canvas" ref={mountRef} aria-label={`Interactive 3D model of ${planet.name}`}>
        {detail.hotspots.map((hs) => (
          <button
            key={hs.id}
            ref={(el) => {
              if (el) hotspotRefs.current.set(hs.id, el);
              else hotspotRefs.current.delete(hs.id);
            }}
            className={`hotspot hotspot-${hs.kind}${active?.id === hs.id ? ' hotspot-active' : ''}`}
            onClick={() => clickHotspot(hs)}
            title={hs.title}
            aria-label={hs.title}
          >
            <span className="hotspot-dot" />
          </button>
        ))}
      </div>

      <div className="planet-hint" aria-hidden="true">drag to rotate · scroll to zoom · tap a point</div>

      {active && (
        <div className={`detail-card detail-${active.kind}`} role="status">
          <div className="detail-kind">{active.kind === 'topographic' ? 'Topography' : 'Atmosphere'}</div>
          <div className="detail-title">{active.title}</div>
          <p className="detail-text">{active.text}</p>
        </div>
      )}

      {zoomed && (
        <button className="planet-reset" onClick={resetView}>↺ Reset view</button>
      )}
    </div>
  );
}
