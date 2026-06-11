// ---------------------------------------------------------------------------
// StarScape — Three.js planet tracker overlay
// ---------------------------------------------------------------------------
// Renders visible planet positions as glowing sprites on the star sphere.
// Planet data comes from JPL Horizons (via proxy) using the same RA/Dec
// coordinate system as the Hipparcos stars.
// ---------------------------------------------------------------------------

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { usePlanetStore } from '@store/usePlanetStore';

// Planet colour map (approximate visual colours)
const PLANET_COLORS: Record<string, THREE.Color> = {
  Mercury: new THREE.Color('#C8A882'),
  Venus: new THREE.Color('#F5DEB3'),
  Mars: new THREE.Color('#E05C2C'),
  Jupiter: new THREE.Color('#C88B3A'),
  Saturn: new THREE.Color('#E4D59A'),
  Moon: new THREE.Color('#F0EEE8'),
};

// Vertex shader — planet glow sprite
const PLANET_VERT = /* glsl */`
  attribute float aSize;
  attribute vec3 aColor;
  varying vec3 vColor;
  void main() {
    vColor = aColor;
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = aSize * (300.0 / -mvPosition.z);
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const PLANET_FRAG = /* glsl */`
  varying vec3 vColor;
  void main() {
    float dist = length(gl_PointCoord - vec2(0.5));
    if (dist > 0.5) discard;
    // Sharper core, softer glow
    float core = 1.0 - smoothstep(0.0, 0.15, dist);
    float glow = (1.0 - smoothstep(0.1, 0.5, dist)) * 0.4;
    float alpha = core + glow;
    gl_FragColor = vec4(vColor * (core * 2.0 + 1.0), alpha);
  }
`;

export function PlanetTracker() {
  const planets = usePlanetStore((s) => s.planets);
  const loadState = usePlanetStore((s) => s.loadState);
  const meshRef = useRef<THREE.Points>(null);

  // Gentle pulse animation
  useFrame(({ clock }) => {
    if (meshRef.current) {
      const pulse = 1.0 + Math.sin(clock.elapsedTime * 1.5) * 0.1;
      meshRef.current.scale.setScalar(pulse);
    }
  });

  if (loadState !== 'success' || planets.length === 0) return null;

  const n = planets.length;
  const positions = new Float32Array(n * 3);
  const sizes = new Float32Array(n);
  const colors = new Float32Array(n * 3);

  planets.forEach((p, i) => {
    positions[i * 3] = p.x;
    positions[i * 3 + 1] = p.y;
    positions[i * 3 + 2] = p.z;
    // Planets are larger points than stars
    sizes[i] = 4.0 + Math.max(0, 2.0 - p.magnitude) * 2.0;
    const col = PLANET_COLORS[p.name] ?? new THREE.Color('#FFFFFF');
    colors[i * 3] = col.r;
    colors[i * 3 + 1] = col.g;
    colors[i * 3 + 2] = col.b;
  });

  return (
    <points ref={meshRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-aSize" args={[sizes, 1]} />
        <bufferAttribute attach="attributes-aColor" args={[colors, 3]} />
      </bufferGeometry>
      <shaderMaterial
        vertexShader={PLANET_VERT}
        fragmentShader={PLANET_FRAG}
        transparent={true}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}
