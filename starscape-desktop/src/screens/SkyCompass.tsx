// ---------------------------------------------------------------------------
// StarScape — Sky Compass (point-at-the-sky AR mode)
// ---------------------------------------------------------------------------
// Shows the real sky for the user's location and the current time: the 187
// bright Hipparcos stars, constellation stick-figures, and the planets / Moon /
// Sun — each placed at its true altitude/azimuth (via astronomy-engine). On a
// phone the camera is driven by the device's orientation + compass, so pointing
// the phone at part of the sky shows exactly what is there, with a reticle and
// a readout naming what you are pointed at. On desktop (or with no motion
// sensor) you drag to look around instead.
//
// Heading from the magnetometer can't be verified from a dev machine, so a
// horizontal drag always re-calibrates the compass alignment as a safety net.
// ---------------------------------------------------------------------------

import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { Observer, Equator, Horizon, Body } from 'astronomy-engine';
import { getStars, bvToRgb } from '@api/hipparcos';
import { CONSTELLATIONS } from '@data/constellations';
import { roundPointTexture, glowTexture } from '@utils/textures';
import '../styles/sky.css';

const DEG = Math.PI / 180;
const R = 100; // celestial sphere radius (scene units)
const COMPASS16 = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];

const PLANETS: Array<{ name: string; body: Body; color: string }> = [
  { name: 'Sun', body: Body.Sun, color: '#ffd34d' },
  { name: 'Moon', body: Body.Moon, color: '#e8e6df' },
  { name: 'Mercury', body: Body.Mercury, color: '#b8b0a4' },
  { name: 'Venus', body: Body.Venus, color: '#f3e7c0' },
  { name: 'Mars', body: Body.Mars, color: '#e07a4a' },
  { name: 'Jupiter', body: Body.Jupiter, color: '#e3c89a' },
  { name: 'Saturn', body: Body.Saturn, color: '#e4d191' },
];

// altitude/azimuth (degrees) -> ENU direction with Y up, North = -Z, East = +X
function altAzToVec3(altDeg: number, azDeg: number, radius: number): THREE.Vector3 {
  const alt = altDeg * DEG;
  const az = azDeg * DEG;
  const ca = Math.cos(alt);
  return new THREE.Vector3(ca * Math.sin(az) * radius, Math.sin(alt) * radius, -ca * Math.cos(az) * radius);
}

// DeviceOrientation (alpha,beta,gamma + screen) -> camera quaternion
const _zee = new THREE.Vector3(0, 0, 1);
const _q1 = new THREE.Quaternion(-Math.sqrt(0.5), 0, 0, Math.sqrt(0.5)); // look out the back of the device
const _q0 = new THREE.Quaternion();
const _euler = new THREE.Euler();
function deviceQuaternion(out: THREE.Quaternion, aDeg: number, bDeg: number, gDeg: number, screenDeg: number) {
  _euler.set(bDeg * DEG, aDeg * DEG, -gDeg * DEG, 'YXZ');
  out.setFromEuler(_euler);
  out.multiply(_q1);
  out.multiply(_q0.setFromAxisAngle(_zee, -screenDeg * DEG));
}

type Phase = 'intro' | 'live';

