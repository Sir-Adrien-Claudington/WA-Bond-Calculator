// ---------------------------------------------------------------------------
// StarScape — shared planet-mesh helpers
// ---------------------------------------------------------------------------
// Fresnel atmosphere shell, radial-mapped ring geometry, and a geographic
// lat/lon -> unit-sphere conversion used to place detail hotspots.
// ---------------------------------------------------------------------------

import * as THREE from 'three';

const DEG2RAD = Math.PI / 180;

/** Additive fresnel-rim atmosphere shell around a planet of the given radius. */
export function makeAtmosphere(radius: number, hex: string, intensity: number): THREE.Mesh {
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
    side: THREE.BackSide,
  });
  return new THREE.Mesh(new THREE.SphereGeometry(radius, 64, 64), mat);
}

/** Ring geometry whose texture U coordinate follows the radial direction. */
export function radialRing(inner: number, outer: number, segments = 128): THREE.RingGeometry {
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

/**
 * Convert geographic latitude/longitude (degrees) to a point on a sphere of
 * the given radius, matching three.js SphereGeometry UV orientation closely
 * enough for illustrative hotspot placement.
 */
export function latLonToVec3(latDeg: number, lonDeg: number, radius: number): THREE.Vector3 {
  const phi = (90 - latDeg) * DEG2RAD; // polar angle from +Y
  const theta = lonDeg * DEG2RAD;
  return new THREE.Vector3(
    radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta)
  );
}
