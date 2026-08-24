import React, { useState, useEffect, useRef } from 'react';
import { ShieldCheck } from 'lucide-react';
import { gsap } from 'gsap';
import styles from './BootScreen.module.css';
import { GradientBackground } from '../ui/almoayyed';

interface BootScreenProps {
  onComplete: () => void;
}

const features = [
  {
    num: '01',
    line1: 'REAL-TIME',
    line2: 'INCIDENT MONITORING',
    desc: 'Continuous monitoring of threats and emergencies across regions with live updates.'
  },
  {
    num: '02',
    line1: 'RESOURCE-DEMAND',
    line2: 'MATCHING',
    desc: 'Algorithmic matching of disaster requests with nearest available supply inventories.'
  },
  {
    num: '03',
    line1: 'SMART',
    line2: 'LOGISTICS ROUTING',
    desc: 'Optimized dispatch routes for relief vehicles avoiding waterlogged or high-hazard zones.'
  },
  {
    num: '04',
    line1: 'CONNECTED',
    line2: 'RESPONSE NETWORK',
    desc: 'Unified dashboard connecting NDRF, civil defence, state authorities, and civilian requests.'
  }
];

const seamNodes = [
  { x: 42, y: 250 },
  { x: 50, y: 450 },
  { x: 58, y: 650 },
  { x: 50, y: 850 }
];

