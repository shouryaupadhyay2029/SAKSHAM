import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { gsap } from 'gsap';

import { initScrollReveals } from '../../motion/scroll/scrollReveal';

interface PageTransitionProps {
  children: (displayLocation: any) => React.ReactNode;
}

export const PageTransition: React.FC<PageTransitionProps> = ({ children }) => {
  const location = useLocation();
  const [displayLocation, setDisplayLocation] = useState(location);
  const overlayRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);
  const animating = useRef(false);

  // Detect prefers-reduced-motion
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  useEffect(() => {
    if (location.pathname === displayLocation.pathname) return;
    if (animating.current) {
      // If already animating, just commit the new location immediately
      setDisplayLocation(location);
      return;
    }

    const isOpPath = (path: string) =>
      ['/operations/command-center', '/operations/matching', '/operations/dispatch', '/operations/delivery'].some(p => path.startsWith(p));

    const wasOp = isOpPath(displayLocation.pathname);
    const isOp = isOpPath(location.pathname);
    const isContextChange = wasOp !== isOp;

    animating.current = true;

    if (prefersReducedMotion) {
      gsap.to(contentRef.current, {
        opacity: 0,
        duration: 0.12,
        onComplete: () => {
          setDisplayLocation(location);
          animating.current = false;
        }
      });
      return;
    }

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({
        onComplete: () => {
          setDisplayLocation(location);
          animating.current = false;
        }
      });

      // Fast fade+slide exit — GPU composited only (opacity + transform)
      tl.to(contentRef.current, {
        opacity: 0,
        y: isContextChange ? -8 : -5,
        duration: isContextChange ? 0.18 : 0.12,
        ease: 'power2.in',
        force3D: true
      });

      if (isContextChange && overlayRef.current) {
        tl.fromTo(overlayRef.current, { yPercent: 100, opacity: 0 }, {
          yPercent: 0,
          opacity: 1,
          duration: 0.28,
          ease: 'power3.out'
        }, 0)
        .fromTo(progressBarRef.current, { width: '0%' }, {
          width: '100%',
          duration: 0.32,
          ease: 'power2.inOut'
        }, 0.08);
      }
    });

    return () => ctx.revert();
  }, [location]);

  // Entrance transition once displayLocation is updated
  useEffect(() => {
    if (!contentRef.current) return;

    // Reset position before animating in
    gsap.set(contentRef.current, { opacity: 0, y: 8 });

    const ctx = gsap.context(() => {
      const entranceTl = gsap.timeline({
        onStart: () => { initScrollReveals(); }
      });

      entranceTl.to(contentRef.current, {
        opacity: 1,
        y: 0,
        duration: prefersReducedMotion ? 0.15 : 0.28,
        ease: 'power3.out',
        force3D: true,
        clearProps: 'transform'
      });

      // Hide overlay fast
      if (overlayRef.current) {
        entranceTl.to(overlayRef.current, {
          yPercent: -100,
          opacity: 0,
          duration: 0.22,
          ease: 'power3.inOut'
        }, 0.05);
      }
    }, contentRef);

    return () => ctx.revert();
  }, [displayLocation]);

  return (
    <div style={{ position: 'relative', overflow: 'hidden', minHeight: '100vh', width: '100vw', backgroundColor: '#FAF8F3' }}>
      {/* Subtle Ivory Bridge Overlay */}
      <div
        ref={overlayRef}
        style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: '#FAF8F3',
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          pointerEvents: 'none',
          opacity: 0,
          transform: 'translateY(100%)',
          borderLeft: '1px solid rgba(11, 33, 25, 0.05)',
          borderRight: '1px solid rgba(11, 33, 25, 0.05)'
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
          <div style={{
            fontFamily: 'Georgia, serif',
            fontSize: '26px',
            color: '#0B2119',
            fontWeight: 'bold',
            letterSpacing: '0.04em',
            display: 'flex',
            alignItems: 'center',
            gap: 8
          }}>
            <span style={{ color: '#E86F16' }}>◇</span> SAKSHAM
          </div>
          <div style={{
            width: '140px',
            height: '2px',
            backgroundColor: 'rgba(11, 33, 25, 0.07)',
            position: 'relative',
            overflow: 'hidden',
            borderRadius: '2px'
          }}>
            <div
              ref={progressBarRef}
              style={{
                position: 'absolute',
                left: 0,
                top: 0,
                bottom: 0,
                width: '0%',
                backgroundColor: '#E86F16'
              }}
            />
          </div>
        </div>
      </div>

      <div ref={contentRef} style={{ width: '100%', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        {children(displayLocation)}
      </div>
    </div>
  );
};

export default PageTransition;
