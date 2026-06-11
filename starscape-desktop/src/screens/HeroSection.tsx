// ---------------------------------------------------------------------------
// StarScape — Hero section with Three.js starfield and scroll-driven camera
// ---------------------------------------------------------------------------
// The Canvas fills the viewport. A thin HTML overlay provides the title
// and scroll indicator. GSAP ScrollTrigger binds scroll progress to the
// camera drift prop passed down to StarField.
// ---------------------------------------------------------------------------

import { useRef, useEffect, useState, useCallback } from 'react';
import { Canvas } from '@react-three/fiber';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { motion } from 'framer-motion';
import { StarField, SpaceBackground } from '@scenes/StarField';
import { PlanetTracker } from '@scenes/PlanetTracker';
import { useStarsStore } from '@store/useStarsStore';
import { CAMERA_FOV } from '@constants/config';

gsap.registerPlugin(ScrollTrigger);

export function HeroSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const [scrollProgress, setScrollProgress] = useState(0);
  const loadStars = useStarsStore((s) => s.loadStars);
  const isLoaded = useStarsStore((s) => s.isLoaded);
  const error = useStarsStore((s) => s.error);

  // Load star data on mount
  useEffect(() => {
    loadStars();
  }, [loadStars]);

  // Wire GSAP ScrollTrigger to scroll progress state
  useEffect(() => {
    if (!sectionRef.current) return;

    const trigger = ScrollTrigger.create({
      trigger: sectionRef.current,
      start: 'top top',
      end: 'bottom bottom',
      onUpdate: (self) => {
        setScrollProgress(self.progress);
      },
    });

    return () => trigger.kill();
  }, []);

  const handleScrollDown = useCallback(() => {
    window.scrollTo({ top: window.innerHeight, behavior: 'smooth' });
  }, []);

  return (
    <section
      ref={sectionRef}
      style={{
        position: 'relative',
        height: '200vh', // 2x viewport so scroll has room to animate
        background: '#000814',
      }}
      aria-label="Interactive star field hero section"
    >
      {/* Sticky Three.js canvas — stays pinned while section scrolls past */}
      <div
        style={{
          position: 'sticky',
          top: 0,
          height: '100vh',
          width: '100%',
        }}
      >
        <Canvas
          camera={{ fov: CAMERA_FOV, near: 0.1, far: 2000, position: [0, 0, 1] }}
          gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
          style={{ background: '#000814' }}
          aria-label="3D star field visualization"
          role="img"
        >
          <SpaceBackground />
          {isLoaded && <StarField scrollProgress={scrollProgress} />}
          <PlanetTracker />
        </Canvas>

        {/* HTML overlay: title */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.2, ease: 'easeOut', delay: 0.3 }}
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            textAlign: 'center',
            color: '#E8F4FD',
            pointerEvents: 'none',
            userSelect: 'none',
          }}
        >
          <h1
            style={{
              fontSize: 'clamp(2.5rem, 5vw, 4.5rem)',
              fontWeight: 200,
              letterSpacing: '0.15em',
              margin: 0,
              textShadow: '0 0 60px rgba(76, 201, 240, 0.4)',
            }}
          >
            STARSCAPE
          </h1>
          <p
            style={{
              fontSize: 'clamp(0.8rem, 1.25vw, 1rem)',
              letterSpacing: '0.3em',
              color: '#8BAFC9',
              marginTop: '1rem',
              textTransform: 'uppercase',
            }}
          >
            Journey Through the Night Sky
          </p>
        </motion.div>

        {/* Scroll indicator — fades out as user scrolls */}
        <motion.button
          style={{
            position: 'absolute',
            bottom: '2rem',
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '0.5rem',
            color: '#4A6785',
            fontSize: '0.75rem',
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
          }}
          animate={{ opacity: scrollProgress > 0.1 ? 0 : 1 }}
          transition={{ duration: 0.3 }}
          onClick={handleScrollDown}
          aria-label="Scroll to explore"
        >
          <span>Scroll to explore</span>
          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ repeat: Infinity, duration: 1.5, ease: 'easeInOut' }}
            style={{ width: 1, height: 40, background: 'currentColor' }}
          />
        </motion.button>

        {/* Error state */}
        {error && (
          <div
            role="alert"
            style={{
              position: 'absolute',
              bottom: '5rem',
              left: '50%',
              transform: 'translateX(-50%)',
              color: '#FF6B6B',
              fontSize: '0.875rem',
              background: 'rgba(0,0,0,0.7)',
              padding: '0.5rem 1rem',
              borderRadius: '4px',
            }}
          >
            Star data unavailable: {error}
          </div>
        )}
      </div>
    </section>
  );
}