export const BootScreen: React.FC<BootScreenProps> = ({ onComplete }) => {
  // Track-based active feature index: -1 initially (hidden), 0 to 3 are features, 4 is ready transition.
  const [featureIndex, setFeatureIndex] = useState(-1);
  const [isReadyStage, setIsReadyStage] = useState(false);
  const [isExiting, setIsExiting] = useState(false);

  // Refs for GSAP animation targets
  const containerRef = useRef<HTMLDivElement>(null);
  const logoMarkRef = useRef<HTMLDivElement>(null);
  const brandWordmarkRef = useRef<HTMLHeadingElement>(null);
  const brandDescriptorRef = useRef<HTMLParagraphElement>(null);
  const skipCueRef = useRef<HTMLDivElement>(null);
  const leftBottomStatusRef = useRef<HTMLDivElement>(null);
  const initiatingTextRef = useRef<HTMLDivElement>(null);
  const rightBottomBarRef = useRef<HTMLDivElement>(null);
  const featureTrackRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // 3.5s Safety fallback timeout to guarantee app boot under all scenarios
    const safetyTimeout = setTimeout(() => {
      console.warn("[SAKSHAM] BootScreen safety fallback triggered.");
      onComplete();
    }, 3500);

    // 1. Initial State configurations
    gsap.set([
      logoMarkRef.current,
      brandWordmarkRef.current,
      brandDescriptorRef.current,
      skipCueRef.current,
      leftBottomStatusRef.current,
      initiatingTextRef.current,
      rightBottomBarRef.current,
      featureTrackRef.current
    ], { opacity: 0 });

    // Set positions for brand reveal
    gsap.set(logoMarkRef.current, { scale: 0.92, y: 6 });
    gsap.set(brandWordmarkRef.current, { y: 14 });
    gsap.set(brandDescriptorRef.current, { y: 10 });
    gsap.set(skipCueRef.current, { y: -8 });

    // 2. Orchestrated GSAP timeline
    const ctx = gsap.context(() => {
      const tl = gsap.timeline();

      // Breathing moment on empty screen
      tl.to({}, { duration: 0.35 });

      // Brand logo mark reveal
      tl.to(logoMarkRef.current, {
        opacity: 1,
        scale: 1,
        y: 0,
        duration: 0.5,
        ease: 'power2.out'
      });

      // Brand wordmark reveal (slight delay offset)
      tl.to(brandWordmarkRef.current, {
        opacity: 1,
        y: 0,
        duration: 0.5,
        ease: 'power2.out'
      }, '-=0.4');

      // Brand descriptor reveal
      tl.to(brandDescriptorRef.current, {
        opacity: 1,
        y: 0,
        duration: 0.4,
        ease: 'power2.out'
      }, '-=0.3');

      // Fade in secondary utility bars
      tl.to([skipCueRef.current, leftBottomStatusRef.current, initiatingTextRef.current, rightBottomBarRef.current, featureTrackRef.current], {
        opacity: 1,
        y: 0,
        duration: 0.45,
        stagger: 0.08,
        ease: 'power1.out'
      }, '-=0.15');

      // Survey features loop (0 to 3)
      for (let i = 0; i < 4; i++) {
        tl.call(() => setFeatureIndex(i));
        // Transition delay & active hold timing
        if (i === 3) {
          tl.to({}, { duration: 1.8 }); // Hold longer on final CONNECTED RESPONSE NETWORK feature
        } else {
          tl.to({}, { duration: 1.1 }); // Hold feature
        }
      }

      // Transition to Ready status
      tl.call(() => {
        setIsReadyStage(true);
      });

      tl.to({}, { duration: 1.4 }); // Hold ready status briefly

      // Door panel exit choreography
      tl.call(() => {
        setIsExiting(true);
      });

      tl.to({}, { duration: 1.2 }); // Wait for panels exit translate to complete

      // Terminate and callback
      tl.call(() => {
        onComplete();
      });
    }, containerRef);

    return () => {
      clearTimeout(safetyTimeout);
      ctx.revert();
    };
  }, [onComplete]);

  // Handle ESC key to skip
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsExiting(true);
        const tComplete = setTimeout(() => {
          onComplete();
        }, 1100);
        return () => clearTimeout(tComplete);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onComplete]);

  const activeIndexVal = Math.max(0, Math.min(featureIndex, 3));

  return (
    <div
      ref={containerRef}
      className={`${styles.bootOverlay} ${isExiting ? styles.exiting : ''}`}
      style={{ '--active-index': activeIndexVal } as React.CSSProperties}
    >
      <GradientBackground className={styles.bootBackground} />
      {/* LEFT SURFACE */}
      <div className={styles.leftPanel}>
        {/* Curved seam SVGs */}
        <svg className={styles.seamSvg} viewBox="0 0 100 1000" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M 40,0 C 40,120 38,180 42,250 C 46,330 45,380 50,450 C 55,520 56,580 58,650 C 60,720 54,780 50,850 C 47,910 50,950 50,1000"
            stroke="rgba(12, 29, 23, 0.15)"
            strokeWidth="1.2"
            fill="none"
          />

          {seamNodes.map((node, i) => (
            <circle
              key={i}
              cx={node.x}
              cy={node.y}
              r="4"
              fill={i === activeIndexVal ? "#F47C20" : "#FAF8F3"}
              stroke={i === activeIndexVal ? "#F47C20" : "rgba(12, 29, 23, 0.25)"}
              strokeWidth="1.5"
            />
          ))}

          {featureIndex >= 0 && (
            <g
              transform={`translate(${seamNodes[activeIndexVal].x}, ${seamNodes[activeIndexVal].y})`}
              style={{ transition: 'transform 900ms cubic-bezier(0.22, 1, 0.36, 1)' }}
              className={featureIndex >= 3 ? styles.readyPulse : ''}
            >
              <line x1="-10" y1="0" x2="10" y2="0" stroke="#F47C20" strokeWidth="1.5" />
              <circle cx="0" cy="0" r="3" fill="#FAF8F3" stroke="#F47C20" strokeWidth="1.8" />
            </g>
          )}
        </svg>

        {/* Brand SAKSHAM Centered Logo & Typography */}
        <div className={styles.leftBrandContainer}>
          <div ref={logoMarkRef} className={styles.logoMark}>
            <img src="/logo.png" alt="SAKSHAM Logo" style={{ width: '140px', height: '140px', objectFit: 'contain' }} />
          </div>
          <h1 ref={brandWordmarkRef} className={styles.brandWordmark}>
            SAKSHAM
          </h1>
          <p ref={brandDescriptorRef} className={styles.brandDescriptor}>
            DISASTER RESPONSE &amp; RELIEF COORDINATION NETWORK
          </p>
        </div>

        {/* Bottom active state indicator */}
        <div ref={leftBottomStatusRef} className={styles.leftBottomStatus}>
          RESPONSE NETWORK
          <div className={styles.statusActiveRow}>
            <span className={styles.activeDot}>●</span> ACTIVE
          </div>
        </div>

        {/* Initiating Monospace metadata */}
        <div ref={initiatingTextRef} className={styles.initiatingText}>
          SAKSHAM INITIATING SYSTEMS...
        </div>
      </div>

      {/* RIGHT SURFACE - WARM CREAM */}
      <div className={`${styles.rightPanel} textureCream`}>
        {/* Escape Skip Cue */}
        <div ref={skipCueRef} className={styles.skipCue}>Press ESC to Skip</div>

        {/* Accordion Feature Viewport & Track */}
        <div className={styles.featureViewport}>
          <div
            ref={featureTrackRef}
            className={styles.featureTrack}
            style={{ transform: `translate3d(0, -${activeIndexVal * 44}px, 0)` }}
          >
            {features.map((feat, idx) => {
              const isActive = idx === activeIndexVal;

              return (
                <div
                  key={idx}
                  className={`${styles.featureItem} ${isActive ? styles.expanded : styles.collapsed}`}
                >
                  {/* Expanded Content Viewport */}
                  <div className={styles.expandedContent}>
                    <div className={styles.featureCounter}>{feat.num} / 04</div>
                    <h2 className={styles.featureTitle}>
                      {feat.line1}
                      <br />
                      {feat.line2}
                    </h2>
                    <div className={styles.orangeLine} />
                    <p className={styles.featureDesc}>{feat.desc}</p>
                  </div>

                  {/* Collapsed Row Viewport */}
                  <div className={styles.collapsedRow}>
                    <span className={styles.collapsedDot}>●</span>
                    <span className={styles.collapsedCounter}>{feat.num} / 04</span>
                    <span className={styles.collapsedTitle}>{feat.line1} {feat.line2}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Bottom Ready status bar */}
        <div ref={rightBottomBarRef} className={styles.rightBottomBar}>
          <div className={styles.readyStatusRow}>
            <div className={styles.readyIndicator}>
              RESPONSE NETWORK READY
            </div>
            {isReadyStage ? (
              <div className={styles.readyPulse}>
                <ShieldCheck size={12} />
                <span className={styles.readyGreenDot}>●</span> READY
              </div>
            ) : (
              <div className={styles.readyPulse} style={{ color: '#F47C20' }}>
                <span>●</span> ACTIVATING
              </div>
            )}
          </div>

          <div className={styles.coordinatesText}>
            28.6139° N, 77.2090° E
          </div>
        </div>
      </div>
    </div>
  );
};

export default BootScreen;
