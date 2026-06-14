// ---------------------------------------------------------------------------
// StarScape — Sky Compass (point-at-the-sky AR mode)
// ---------------------------------------------------------------------------
// Shows the real sky for the user's location and the current time: the 187
// bright Hipparcos stars (glowing + twinkling), constellation stick-figures,
// and the planets / Moon / Sun — each at its true altitude/azimuth (via
// astronomy-engine). On a phone the camera follows the device orientation, and
// the absolute heading is taken continuously from the magnetometer (the same
// source as the iPhone Compass app — `webkitCompassHeading` on iOS, absolute
// orientation on Android) so it stays aligned to true north as you turn.
// Desktop / no sensor falls back to drag-to-look. A reticle + readout name what
// you're pointed at, with compass heading + altitude. Horizontal drag nudges
// the alignment as a fine-calibration safety net.
// ---------------------------------------------------------------------------

import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { Observer, Equator, Horizon, Body } from 'astronomy-engine';
import { getStars, bvToRgb } from '@api/hipparcos';
import { CONSTELLATIONS } from '@data/constellations';
import { roundPointTexture, glowTexture } from '@utils/textures';
import '../styles/sky.css';

const DEG = Math.PI / 180;
const R = 100;
const COMPASS16 = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];

const PLANETS: Array<{ name: string; body: Body; color: string; big?: boolean }> = [
  { name: 'Sun', body: Body.Sun, color: '#ffd34d', big: true },
  { name: 'Moon', body: Body.Moon, color: '#e8e6df', big: true },
  { name: 'Mercury', body: Body.Mercury, color: '#b8b0a4' },
  { name: 'Venus', body: Body.Venus, color: '#f6ead0' },
  { name: 'Mars', body: Body.Mars, color: '#e07a4a' },
  { name: 'Jupiter', body: Body.Jupiter, color: '#e3c89a' },
  { name: 'Saturn', body: Body.Saturn, color: '#e4d191' },
];

function altAzToVec3(altDeg: number, azDeg: number, radius: number): THREE.Vector3 {
  const alt = altDeg * DEG, az = azDeg * DEG, ca = Math.cos(alt);
  return new THREE.Vector3(ca * Math.sin(az) * radius, Math.sin(alt) * radius, -ca * Math.cos(az) * radius);
}

