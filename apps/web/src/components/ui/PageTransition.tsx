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

  // Detect prefers-reduced-motion
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  useEffect(() => {
    if (location.pathname === displayLocation.pathname) return;

    // Operational context page list (Command Centre workflow pages)
    const isOpPath = (path: string) =>
      ['/operations/command-center', '/operations/matching', '/operations/dispatch', '/operations/delivery'].some(p => path.startsWith(p));

    const wasOp = isOpPath(displayLocation.pathname);
    const isOp = isOpPath(location.pathname);
    const isContextChange = wasOp !== isOp;

    const exitDuration = prefersReducedMotion ? 0.15 : (isContextChange ? 0.35 : 0.22);

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({
        onComplete: () => {
          // Commit route change
          setDisplayLocation(location);
        }
      });

      if (prefersReducedMotion) {
        tl.to(contentRef.current, { opacity: 0, duration: exitDuration });
        return;
      }

      // Exit current page content subtly
      tl.to(contentRef.current, {
        opacity: 0.1,
        y: -10,
        duration: exitDuration,
        ease: 'power2.inOut'
      }, 0);

      // Context change ivory bridge reveal
      if (isContextChange && overlayRef.current) {
        tl.fromTo(overlayRef.current, {
          yPercent: 100,
          opacity: 0
        }, {
          yPercent: 0,
          opacity: 1,
          duration: 0.38,
          ease: 'power3.out'
        }, 0)
          .fromTo(progressBarRef.current, { width: '0%' }, {
            width: '100%',
            duration: 0.45,
            ease: 'power2.inOut'
          }, 0.15);
      }
    });

    return () => ctx.revert();
  }, [location, displayLocation, prefersReducedMotion]);

  // Entrance transition once displayLocation is updated
  useEffect(() => {
    const ctx = gsap.context(() => {
      if (prefersReducedMotion) {
        gsap.fromTo(contentRef.current, { opacity: 0 }, { opacity: 1, duration: 0.15 });
        initScrollReveals();
        return;
      }

      const entranceTl = gsap.timeline();

      // Fade & lift in new page content
      entranceTl.fromTo(contentRef.current, {
        opacity: 0,
        y: 15
      }, {
        opacity: 1,
        y: 0,
        duration: 0.58,
        ease: 'power3.out',
        onStart: () => {
          // Trigger the text block reveals once the new DOM elements are fully mounted
          initScrollReveals();
        }
      }, 0);

      // Find major headings (H1 or custom hero headers) and stagger them, excluding block reveal ones
      const headings = contentRef.current?.querySelectorAll('h1:not(.reveal-block), h2:not(.reveal-block)');
      if (headings && headings.length > 0) {
        gsap.fromTo(headings, {
          opacity: 0,
          y: 12
        }, {
          opacity: 1,
          y: 0,
          duration: 0.65,
          ease: 'power3.out',
          stagger: 0.08,
          delay: 0.05
        });
      }

      // Hide overlay
      if (overlayRef.current) {
        entranceTl.to(overlayRef.current, {
          yPercent: -100,
          opacity: 0,
          duration: 0.35,
          ease: 'power3.inOut'
        }, 0.1);
      }
    }, contentRef);

    return () => ctx.revert();
  }, [displayLocation, prefersReducedMotion]);

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
