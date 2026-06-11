// ---------------------------------------------------------------------------
// StarScape — Three.js star field scene (react-three/fiber)
// ---------------------------------------------------------------------------
// Renders all 187 Hipparcos bright stars as a WebGL Points geometry.
// Stars are positioned on a sphere of STAR_SPHERE_RADIUS world units.
// B-V colour index is used to tint each star appropriately.
// Camera drifts slowly on scroll (controlled by parent via scrollProgress prop).
// ---------------------------------------------------------------------------

import { useRef, useMemo, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useStarsStore } from '@store/useStarsStore';
import { STAR_SPHERE_RADIUS } from '@constants/config';

interface StarFieldProps {
  /** 0–1: how far the user has scrolled through the hero section */
  scrollProgress: number;
}

// Vertex shader — scales point size by attribute, colour from attribute
const VERT = /* glsl */`
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

// Fragment shader — soft circular point with slight glow
const FRAG = /* glsl */`
  varying vec3 vColor;
  void main() {
    float dist = length(gl_PointCoord - vec2(0.5));
    if (dist > 0.5) discard;
    float alpha = 1.0 - smoothstep(0.2, 0.5, dist);
    gl_FragColor = vec4(vColor, alpha);
  }
`;

export function StarField({ scrollProgress }: StarFieldProps) {
  const { camera } = useThree();
  const pointsRef = useRef<THREE.Points>(null);
  const starPoints = useStarsStore((s) => s.starPoints);

  // Pre-compute Float32Arrays for GPU upload — only when star data changes
  const { positions, sizes, colors } = useMemo(() => {
    const n = starPoints.length;
    const positions = new Float32Array(n * 3);
    const sizes = new Float32Array(n);
    const colors = new Float32Array(n * 3);

    starPoints.forEach((sp, i) => {
      positions[i * 3] = sp.x;
      positions[i * 3 + 1] = sp.y;
      positions[i * 3 + 2] = sp.z;
      sizes[i] = sp.size;
      colors[i * 3] = sp.r;
      colors[i * 3 + 1] = sp.g;
      colors[i * 3 + 2] = sp.b;
    });

    return { positions, sizes, colors };
  }, [starPoints]);

  // Camera reference angles for drift animation
  const cameraAngle = useRef({ theta: 0, phi: 0 });
  const targetAngle = useRef({ theta: 0, phi: 0 });

  // Map scroll progress to camera drift
  useEffect(() => {
    // Full scroll rotates camera 45° around Y, 10° in pitch
    targetAngle.current.theta = scrollProgress * Math.PI * 0.25;
    targetAngle.current.phi = scrollProgress * 0.175; // ~10°
  }, [scrollProgress]);

  useFrame((_state, delta) => {
    // Smooth lerp toward target angle
    cameraAngle.current.theta +=
      (targetAngle.current.theta - cameraAngle.current.theta) * delta * 2;
    cameraAngle.current.phi +=
      (targetAngle.current.phi - cameraAngle.current.phi) * delta * 2;

    // Keep camera at fixed distance, rotate around origin
    const radius = 1; // looking outward from origin — direction only matters
    const { theta, phi } = cameraAngle.current;
    camera.position.set(
      radius * Math.cos(phi) * Math.sin(theta),
      radius * Math.sin(phi),
      radius * Math.cos(phi) * Math.cos(theta)
    );
    camera.lookAt(0, 0, 0);
    // Rotate toward sky: inverse direction means we look at the sphere from inside
    camera.rotation.z = 0;
  });

  if (starPoints.length === 0) return null;

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
        />
        <bufferAttribute
          attach="attributes-aSize"
          args={[sizes, 1]}
        />
        <bufferAttribute
          attach="attributes-aColor"
          args={[colors, 3]}
        />
      </bufferGeometry>
      <shaderMaterial
        vertexShader={VERT}
        fragmentShader={FRAG}
        transparent={true}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

// ---------------------------------------------------------------------------
// Background gradient sphere (deep space background)
// ---------------------------------------------------------------------------
export function SpaceBackground() {
  return (
    <mesh scale={[-1, 1, 1]}>
      {/* Scale -1 on X to flip normals inward */}
      <sphereGeometry args={[STAR_SPHERE_RADIUS * 1.05, 32, 32]} />
      <meshBasicMaterial
        side={THREE.BackSide}
        color="#000814"
      />
    </mesh>
  );
}