const _zee = new THREE.Vector3(0, 0, 1);
const _q1 = new THREE.Quaternion(-Math.sqrt(0.5), 0, 0, Math.sqrt(0.5));
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
  const [note, setNote] = useState('');
  const obsRef = useRef<{ lat: number; lon: number } | null>(null);

  const start = async () => {
    let sensor = false;
    const DOE = window.DeviceOrientationEvent as unknown as { requestPermission?: () => Promise<string> };
    if (DOE && typeof DOE.requestPermission === 'function') {
      try { sensor = (await DOE.requestPermission()) === 'granted'; } catch { sensor = false; }
    } else if ('ondeviceorientationabsolute' in window || 'ondeviceorientation' in window) {
      sensor = true;
    }
    setMode(sensor ? 'sensor' : 'drag');

    await new Promise<void>((resolve) => {
      if (!navigator.geolocation) {
        obsRef.current = { lat: 35, lon: 0 };
        setNote('Location unavailable — showing an approximate sky.');
        resolve();
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (p) => { obsRef.current = { lat: p.coords.latitude, lon: p.coords.longitude }; resolve(); },
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

    let width = mount.clientWidth, height = mount.clientHeight;
    const observer = new Observer(obs.lat, obs.lon, 0);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(72, width / height, 0.1, 600);
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    mount.appendChild(renderer.domElement);

    // --- gradient sky dome (fixed to horizon, doesn't rotate with the sky) ---
    const domeMat = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      vertexShader: `varying vec3 vP; void main(){ vP=position; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
      fragmentShader: `
        varying vec3 vP;
        void main(){
          float a = normalize(vP).y;
          vec3 zenith=vec3(0.012,0.02,0.05);
          vec3 horizon=vec3(0.05,0.09,0.17);
          vec3 ground=vec3(0.006,0.012,0.02);
          vec3 c = a>0.0 ? mix(horizon,zenith,smoothstep(0.0,0.55,a)) : mix(horizon,ground,smoothstep(0.0,-0.25,a));
          // faint warm glow right at the horizon
          c += vec3(0.10,0.07,0.04) * (1.0 - smoothstep(0.0,0.10,abs(a))) * 0.5;
          gl_FragColor=vec4(c,1.0);
        }`,
    });
    scene.add(new THREE.Mesh(new THREE.SphereGeometry(R * 2.4, 48, 32), domeMat));

    const sky = new THREE.Group();
    scene.add(sky);

    // --- stars (glowing + twinkling) ----------------------------------------
    const starsResult = getStars();
    const stars = starsResult.ok ? starsResult.data : [];
    const n = stars.length;
    const sPos = new Float32Array(n * 3);
    const sCol = new Float32Array(n * 3);
    const sSize = new Float32Array(n);
    const sPhase = new Float32Array(n);
    stars.forEach((s, i) => {
      const [r, g, b] = bvToRgb(s.bv ?? 0.4);
      sCol.set([r, g, b], i * 3);
      sSize[i] = 6 + Math.max(0, 4.5 - s.vmag) * 5;
      sPhase[i] = Math.random() * Math.PI * 2;
    });
    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute('position', new THREE.BufferAttribute(sPos, 3));
    starGeo.setAttribute('aColor', new THREE.BufferAttribute(sCol, 3));
    starGeo.setAttribute('aSize', new THREE.BufferAttribute(sSize, 1));
    starGeo.setAttribute('aPhase', new THREE.BufferAttribute(sPhase, 1));
    const starTex = roundPointTexture();
    const starMat = new THREE.ShaderMaterial({
      uniforms: { uTex: { value: starTex }, uTime: { value: 0 } },
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      vertexShader: `
        attribute float aSize; attribute vec3 aColor; attribute float aPhase;
        uniform float uTime; varying vec3 vColor; varying float vTw;
        void main(){
          vColor=aColor;
          vTw = 0.75 + 0.25*sin(uTime*2.5 + aPhase);
          vec4 mv=modelViewMatrix*vec4(position,1.0);
          gl_PointSize=aSize*vTw; gl_Position=projectionMatrix*mv;
        }`,
      fragmentShader: `
        uniform sampler2D uTex; varying vec3 vColor; varying float vTw;
        void main(){ vec4 t=texture2D(uTex, gl_PointCoord); if(t.a<0.05) discard;
          gl_FragColor=vec4(vColor, t.a*vTw); }`,
    });
    sky.add(new THREE.Points(starGeo, starMat));

    // --- constellation lines -------------------------------------------------
    let segCount = 0;
    CONSTELLATIONS.forEach((c) => (segCount += c.lines.length));
    const linePos = new Float32Array(segCount * 6);
    const lineGeo = new THREE.BufferGeometry();
    lineGeo.setAttribute('position', new THREE.BufferAttribute(linePos, 3));
    sky.add(new THREE.LineSegments(lineGeo, new THREE.LineBasicMaterial({ color: 0x5a8fd0, transparent: true, opacity: 0.5 })));

    // --- horizon ring --------------------------------------------------------
    const ringPts: THREE.Vector3[] = [];
    for (let a = 0; a <= 360; a += 3) ringPts.push(altAzToVec3(0, a, R));
    scene.add(new THREE.LineLoop(
      new THREE.BufferGeometry().setFromPoints(ringPts),
      new THREE.LineBasicMaterial({ color: 0x2fae9a, transparent: true, opacity: 0.45 })
    ));

    // --- labels & markers ----------------------------------------------------
    const glowTex = glowTexture('#ffffff');
    interface Marker { name: string; obj: THREE.Object3D; el: HTMLDivElement; kind: 'planet' | 'const' | 'star'; }
    const markers: Marker[] = [];
    const makeLabel = (text: string, cls: string) => {
      const el = document.createElement('div');
      el.className = `sky-label ${cls}`;
      el.textContent = text;
      mount.appendChild(el);
      return el;
    };

    const planetSprites = PLANETS.map((p) => {
      const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
        map: glowTex, color: new THREE.Color(p.color), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      }));
      sprite.scale.setScalar(p.big ? 11 : 6.5);
      sky.add(sprite);
      const anchor = new THREE.Object3D();
      sky.add(anchor);
      markers.push({ name: p.name, obj: anchor, el: makeLabel(p.name, 'sky-planet'), kind: 'planet' });
      return { ...p, sprite, anchor };
    });

    const constAnchors = CONSTELLATIONS.map((c) => {
      const anchor = new THREE.Object3D();
      sky.add(anchor);
      markers.push({ name: c.name, obj: anchor, el: makeLabel(c.name, 'sky-const'), kind: 'const' });
      return { c, anchor };
    });
    const namedStars = stars.filter((s) => s.commonName && s.vmag < 1.6).map((s) => {
      const anchor = new THREE.Object3D();
      sky.add(anchor);
      markers.push({ name: s.commonName!, obj: anchor, el: makeLabel(s.commonName!, 'sky-star'), kind: 'star' });
      return { s, anchor };
    });
    const cardinals = [{ t: 'N', az: 0 }, { t: 'E', az: 90 }, { t: 'S', az: 180 }, { t: 'W', az: 270 }].map(({ t, az }) => {
      const anchor = new THREE.Object3D();
      anchor.position.copy(altAzToVec3(2, az, R));
      scene.add(anchor); // cardinals fixed to world horizon, not the rotating sky
      return { anchor, el: makeLabel(t, 'sky-cardinal') };
    });

    // --- compute / refresh positions ----------------------------------------
    const computeSky = () => {
      const now = new Date();
      stars.forEach((s, i) => {
        try {
          const h = Horizon(now, observer, s.raDeg / 15, s.decDeg, 'normal');
          const v = altAzToVec3(h.altitude, h.azimuth, R);
          sPos.set([v.x, v.y, v.z], i * 3);
        } catch { sPos.set([0, -R, 0], i * 3); }
      });
      starGeo.attributes.position.needsUpdate = true;

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

      planetSprites.forEach((p) => {
        try {
          const eq = Equator(p.body, now, observer, true, true);
          const h = Horizon(now, observer, eq.ra, eq.dec, 'normal');
          const v = altAzToVec3(h.altitude, h.azimuth, R * 0.97);
          p.sprite.position.copy(v); p.anchor.position.copy(v); p.sprite.visible = true;
        } catch { p.sprite.visible = false; }
      });
    };
    computeSky();
    const refresh = window.setInterval(computeSky, 30_000);

    // --- orientation ---------------------------------------------------------
    let headingOffset = 0; // fine calibration (drag)
    const orient = { alpha: 0, beta: 90, gamma: 0, have: false };
    let alphaAbs: number | null = null; // absolute (true-north) heading source

    const onOrient = (e: DeviceOrientationEvent) => {
      if (e.alpha == null) return;
      orient.alpha = e.alpha; orient.beta = e.beta ?? 90; orient.gamma = e.gamma ?? 0; orient.have = true;
      const wch = (e as unknown as { webkitCompassHeading?: number }).webkitCompassHeading;
      if (typeof wch === 'number' && !Number.isNaN(wch)) alphaAbs = 360 - wch;        // iOS magnetometer (Compass-app source)
      else if ((e as unknown as { absolute?: boolean }).absolute) alphaAbs = e.alpha;  // Android absolute
    };
    if (mode === 'sensor') {
      window.addEventListener('deviceorientationabsolute', onOrient as EventListener, true);
      window.addEventListener('deviceorientation', onOrient as EventListener, true);
    }

    let dragging = false, lastX = 0, lastY = 0;
    const look = { yaw: 0, pitch: 0 };
    const onDown = (e: PointerEvent) => { dragging = true; lastX = e.clientX; lastY = e.clientY; };
    const onMove = (e: PointerEvent) => {
      if (!dragging) return;
      const dx = e.clientX - lastX, dy = e.clientY - lastY; lastX = e.clientX; lastY = e.clientY;
      if (mode === 'sensor') headingOffset += dx * 0.004;
      else { look.yaw -= dx * 0.004; look.pitch = Math.max(-1.4, Math.min(1.4, look.pitch - dy * 0.004)); }
    };
    const onUp = () => { dragging = false; };
    const cvs = renderer.domElement;
    cvs.style.touchAction = 'none';
    cvs.addEventListener('pointerdown', onDown);
    cvs.addEventListener('pointermove', onMove);
    cvs.addEventListener('pointerup', onUp);
    cvs.addEventListener('pointerleave', onUp);

    const ro = new ResizeObserver(() => {
      width = mount.clientWidth; height = mount.clientHeight;
      camera.aspect = width / height; camera.updateProjectionMatrix(); renderer.setSize(width, height);
    });
    ro.observe(mount);

    const screenAngle = () =>
      (window.screen?.orientation?.angle ?? (window as unknown as { orientation?: number }).orientation ?? 0) as number;

    // --- loop ----------------------------------------------------------------
    const clock = new THREE.Clock();
    const dir = new THREE.Vector3();
    const tmp = new THREE.Vector3();
    const targetQ = new THREE.Quaternion();
    let raf = 0;
    const animate = () => {
      raf = requestAnimationFrame(animate);
      starMat.uniforms.uTime.value = clock.getElapsedTime();

      if (mode === 'sensor' && orient.have) {
        // use the absolute (compass) heading when available so the sky stays
        // locked to true north; smooth with slerp to kill magnetometer jitter
        const a = alphaAbs != null ? alphaAbs : orient.alpha;
        deviceQuaternion(targetQ, a, orient.beta, orient.gamma, screenAngle());
        camera.quaternion.slerp(targetQ, 0.22);
      } else {
        camera.quaternion.setFromEuler(new THREE.Euler(look.pitch, look.yaw, 0, 'YXZ'));
      }
      sky.rotation.y = headingOffset;

      camera.getWorldDirection(dir);
      const all = [...markers, ...cardinals.map((c) => ({ name: '', obj: c.anchor, el: c.el, kind: 'star' as const }))];
      all.forEach((m) => {
        m.obj.getWorldPosition(tmp);
        if (tmp.clone().normalize().dot(dir) < 0.2) { m.el.style.opacity = '0'; return; }
        tmp.project(camera);
        if (tmp.z > 1) { m.el.style.opacity = '0'; return; }
        m.el.style.transform = `translate(${(tmp.x * 0.5 + 0.5) * width}px, ${(-tmp.y * 0.5 + 0.5) * height}px) translate(-50%, -50%)`;
        m.el.style.opacity = '1';
      });

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
        readoutRef.current.textContent =
          `${best ?? '—'}  ·  ${COMPASS16[Math.round(azLook / 22.5) % 16]} ${Math.round(azLook)}°  ·  alt ${Math.round(altLook)}°`;
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
      glowTex.dispose(); domeMat.dispose();
      scene.traverse((o) => {
        if (o instanceof THREE.Mesh || o instanceof THREE.Sprite) {
          (o as THREE.Mesh).geometry?.dispose?.();
          const mt = (o as THREE.Mesh).material;
          if (Array.isArray(mt)) mt.forEach((x) => x.dispose()); else mt?.dispose();
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
              ? 'Point your phone at the sky · drag to fine-tune the compass'
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
              at — calculated live for your location and the current time, aligned with your phone’s compass.
            </p>
            <button className="sky-start" onClick={start}>Start</button>
            <p className="sky-intro-fine">
              Needs location and (on phones) motion-sensor access. For the best compass, calibrate it first
              by waving your phone in a figure-8. On a computer you can drag to explore.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