export function SkyCompass() {
  const mountRef = useRef<HTMLDivElement>(null);
  const readoutRef = useRef<HTMLDivElement>(null);
  const [phase, setPhase] = useState<Phase>('intro');
  const [mode, setMode] = useState<'sensor' | 'drag'>('drag');
  const [note, setNote] = useState<string>('');
  const obsRef = useRef<{ lat: number; lon: number } | null>(null);

  const start = async () => {
    // iOS 13+ requires a user-gesture permission request for motion sensors
    let sensor = false;
    const DOE = window.DeviceOrientationEvent as unknown as {
      requestPermission?: () => Promise<string>;
    };
    if (DOE && typeof DOE.requestPermission === 'function') {
      try {
        sensor = (await DOE.requestPermission()) === 'granted';
      } catch {
        sensor = false;
      }
    } else if ('ondeviceorientationabsolute' in window || 'ondeviceorientation' in window) {
      sensor = true;
    }
    setMode(sensor ? 'sensor' : 'drag');

    // location
    await new Promise<void>((resolve) => {
      if (!navigator.geolocation) {
        obsRef.current = { lat: 35, lon: 0 };
        setNote('Location unavailable — showing an approximate sky.');
        resolve();
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (p) => {
          obsRef.current = { lat: p.coords.latitude, lon: p.coords.longitude };
          resolve();
        },
        () => {
          obsRef.current = { lat: 35, lon: 0 };
          setNote('Location blocked — showing an approximate sky. Allow location for an accurate view.');
          resolve();
        },
        { enableHighAccuracy: false, timeout: 8000 }
      );
    });

    if (!sensor) setNote((n) => n || 'No motion sensor — drag to look around the sky.');
    setPhase('live');
  };

  useEffect(() => {
    if (phase !== 'live') return;
    const mount = mountRef.current;
    const obs = obsRef.current;
    if (!mount || !obs) return;

    let width = mount.clientWidth;
    let height = mount.clientHeight;
    const observer = new Observer(obs.lat, obs.lon, 0);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(72, width / height, 0.1, 500);
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x05060d, 1);
    mount.appendChild(renderer.domElement);

    const sky = new THREE.Group(); // rotated by headingOffset to align compass
    scene.add(sky);

    // --- stars ---------------------------------------------------------------
    const starsResult = getStars();
    const stars = starsResult.ok ? starsResult.data : [];
    const starN = stars.length;
    const starPos = new Float32Array(starN * 3);
    const starCol = new Float32Array(starN * 3);
    const starSize = new Float32Array(starN);
    stars.forEach((s, i) => {
      const [r, g, b] = bvToRgb(s.bv ?? 0.4);
      starCol.set([r, g, b], i * 3);
      starSize[i] = 2.2 + Math.max(0, 4 - s.vmag) * 1.7;
    });
    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
    starGeo.setAttribute('aColor', new THREE.BufferAttribute(starCol, 3));
    starGeo.setAttribute('aSize', new THREE.BufferAttribute(starSize, 1));
    const starTex = roundPointTexture();
    const starMat = new THREE.ShaderMaterial({
      uniforms: { uTex: { value: starTex } },
      vertexShader: `
        attribute float aSize; attribute vec3 aColor; varying vec3 vColor;
        void main(){ vColor=aColor; vec4 mv=modelViewMatrix*vec4(position,1.0);
          gl_PointSize=aSize; gl_Position=projectionMatrix*mv; }`,
      fragmentShader: `
        uniform sampler2D uTex; varying vec3 vColor;
        void main(){ vec4 t=texture2D(uTex, gl_PointCoord); if(t.a<0.1) discard;
          gl_FragColor=vec4(vColor, t.a); }`,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    sky.add(new THREE.Points(starGeo, starMat));

    // --- constellation lines -------------------------------------------------
    let segCount = 0;
    CONSTELLATIONS.forEach((c) => (segCount += c.lines.length));
    const linePos = new Float32Array(segCount * 2 * 3);
    const lineGeo = new THREE.BufferGeometry();
    lineGeo.setAttribute('position', new THREE.BufferAttribute(linePos, 3));
    const lineMat = new THREE.LineBasicMaterial({ color: 0x3a6ea5, transparent: true, opacity: 0.55 });
    sky.add(new THREE.LineSegments(lineGeo, lineMat));

    // --- horizon ring + ground ----------------------------------------------
    const ringPts: THREE.Vector3[] = [];
    for (let a = 0; a <= 360; a += 4) ringPts.push(altAzToVec3(0, a, R));
    const ring = new THREE.LineLoop(
      new THREE.BufferGeometry().setFromPoints(ringPts),
      new THREE.LineBasicMaterial({ color: 0x2a8f7a, transparent: true, opacity: 0.5 })
    );
    sky.add(ring);
    const ground = new THREE.Mesh(
      new THREE.CircleGeometry(R * 0.999, 64),
      new THREE.MeshBasicMaterial({ color: 0x0a0e08, transparent: true, opacity: 0.55, side: THREE.DoubleSide })
    );
    ground.rotation.x = Math.PI / 2;
    ground.position.y = -0.5;
    sky.add(ground);

    // --- planets (sprites) ---------------------------------------------------
    const planetGlow = glowTexture('#ffffff');
    interface SkyMarker {
      name: string;
      obj: THREE.Object3D;
      el: HTMLDivElement;
      kind: 'planet' | 'const' | 'star';
    }
    const markers: SkyMarker[] = [];

    const makeLabel = (text: string, cls: string): HTMLDivElement => {
      const el = document.createElement('div');
      el.className = `sky-label ${cls}`;
      el.textContent = text;
      mount.appendChild(el);
      return el;
    };

    const planetSprites: Array<{ name: string; body: Body; color: string; sprite: THREE.Sprite; anchor: THREE.Object3D }> =
      PLANETS.map((p) => {
        const sprite = new THREE.Sprite(
          new THREE.SpriteMaterial({
            map: planetGlow,
            color: new THREE.Color(p.color),
            transparent: true,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
          })
        );
        sprite.scale.setScalar(p.name === 'Sun' || p.name === 'Moon' ? 9 : 5);
        sky.add(sprite);
        const anchor = new THREE.Object3D();
        sky.add(anchor);
        const el = makeLabel(p.name, 'sky-planet');
        markers.push({ name: p.name, obj: anchor, el, kind: 'planet' });
        return { ...p, sprite, anchor };
      });

    // constellation name labels (+ a few named bright stars)
    const constAnchors = CONSTELLATIONS.map((c) => {
      const anchor = new THREE.Object3D();
      sky.add(anchor);
      const el = makeLabel(c.name, 'sky-const');
      markers.push({ name: c.name, obj: anchor, el, kind: 'const' });
      return { c, anchor };
    });
    const namedStars = stars
      .filter((s) => s.commonName && s.vmag < 1.6)
      .map((s) => {
        const anchor = new THREE.Object3D();
        sky.add(anchor);
        const el = makeLabel(s.commonName!, 'sky-star');
        markers.push({ name: s.commonName!, obj: anchor, el, kind: 'star' });
        return { s, anchor };
      });

    // cardinal markers (fixed on horizon — added to sky so they rotate with it)
    const cardinals = [
      { t: 'N', az: 0 }, { t: 'E', az: 90 }, { t: 'S', az: 180 }, { t: 'W', az: 270 },
    ].map(({ t, az }) => {
      const anchor = new THREE.Object3D();
      anchor.position.copy(altAzToVec3(2, az, R));
      sky.add(anchor);
      const el = makeLabel(t, 'sky-cardinal');
      return { anchor, el };
    });

    // --- compute / refresh positions ----------------------------------------
    const computeSky = () => {
      const now = new Date();
      // stars
      stars.forEach((s, i) => {
        try {
          const h = Horizon(now, observer, s.raDeg / 15, s.decDeg, 'normal');
          const v = altAzToVec3(h.altitude, h.azimuth, R);
          starPos.set([v.x, v.y, v.z], i * 3);
        } catch {
          starPos.set([0, -R, 0], i * 3);
        }
      });
      starGeo.attributes.position.needsUpdate = true;

      // constellation lines + label anchors
      let o = 0;
      constAnchors.forEach(({ c, anchor }) => {
        const pts = c.stars.map(([ra, dec]) => {
          const h = Horizon(now, observer, ra / 15, dec, 'normal');
          return altAzToVec3(h.altitude, h.azimuth, R);
        });
        c.lines.forEach(([a, b]) => {
          linePos.set([pts[a].x, pts[a].y, pts[a].z], o); o += 3;
          linePos.set([pts[b].x, pts[b].y, pts[b].z], o); o += 3;
        });
        const ch = Horizon(now, observer, c.center[0] / 15, c.center[1], 'normal');
        anchor.position.copy(altAzToVec3(ch.altitude, ch.azimuth, R * 0.98));
      });
      lineGeo.attributes.position.needsUpdate = true;

      namedStars.forEach(({ s, anchor }) => {
        const h = Horizon(now, observer, s.raDeg / 15, s.decDeg, 'normal');
        anchor.position.copy(altAzToVec3(h.altitude, h.azimuth, R * 0.98));
      });

      // planets / sun / moon
      planetSprites.forEach((p) => {
        try {
          const eq = Equator(p.body, now, observer, true, true);
          const h = Horizon(now, observer, eq.ra, eq.dec, 'normal');
          const v = altAzToVec3(h.altitude, h.azimuth, R * 0.97);
          p.sprite.position.copy(v);
          p.anchor.position.copy(v);
          p.sprite.visible = true;
        } catch {
          p.sprite.visible = false;
        }
      });
    };
    computeSky();
    const refresh = window.setInterval(computeSky, 30_000);

    // --- orientation / interaction ------------------------------------------
    let headingOffset = 0; // sky yaw alignment (compass)
    let seededHeading = false;
    const orient = { alpha: 0, beta: 90, gamma: 0, have: false };
    let compassHeading: number | null = null;

    const onOrient = (e: DeviceOrientationEvent) => {
      if (e.alpha == null) return;
      orient.alpha = e.alpha;
      orient.beta = e.beta ?? 90;
      orient.gamma = e.gamma ?? 0;
      orient.have = true;
      const wch = (e as unknown as { webkitCompassHeading?: number }).webkitCompassHeading;
      if (typeof wch === 'number') compassHeading = wch; // iOS true heading
      else if ((e as unknown as { absolute?: boolean }).absolute) compassHeading = 360 - e.alpha; // Android absolute
    };
    if (mode === 'sensor') {
      window.addEventListener('deviceorientationabsolute', onOrient as EventListener, true);
      window.addEventListener('deviceorientation', onOrient as EventListener, true);
    }

    // drag: desktop look (drag mode) or compass calibration (sensor mode)
    let dragging = false, lastX = 0, lastY = 0;
    const look = { yaw: 0, pitch: 0 };
    const onDown = (e: PointerEvent) => { dragging = true; lastX = e.clientX; lastY = e.clientY; };
    const onMove = (e: PointerEvent) => {
      if (!dragging) return;
      const dx = e.clientX - lastX, dy = e.clientY - lastY;
      lastX = e.clientX; lastY = e.clientY;
      if (mode === 'sensor') {
        headingOffset += dx * 0.004; // re-calibrate compass
      } else {
        look.yaw -= dx * 0.004;
        look.pitch = Math.max(-1.4, Math.min(1.4, look.pitch - dy * 0.004));
      }
    };
    const onUp = () => { dragging = false; };
    const cvs = renderer.domElement;
    cvs.style.touchAction = 'none';
    cvs.addEventListener('pointerdown', onDown);
    cvs.addEventListener('pointermove', onMove);
    cvs.addEventListener('pointerup', onUp);
    cvs.addEventListener('pointerleave', onUp);

    const onResize = () => {
      width = mount.clientWidth; height = mount.clientHeight;
      camera.aspect = width / height; camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };
    const ro = new ResizeObserver(onResize);
    ro.observe(mount);

    const screenAngle = () =>
      (window.screen?.orientation?.angle ?? (window as unknown as { orientation?: number }).orientation ?? 0) as number;

    // --- loop ----------------------------------------------------------------
    const dir = new THREE.Vector3();
    const tmp = new THREE.Vector3();
    const camQ = new THREE.Quaternion();
    const screenP = new THREE.Vector3();
    let raf = 0;
    const animate = () => {
      raf = requestAnimationFrame(animate);

      if (mode === 'sensor' && orient.have) {
        deviceQuaternion(camQ, orient.alpha, orient.beta, orient.gamma, screenAngle());
        camera.quaternion.copy(camQ);
        if (compassHeading != null && !seededHeading) {
          // align the sky so the device's compass heading matches its azimuth
          camera.getWorldDirection(dir);
          const camAz = (Math.atan2(dir.x, -dir.z) / DEG + 360) % 360;
          headingOffset = ((compassHeading - camAz) * DEG);
          seededHeading = true;
        }
      } else {
        camera.quaternion.setFromEuler(new THREE.Euler(look.pitch, look.yaw, 0, 'YXZ'));
      }
      sky.rotation.y = headingOffset;

      // labels: project anchors to screen, hide if behind / below horizon edge
      camera.getWorldDirection(dir);
      const allLabels = [...markers, ...cardinals.map((c) => ({ name: '', obj: c.anchor, el: c.el, kind: 'star' as const }))];
      allLabels.forEach((m) => {
        m.obj.getWorldPosition(tmp);
        const toObj = tmp.clone().normalize();
        if (toObj.dot(dir) < 0.2) { m.el.style.opacity = '0'; m.el.style.pointerEvents = 'none'; return; }
        screenP.copy(tmp).project(camera);
        if (screenP.z > 1) { m.el.style.opacity = '0'; return; }
        const x = (screenP.x * 0.5 + 0.5) * width;
        const y = (-screenP.y * 0.5 + 0.5) * height;
        m.el.style.transform = `translate(${x}px, ${y}px) translate(-50%, -50%)`;
        m.el.style.opacity = '1';
      });

      // centre readout
      camera.getWorldDirection(dir);
      const altLook = Math.asin(Math.max(-1, Math.min(1, dir.y))) / DEG;
      const azLook = (Math.atan2(dir.x, -dir.z) / DEG + 360) % 360;
      let best: string | null = null, bestDot = Math.cos(11 * DEG);
      for (const m of markers) {
        if (m.kind === 'planet' && !planetSprites.find((p) => p.name === m.name)?.sprite.visible) continue;
        m.obj.getWorldPosition(tmp);
        const d = tmp.normalize().dot(dir);
        if (d > bestDot) { bestDot = d; best = m.name; }
      }
      if (readoutRef.current) {
        const comp = COMPASS16[Math.round(azLook / 22.5) % 16];
        readoutRef.current.textContent = `${best ?? '—'}  ·  ${comp} ${Math.round(azLook)}°  ·  alt ${Math.round(altLook)}°`;
      }

      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(raf);
      clearInterval(refresh);
      ro.disconnect();
      window.removeEventListener('deviceorientationabsolute', onOrient as EventListener, true);
      window.removeEventListener('deviceorientation', onOrient as EventListener, true);
      cvs.removeEventListener('pointerdown', onDown);
      cvs.removeEventListener('pointermove', onMove);
      cvs.removeEventListener('pointerup', onUp);
      cvs.removeEventListener('pointerleave', onUp);
      markers.forEach((m) => m.el.remove());
      cardinals.forEach((c) => c.el.remove());
      starGeo.dispose(); lineGeo.dispose(); starTex.dispose(); starMat.dispose();
      planetGlow.dispose();
      scene.traverse((o) => {
        if (o instanceof THREE.Mesh || o instanceof THREE.Sprite) {
          (o as THREE.Mesh).geometry?.dispose?.();
          const mt = (o as THREE.Mesh).material;
          if (Array.isArray(mt)) mt.forEach((x) => x.dispose());
          else mt?.dispose();
        }
      });
      renderer.dispose();
      cvs.remove();
    };
  }, [phase, mode]);

  return (
    <div className="sky-root">
      <div className="sky-stage" ref={mountRef} aria-label="Live sky compass" />

      {phase === 'live' && (
        <>
          <div className="sky-reticle" aria-hidden="true">
            <div className="sky-reticle-ring" />
            <div className="sky-reticle-dot" />
          </div>
          <div className="sky-readout" ref={readoutRef} aria-live="polite">—</div>
          <div className="sky-hint" aria-hidden="true">
            {mode === 'sensor'
              ? 'Point your phone at the sky · drag to align the compass'
              : 'Drag to look around the sky'}
          </div>
          {note && <div className="sky-note">{note}</div>}
        </>
      )}

      {phase === 'intro' && (
        <div className="sky-intro">
          <div className="sky-intro-card">
            <div className="sky-intro-icon" aria-hidden="true">🧭</div>
            <h1>Sky Compass</h1>
            <p>
              Point your phone at the sky to see which stars, planets and constellations you’re looking
              at — calculated live for your location and the current time.
            </p>
            <button className="sky-start" onClick={start}>Start</button>
            <p className="sky-intro-fine">
              Needs location and (on phones) motion-sensor access. On a computer you can drag to explore.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
