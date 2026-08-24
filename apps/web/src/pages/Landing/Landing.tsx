import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useOperationalState } from '../../context/OperationalStateContext';
import { SituationalAwarenessMap } from '../../components/map/SituationalAwarenessMap';
import { PageGuidebook } from '../../components/ui/PageGuide';
import { LanguageSwitcher } from '../../components/LanguageSwitcher/LanguageSwitcher';
import { GradientBackground } from '../../components/ui/noisy-gradient-backgrounds';
import { ShaderBackground } from '../../components/ui/ShaderBackground';

import { useTranslation } from 'react-i18next';
gsap.registerPlugin(ScrollTrigger);
import {
  ShieldAlert,
  ArrowRight,
  Send,
  FileCheck,
  Truck,
  Layers,
  Link2
} from 'lucide-react';
import styles from './Landing.module.css';

export const Landing: React.FC = () => {
  const { t } = useTranslation();
  const { incidents, vehicles, shelters, addIncidentFromSOS } = useOperationalState();
  const [sosSubmitted, setSosSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [ticketId, setTicketId] = useState('');

  const [mapPhase, setMapPhase] = useState<'MONITOR' | 'INCIDENT' | 'PRIORITY' | 'RESPONSE' | 'RETURN'>('MONITOR');
  const [activeStage, setActiveStage] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveStage((prev) => (prev + 1) % 4);
    }, 4500);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const phases: ('MONITOR' | 'INCIDENT' | 'PRIORITY' | 'RESPONSE' | 'RETURN')[] = [
      'MONITOR', 'INCIDENT', 'PRIORITY', 'RESPONSE', 'RETURN'
    ];
    let idx = 0;
    const interval = setInterval(() => {
      idx = (idx + 1) % phases.length;
      setMapPhase(phases[idx]);
    }, 4500);
    return () => clearInterval(interval);
  }, []);

  const [sosForm, setSosForm] = useState({
    name: '',
    phone: '',
    zone: 'East Delhi',
    need: 'Drinking Water',
    details: ''
  });



  const handleSosSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!sosForm.name || !sosForm.phone || !sosForm.details) return;

    setIsSubmitting(true);

    setTimeout(() => {
      // Dispatch to global Operational State Store
      const reqId = addIncidentFromSOS({
        name: sosForm.name,
        phone: sosForm.phone,
        zone: sosForm.zone,
        need: sosForm.need,
        details: sosForm.details
      });

      setTicketId(reqId);
      setIsSubmitting(false);
      setSosSubmitted(true);
      setSosForm({ name: '', phone: '', zone: 'East Delhi', need: 'Drinking Water', details: '' });
    }, 1500); // 1.5s elegant matching delay
  };

  const landingRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Check prefers-reduced-motion to respect system options
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const headerEl = document.querySelector('header');

    const safeSet = (targets: any, vars: gsap.TweenVars) => {
      if (!targets) return;
      if (typeof targets === 'string') {
        if (document.querySelector(targets)) {
          gsap.set(targets, vars);
        }
      } else if (Array.isArray(targets)) {
        const valid = targets.filter(t => {
          if (!t) return false;
          if (typeof t === 'string') return document.querySelector(t) !== null;
          return true;
        });
        if (valid.length > 0) {
          gsap.set(valid, vars);
        }
      } else {
        gsap.set(targets, vars);
      }
    };

    if (mediaQuery.matches) {
      safeSet([
        headerEl,
        `.${styles.eyebrowText}`,
        `.${styles.headingLine}`,
        `.${styles.editorialDesc}`,
        `.${styles.featureRow}`,
        `.${styles.exploreTextLink}`,
        `.${styles.rightMapCol}`,
        '.map-header-overlay',
        '.map-legend-overlay',
        '.map-right-overlay',
        '.map-team-overlay',
        '.parallax-back',
        '.radar-eyebrow',
        `.${styles.radarHeadingLine}`,
        '.radar-description',
        '.radar-card-container',
        '.sos-eyebrow',
        `.${styles.sosHeadingLine}`,
        '.sos-description',
        '.sos-reassurance-item',
        '.sos-form-card-container'
      ], { opacity: 1, y: 0, scale: 1 });
      return;
    }

    // Set initial states for elements
    if (headerEl) {
      safeSet(headerEl, { opacity: 0, y: -8 });
    }
    safeSet('.parallax-back', { opacity: 0, y: 0 });
    safeSet(`.${styles.eyebrowText}`, { opacity: 0, y: 12 });
    safeSet(`.${styles.headingLine}`, { opacity: 0, y: '105%' });
    safeSet(`.${styles.editorialDesc}`, { opacity: 0, y: 14 });
    safeSet(`.${styles.featureRow}`, { opacity: 0, y: 14 });

    // Telemetry section initial states
    safeSet('.radar-eyebrow', { opacity: 0, y: 15 });
    safeSet(`.${styles.radarHeadingLine}`, { opacity: 0, y: '105%' });
    safeSet('.radar-description', { opacity: 0, y: 16 });
    safeSet('.radar-card-container', { opacity: 0, y: 35 });

    // SOS section initial states
    safeSet('.sos-eyebrow', { opacity: 0, y: 15 });
    safeSet(`.${styles.sosHeadingLine}`, { opacity: 0, y: '105%' });
    safeSet('.sos-description', { opacity: 0, y: 16 });
    safeSet('.sos-reassurance-item', { opacity: 0, y: 12 });
    safeSet('.sos-form-card-container', { opacity: 0, y: 24 });

    // Hero element initial states
    safeSet(`.${styles.heroCta}`, { opacity: 0, y: 10 });
    safeSet(`.${styles.heroCapabilityRail}`, { opacity: 0, y: 12 });

    safeSet(`.${styles.rightMapCol}`, { opacity: 0, y: 22, scale: 0.985 });

    const runAnimations = () => {
      return gsap.context(() => {
      const tl = gsap.timeline({ delay: 0.1 });

      // 1. Navigation bar enters first
      if (headerEl) {
        tl.to(headerEl, {
          opacity: 1,
          y: 0,
          duration: 0.55,
          ease: 'power2.out'
        });
      }

      // 2. Eyebrow Text enters
      tl.to(`.${styles.eyebrowText}`, {
        opacity: 1,
        y: 0,
        duration: 0.5,
        ease: 'power2.out'
      }, '-=0.4');

      // Reveal watermark in back
      tl.to('.parallax-back', {
        opacity: 0.05,
        duration: 0.6,
        ease: 'power2.out'
      }, '-=0.4');

      // 3. Main Headline rise-up reveals line-by-line
      const headingLines = gsap.utils.toArray(`.${styles.headingLine}`);
      if (headingLines.length >= 2) {
        tl.to(headingLines[0] as any, {
          opacity: 1,
          y: '0%',
          duration: 0.95,
          ease: 'power3.out'
        }, '-=0.35');

        tl.to(headingLines[1] as any, {
          opacity: 1,
          y: '0%',
          duration: 0.95,
          ease: 'power3.out'
        }, '-=0.85');
      }

      // 4. Description support text reveal
      tl.to(`.${styles.editorialDesc}`, {
        opacity: 1,
        y: 0,
        duration: 0.6,
        ease: 'power2.out'
      }, '-=0.55');

      // 5. Map panel reveal
      tl.to(`.${styles.rightMapCol}`, {
        opacity: 1,
        y: 0,
        scale: 1,
        duration: 1.0,
        ease: 'power3.out'
      }, '-=1.2');

      // 6. CTA reveal
      tl.to(`.${styles.heroCta}`, {
        opacity: 1,
        y: 0,
        duration: 0.5,
        ease: 'power2.out'
      }, '-=0.45');

      // 7. Capability rail reveal
      tl.to(`.${styles.heroCapabilityRail}`, {
        opacity: 1,
        y: 0,
        duration: 0.6,
        ease: 'power2.out'
      }, '-=0.3');

      // 9. Parallax scroll-driven depth triggers (Level 2 Ambient / interaction motion)
      gsap.to('.parallax-back', {
        y: -90,
        scrollTrigger: {
          trigger: `.${styles.parallaxHeaderContainer}`,
          start: 'top 25%',
          end: 'bottom top',
          scrub: true
        }
      });
      gsap.to('.parallax-mid', {
        y: -40,
        scrollTrigger: {
          trigger: `.${styles.parallaxHeaderContainer}`,
          start: 'top 25%',
          end: 'bottom top',
          scrub: true
        }
      });
      gsap.to('.parallax-front', {
        y: -20,
        scrollTrigger: {
          trigger: `.${styles.parallaxHeaderContainer}`,
          start: 'top 25%',
          end: 'bottom top',
          scrub: true
        }
      });

      // 10. SAKSHAM ECOSYSTEM (Section A) reveals
      gsap.fromTo(`.${styles.networkFlowSection} .${styles.sectionSub}`,
        { opacity: 0, y: 20 },
        {
          opacity: 1,
          y: 0,
          scrollTrigger: {
            trigger: `.${styles.networkFlowSection}`,
            start: 'top 80%',
            once: true
          }
        }
      );

      gsap.fromTo(`.${styles.networkFlowSection} .${styles.sectionTitle}`,
        { opacity: 0, y: 40 },
        {
          opacity: 1,
          y: 0,
          scrollTrigger: {
            trigger: `.${styles.networkFlowSection}`,
            start: 'top 75%',
            once: true
          }
        }
      );

      gsap.fromTo(`.${styles.networkFlowSection} .${styles.sectionDesc}`,
        { opacity: 0, y: 16 },
        {
          opacity: 1,
          y: 0,
          scrollTrigger: {
            trigger: `.${styles.networkFlowSection}`,
            start: 'top 70%',
            once: true
          }
        }
      );

      // Ecosystem Sequential diagram activation (scrubbed)
      const nodes = gsap.utils.toArray(`.${styles.networkDiagram} .${styles.diagramNode}`);
      const diagramLines = gsap.utils.toArray(`.${styles.networkDiagram} .${styles.diagramLine}`);
      const isMobile = window.innerWidth <= 768;

      gsap.set(nodes, { opacity: 0.35 });
      gsap.set(diagramLines.map((l: any) => l.querySelector(`.${styles.diagramLineInner}`)), {
        scaleX: isMobile ? 1 : 0,
        scaleY: isMobile ? 0 : 1,
        transformOrigin: isMobile ? 'top' : 'left'
      });

      const ecosystemTl = gsap.timeline({
        scrollTrigger: {
          trigger: `.${styles.networkDiagram}`,
          start: 'top 75%',
          end: 'bottom 45%',
          scrub: 0.5
        }
      });

      ecosystemTl
        .to(nodes[0] as any, { opacity: 1, duration: 0.2 })
        .to((nodes[0] as any).querySelector(`.${styles.nodeIcon}`), { scale: 1.08, borderColor: '#F47C20', color: '#F47C20', duration: 0.2 }, '-=0.2')
        .set((diagramLines[0] as any).querySelector(`.${styles.diagramLineSignal}`), { opacity: 1 })
        .to((diagramLines[0] as any).querySelector(`.${styles.diagramLineInner}`), { scaleX: 1, scaleY: 1, duration: 0.4 })
        .to((diagramLines[0] as any).querySelector(`.${styles.diagramLineSignal}`), {
          left: isMobile ? '50%' : '100%',
          top: isMobile ? '100%' : '50%',
          duration: 0.4,
          ease: 'power1.inOut'
        }, '-=0.4')
        .set((diagramLines[0] as any).querySelector(`.${styles.diagramLineSignal}`), { opacity: 0 })

        .to(nodes[1] as any, { opacity: 1, duration: 0.2 })
        .to((nodes[1] as any).querySelector(`.${styles.nodeIcon}`), { scale: 1.08, borderColor: '#F47C20', color: '#F47C20', duration: 0.2 }, '-=0.2')
        .set((diagramLines[1] as any).querySelector(`.${styles.diagramLineSignal}`), { opacity: 1 })
        .to((diagramLines[1] as any).querySelector(`.${styles.diagramLineInner}`), { scaleX: 1, scaleY: 1, duration: 0.4 })
        .to((diagramLines[1] as any).querySelector(`.${styles.diagramLineSignal}`), {
          left: isMobile ? '50%' : '100%',
          top: isMobile ? '100%' : '50%',
          duration: 0.4,
          ease: 'power1.inOut'
        }, '-=0.4')
        .set((diagramLines[1] as any).querySelector(`.${styles.diagramLineSignal}`), { opacity: 0 })

        .to(nodes[2] as any, { opacity: 1, duration: 0.2 })
        .to((nodes[2] as any).querySelector(`.${styles.nodeIcon}`), { scale: 1.08, borderColor: '#F47C20', color: '#F47C20', duration: 0.2 }, '-=0.2')
        .set((diagramLines[2] as any).querySelector(`.${styles.diagramLineSignal}`), { opacity: 1 })
        .to((diagramLines[2] as any).querySelector(`.${styles.diagramLineInner}`), { scaleX: 1, scaleY: 1, duration: 0.4 })
        .to((diagramLines[2] as any).querySelector(`.${styles.diagramLineSignal}`), {
          left: isMobile ? '50%' : '100%',
          top: isMobile ? '100%' : '50%',
          duration: 0.4,
          ease: 'power1.inOut'
        }, '-=0.4')
        .set((diagramLines[2] as any).querySelector(`.${styles.diagramLineSignal}`), { opacity: 0 })

        .to(nodes[3] as any, { opacity: 1, duration: 0.2 })
        .to((nodes[3] as any).querySelector(`.${styles.nodeIcon}`), { scale: 1.08, borderColor: '#F47C20', color: '#F47C20', duration: 0.2 }, '-=0.2');


      // 11. OPERATIONAL RUNTIME (Section B) reveals
      gsap.fromTo(`.${styles.workflowSection} .${styles.sectionSub}`,
        { opacity: 0, y: 20 },
        {
          opacity: 1,
          y: 0,
          scrollTrigger: {
            trigger: `.${styles.workflowSection}`,
            start: 'top 80%',
            once: true
          }
        }
      );
      gsap.fromTo(`.${styles.workflowSection} .${styles.sectionTitle}`,
        { opacity: 0, y: 40 },
        {
          opacity: 1,
          y: 0,
          scrollTrigger: {
            trigger: `.${styles.workflowSection}`,
            start: 'top 75%',
            once: true
          }
        }
      );

      // Staggered card entry
      const stepCards = gsap.utils.toArray(`.${styles.stepsGrid} .${styles.stepCard}`);
      gsap.fromTo(stepCards,
        { opacity: 0, y: 35, scale: 0.985 },
        {
          opacity: 0.65, // starts at slightly muted opacity as planned
          y: 0,
          scale: 1,
          duration: 0.85,
          stagger: 0.12,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: `.${styles.stepsGrid}`,
            start: 'top 78%',
            once: true
          }
        }
      );

      // Active card viewport focus observer
      stepCards.forEach((card: any) => {
        ScrollTrigger.create({
          trigger: card,
          start: 'top 55%',
          end: 'bottom 45%',
          onEnter: () => card.classList.add(styles.stepCardActive),
          onLeave: () => card.classList.remove(styles.stepCardActive),
          onEnterBack: () => card.classList.add(styles.stepCardActive),
          onLeaveBack: () => card.classList.remove(styles.stepCardActive),
        });
      });

      // 12. Telemetry Radar Section (Building Resilient Communities) entrance
      const radarTl = gsap.timeline({
        scrollTrigger: {
          trigger: '#telemetry-radar',
          start: 'top 75%',
          once: true
        }
      });

      radarTl
        .to('.radar-eyebrow', { opacity: 1, y: 0, duration: 0.55, ease: 'power2.out' })

        .to(gsap.utils.toArray(`.${styles.radarHeadingLine}`) as any[], {
          opacity: 1,
          y: 0,
          duration: 0.9,
          stagger: 0.12,
          ease: 'power3.out'
        }, '-=0.35')

        .to('.radar-description', { opacity: 1, y: 0, duration: 0.6, ease: 'power2.out' }, '-=0.55')
        .to('.radar-card-container', { opacity: 1, y: 0, duration: 0.75, ease: 'power3.out' }, '-=0.45');



      // 13. Civilian SOS Section (Section 6) entrance
      const sosTl = gsap.timeline({
        scrollTrigger: {
          trigger: '#sos-section',
          start: 'top 78%',
          once: true
        }
      });

      sosTl
        .to('.sos-eyebrow', { opacity: 1, y: 0, duration: 0.55, ease: 'power2.out' })

        .to(gsap.utils.toArray(`.${styles.sosHeadingLine}`) as any[], {
          opacity: 1,
          y: 0,
          duration: 0.9,
          stagger: 0.12,
          ease: 'power3.out'
        }, '-=0.35')

        .to('.sos-description', { opacity: 1, y: 0, duration: 0.55, ease: 'power2.out' }, '-=0.55')

        .to(gsap.utils.toArray('.sos-reassurance-item') as any[], {
          opacity: 1,
          y: 0,
          duration: 0.5,
          stagger: 0.14,
          ease: 'power2.out'
        }, '-=0.35')

        .to('.sos-form-card-container', { opacity: 1, y: 0, duration: 0.75, ease: 'power3.out' }, '-=0.55');



      // Premium Layered Stacking Scroll System (non-destructive local sticky animations)
      // Apply only to desktop/large tablet screens to ensure mobile/touch scroll accessibility
      if (window.innerWidth > 768) {
        const layers = gsap.utils.toArray(`.${styles.stackedLayer}`) as HTMLElement[];
        layers.forEach((layer, i) => {
          layer.style.zIndex = `${(i + 1) * 10}`;
        });
      }

    }, landingRef);
    };

    const delayTime = 200; // short settle delay after boot screen ends
    let timeoutId: ReturnType<typeof setTimeout>;

    const startAnimations = () => {
      timeoutId = setTimeout(() => {
        runAnimations();
      }, delayTime);
    };

    // If boot has already completed (e.g. navigated back), run immediately
    // Otherwise, wait for the boot complete event fired by App.tsx
    const bootAlreadyDone = !document.querySelector('[data-boot-active]');
    if (bootAlreadyDone) {
      startAnimations();
    } else {
      window.addEventListener('saksham_boot_complete', startAnimations, { once: true });
      // Fallback: if event never fires within 14s, animate anyway
      timeoutId = setTimeout(() => {
        runAnimations();
      }, 14500);
    }

    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('saksham_boot_complete', startAnimations);
    };
  }, []);

  // Get dynamic numbers for later stats strip
  const activeIncidentsCount = incidents.filter(inc => inc.status !== 'RESOLVED').length;
  const dispatchedVehiclesCount = vehicles.filter(v => v.status === 'EN_ROUTE').length;
  const openSheltersCount = shelters.filter(s => s.status === 'OPEN').length;

  return (
    <div ref={landingRef} className={styles.landingPage}>
      {/* 1. HOMEPAGE HERO — "See everything. Respond anywhere." with Live MapLibre Map */}
      <section id="features" className={`${styles.heroSection} ${styles.heroSectionDark} ${styles.stackedLayer}`}>
        {/* Animated noisy gradient background — SAKSHAM dark forest → burnt-orange palette */}
        <GradientBackground
          gradientType="radial-gradient"
          gradientSize="140% 140%"
          gradientOrigin="bottom-right"
          colors={[
            { color: 'rgba(10, 24, 18, 1)', stop: '0%' },
            { color: 'rgba(14, 35, 26, 1)', stop: '22%' },
            { color: 'rgba(18, 50, 36, 1)', stop: '42%' },
            { color: 'rgba(120, 55, 10, 1)', stop: '64%' },
            { color: 'rgba(180, 80, 15, 1)', stop: '80%' },
            { color: 'rgba(215, 101, 16, 1)', stop: '91%' },
            { color: 'rgba(244, 124, 32, 1)', stop: '100%' },
          ]}
          noisePatternAlpha={22}
          noiseIntensity={0.55}
          noisePatternRefreshInterval={2}
          noisePatternSize={90}
        />
        <div className={styles.sectionContainer}>
          <div className={styles.editorialGrid}>

            {/* Left Content Column */}
            <div className={styles.leftContentCol}>
              <div className={styles.parallaxHeaderContainer}>
                {/* Back Layer Watermark */}
                <h3 className={`${styles.parallaxBackWatermark} ${styles.parallaxBackWatermarkDark} parallax-back`}>RESPONSE</h3>

                {/* Eyebrow row */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap', marginBottom: '8px', position: 'relative', zIndex: 20 }} className="parallax-front">
                  <span className={styles.eyebrowText} style={{ marginBottom: 0 }}>
                    <span className={styles.eyebrowDot} />● {t('landing.liveSituationalAwareness')}
                  </span>
                  <LanguageSwitcher variant="navbar" />
                </div>

                {/* Main editorial headline */}
                <h1 className={`${styles.editorialHeading} parallax-mid`}>
                  <span className={styles.headingLineMask}>
                    <span className={styles.headingLine} style={{ color: '#FAF8F3' }}>
                      {t('landing.heroTitleLine1')}
                    </span>
                  </span>
                  <span className={styles.headingLineMask}>
                    <span className={`${styles.headingLine} ${styles.accentOrangeText}`}>
                      {t('landing.heroTitleLine2')}
                    </span>
                  </span>
                </h1>
              </div>

              <p className={`${styles.editorialDesc} ${styles.editorialDescDark}`}>
                {t('landing.heroDesc')}
              </p>

              {/* Redesigned Response Chain Component */}
              <div className={styles.responseChainContainer}>
                <div className={styles.responseChain}>

                  {/* Stage 1: SIGNAL */}
                  <div className={`${styles.chainStage} ${activeStage === 0 ? styles.stageActive : ''} ${styles.stageSignal}`}>
                    <div className={styles.stageIndicator} />
                    <div className={styles.stageContent}>
                      <span className={styles.stageNumber}>01</span>
                      <span className={styles.stageLabel}>{t('landing.stage1Label')}</span>
                      <p className={styles.stageDesc}>{t('landing.stage1Desc')}</p>
                    </div>
                  </div>

                  <div className={styles.chainConnector}>
                    <div className={`${styles.connectorLine} ${styles.lineSignalToAssess}`} style={{ transform: activeStage >= 1 ? 'scale(1)' : 'scale(0)' }} />
                  </div>

                  {/* Stage 2: ASSESS */}
                  <div className={`${styles.chainStage} ${activeStage === 1 ? styles.stageActive : ''} ${styles.stageAssess}`}>
                    <div className={styles.stageIndicator} />
                    <div className={styles.stageContent}>
                      <span className={styles.stageNumber}>02</span>
                      <span className={styles.stageLabel}>{t('landing.stage2Label')}</span>
                      <p className={styles.stageDesc}>{t('landing.stage2Desc')}</p>
                    </div>
                  </div>

                  <div className={styles.chainConnector}>
                    <div className={`${styles.connectorLine} ${styles.lineAssessToMatch}`} style={{ transform: activeStage >= 2 ? 'scale(1)' : 'scale(0)' }} />
                  </div>

                  {/* Stage 3: MATCH */}
                  <div className={`${styles.chainStage} ${activeStage === 2 ? styles.stageActive : ''} ${styles.stageMatch}`}>
                    <div className={styles.stageIndicator} />
                    <div className={styles.stageContent}>
                      <span className={styles.stageNumber}>03</span>
                      <span className={styles.stageLabel}>{t('landing.stage3Label')}</span>
                      <p className={styles.stageDesc}>{t('landing.stage3Desc')}</p>
                    </div>
                  </div>

                  <div className={styles.chainConnector}>
                    <div className={`${styles.connectorLine} ${styles.lineMatchToAct}`} style={{ transform: activeStage >= 3 ? 'scale(1)' : 'scale(0)' }} />
                  </div>

                  {/* Stage 4: ACT */}
                  <div className={`${styles.chainStage} ${activeStage === 3 ? styles.stageActive : ''} ${styles.stageAct}`}>
                    <div className={styles.stageIndicator} />
                    <div className={styles.stageContent}>
                      <span className={styles.stageNumber}>04</span>
                      <span className={styles.stageLabel}>{t('landing.stage4Label')}</span>
                      <p className={styles.stageDesc}>{t('landing.stage4Desc')}</p>
                    </div>
                  </div>

                </div>
              </div>

              {/* Visually subordinated guidebook link */}
              <div className={styles.guidebookWrapper}>
                <button
                  onClick={() => {
                    const guideEl = document.getElementById('page-guidebook');
                    if (guideEl) {
                      guideEl.scrollIntoView({ behavior: 'smooth' });
                    }
                  }}
                  className={styles.subordinatedGuideLink}
                  aria-label="Scroll to Situational Awareness Guidebook"
                >
                  <span className={styles.guideInfoIcon}>ⓘ</span>
                  <span>{t('landing.guidebookLink')}</span>
                </button>
              </div>
            </div>

            {/* Right Column — Real-time incident map with living annotation */}
            <div className={styles.rightMapCol}>
              {/* The existing real-time map — unchanged */}
              <SituationalAwarenessMap />

              {/* Living annotation overlay — sits above the map, below the map's own overlays */}
              <div className={styles.mapAnnotationOverlay} aria-hidden="true">
                <div className={`${styles.annotationBadge} ${mapPhase === 'INCIDENT' ? styles.annotationBadgeAlert :
                  mapPhase === 'PRIORITY' ? styles.annotationBadgePriority :
                    mapPhase === 'RESPONSE' ? styles.annotationBadgeResponse :
                      styles.annotationBadgeMonitor
                  }`}>
                  <span className={styles.annotationDot} />
                  <span className={styles.annotationText}>
                    {mapPhase === 'MONITOR' && t('common.loading').toUpperCase()}
                    {mapPhase === 'INCIDENT' && t('realtimeToasts.incidentReported', { title: '' }).replace(': ', '').toUpperCase()}
                    {mapPhase === 'PRIORITY' && t('status.PRIORITIZED').toUpperCase()}
                    {mapPhase === 'RESPONSE' && t('status.UNDER_RESPONSE').toUpperCase()}
                    {mapPhase === 'RETURN' && t('dashboard.liveStatus').toUpperCase()}
                  </span>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* 2. ONE RESPONSE NETWORK. EVERYTHING CONNECTED. */}
      <section id="network-flow" className={`${styles.networkFlowSection} textureCream ${styles.stackedLayer}`}>
        {/* Large smooth shallow curved top edge rising into the hero */}
        <svg className={styles.heroCurveSvg} viewBox="0 0 1000 100" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M 0 100 C 300 0, 700 0, 1000 100 Z" />
        </svg>

        <div className={styles.networkFlowContent}>
          <div className={styles.networkHeader}>
            <span className={styles.sectionSub}>{t('landing.ecoEyebrow')}</span>
            <h2 className={styles.sectionTitle}>{t('landing.ecoTitle')}</h2>
            <p className={styles.sectionDesc}>
              {t('landing.ecoDesc')}
            </p>
          </div>

          <div className={styles.networkDiagram}>
            <div className={styles.diagramNode}>
              <div className={styles.nodeIcon}><ShieldAlert size={20} /></div>
              <span>{t('landing.nodeIncidents')}</span>
            </div>
            <div className={styles.diagramLine}>
              <div className={styles.diagramLineInner} />
              <div className={styles.diagramLineSignal} />
            </div>
            <div className={styles.diagramNode}>
              <div className={styles.nodeIcon}><Layers size={20} /></div>
              <span>{t('landing.nodeDemand')}</span>
            </div>
            <div className={styles.diagramLine}>
              <div className={styles.diagramLineInner} />
              <div className={styles.diagramLineSignal} />
            </div>
            <div className={styles.diagramNode}>
              <div className={styles.nodeIcon}><Link2 size={20} /></div>
              <span>{t('landing.nodeResources')}</span>
            </div>
            <div className={styles.diagramLine}>
              <div className={styles.diagramLineInner} />
              <div className={styles.diagramLineSignal} />
            </div>
            <div className={styles.diagramNode}>
              <div className={styles.nodeIcon}><Truck size={20} /></div>
              <span>{t('landing.nodeRoutes')}</span>
            </div>
          </div>
        </div>
      </section>

      {/* 3. FROM DISTRESS TO RELIEF IN SIX STEPS */}
      <section id="how-it-works" className={`${styles.workflowSection} textureCream ${styles.stackedLayer}`}>
        <div className={styles.sectionContainer}>
          <div className={styles.networkHeader}>
            <span className={styles.sectionSub}>{t('landing.workflowEyebrow')}</span>
            <h2 className={styles.sectionTitle}>{t('landing.workflowTitle')}</h2>
          </div>

          <div className={styles.stepsGrid}>
            <div className={styles.stepCard}>
              <div className={styles.stepNum}>01</div>
              <h4>{t('landing.step1Title')}</h4>
              <p>{t('landing.step1Desc')}</p>
            </div>
            <div className={styles.stepCard}>
              <div className={styles.stepNum}>02</div>
              <h4>{t('landing.step2Title')}</h4>
              <p>{t('landing.step2Desc')}</p>
            </div>
            <div className={styles.stepCard}>
              <div className={styles.stepNum}>03</div>
              <h4>{t('landing.step3Title')}</h4>
              <p>{t('landing.step3Desc')}</p>
            </div>
            <div className={styles.stepCard}>
              <div className={styles.stepNum}>04</div>
              <h4>{t('landing.step4Title')}</h4>
              <p>{t('landing.step4Desc')}</p>
            </div>
            <div className={styles.stepCard}>
              <div className={styles.stepNum}>05</div>
              <h4>{t('landing.step5Title')}</h4>
              <p>{t('landing.step5Desc')}</p>
            </div>
            <div className={styles.stepCard}>
              <div className={styles.stepNum}>06</div>
              <h4>{t('landing.step6Title')}</h4>
              <p>{t('landing.step6Desc')}</p>
            </div>
          </div>
        </div>
      </section>

      {/* 4. OLD TELEMETRY / RADAR CONCEPT (Reused lower down as supporting section) */}
      <section id="telemetry-radar" className={`${styles.radarSection} textureForest ${styles.stackedLayer}`} style={{ position: 'relative', overflow: 'hidden' }}>
        <ShaderBackground className="absolute inset-0" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 0 }} />
        <div className={styles.heroGlow} />

        {/* Background routing curves & coordinate geometry (3-6% opacity) */}
        <svg className={styles.radarBgGeometry} viewBox="0 0 1000 500" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="150" cy="180" r="3" fill="#FAF8F3" opacity="0.12" />
          <circle cx="850" cy="320" r="3" fill="#FAF8F3" opacity="0.12" />
          <path d="M 150,180 Q 500,120 850,320" stroke="rgba(250, 248, 243, 0.05)" strokeWidth="1" fill="none" strokeDasharray="5 5" />
          <path d="M 220,410 Q 480,260 780,180" stroke="rgba(250, 248, 243, 0.03)" strokeWidth="1" fill="none" />
          <path d="M 80,100 L 920,400" stroke="rgba(250, 248, 243, 0.02)" strokeWidth="0.8" fill="none" />
        </svg>

        <div className={styles.sectionContainer}>
          <div className={styles.radarLayoutGrid}>
            <div className={styles.radarText}>
              <span className={`${styles.badgeText} radar-eyebrow`}>{t('landing.radarEyebrow')}</span>
              <h2 className={styles.radarHeading}>
                <span className={styles.radarHeadingLineMask}>
                  <span className={`${styles.radarHeadingLine} reveal-block`} data-reveal-color="#F47C20">{t('landing.radarTitleLine1')}</span>
                </span>
                <span className={styles.radarHeadingLineMask}>
                  <span className={`${styles.radarHeadingLine} reveal-block`} data-reveal-color="#F47C20">{t('landing.radarTitleLine2')}</span>
                </span>
              </h2>
              <p className={`${styles.radarDesc} radar-description`}>
                {t('landing.radarDesc')}
              </p>
            </div>

            <div className={`${styles.radarCardWrapper} radar-card-container`}>
              {/* Backing layer for visual depth */}
              <div className={styles.radarCardBacking} />

              <div className={`${styles.radarCard} textureDark`}>
                <div className={styles.radarHeader}>
                  <div className={styles.liveIndicator}>
                    <span className={styles.liveDot} />
                    <span>{t('landing.radarScopeTitle')}</span>
                  </div>
                  <span className={styles.techText}>{t('landing.radarScopeNode')}</span>
                </div>
                <div className={styles.radarBody}>
                  <div className={styles.radarScope}>
                    <div className={styles.radarCircle} />
                    <div className={styles.radarCircle} />
                    <div className={styles.radarCircle} />
                    <div className={styles.radarCircle} />
                    <div className={styles.radarSweep} />

                    {/* SVG lines for network connections */}
                    <svg className={styles.radarNodeConnections} viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
                      <line x1="84" y1="70" x2="140" y2="120" stroke="rgba(250, 248, 243, 0.08)" strokeWidth="0.8" strokeDasharray="3 3" />
                      <line x1="84" y1="70" x2="50" y2="100" stroke="rgba(250, 248, 243, 0.08)" strokeWidth="0.8" strokeDasharray="3 3" />
                      <line x1="140" y1="120" x2="136" y2="50" stroke="rgba(250, 248, 243, 0.08)" strokeWidth="0.8" strokeDasharray="3 3" />
                    </svg>

                    {/* Micro Telemetry metadata */}
                    <span className={`${styles.radarMicroText} tech-code`} style={{ top: '8px', left: '10px' }}>LAT 28.61</span>
                    <span className={`${styles.radarMicroText} tech-code`} style={{ bottom: '8px', right: '10px' }}>LON 77.21</span>
                    <span className={`${styles.radarMicroText} tech-code`} style={{ bottom: '8px', left: '10px' }}>SYNC 98.4%</span>

                    <div className={`${styles.radarPin} ${styles.pinCritical}`} style={{ top: '35%', left: '42%' }}>
                      <div className={styles.pinGlow} />
                    </div>
                    <div className={`${styles.radarPin} ${styles.pinWarning}`} style={{ top: '60%', left: '70%' }}>
                      <div className={styles.pinGlow} />
                    </div>
                    <div className={`${styles.radarPin} ${styles.pinShelter}`} style={{ top: '25%', left: '68%' }}>
                      <div className={styles.pinGlow} />
                    </div>
                    <div className={`${styles.radarPin} ${styles.pinVehicle}`} style={{ top: '50%', left: '25%' }}>
                      <div className={styles.pinGlow} />
                    </div>
                  </div>

                  <div className={styles.radarMetrics}>
                    <div className={styles.metricRow}>
                      <span>Active Threats</span>
                      <strong className={`${styles.textCritical} tech-code`}>{String(activeIncidentsCount).padStart(2, '0')} Urgent</strong>
                    </div>
                    <div className={styles.metricRow}>
                      <span>Logistics Fleet</span>
                      <strong className={`${styles.textPrimary} tech-code`}>{String(dispatchedVehiclesCount || 6).padStart(2, '0')} Dispatched</strong>
                    </div>
                    <div className={styles.metricRow}>
                      <span>Shelter Network</span>
                      <strong className={`${styles.textSuccess} tech-code`}>{openSheltersCount ? 'Active' : '82%'} Capacity</strong>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. IMPACT & LIVE NETWORK STRIP */}
      <section id="metrics" className={`${styles.metricsSection} textureCream ${styles.stackedLayer}`}>
        <div className={styles.sectionContainer}>
          {/* Moved stats strip here */}
          <div className={styles.indicatorBar}>
            <div className={styles.indicatorItem}>
              <span className={styles.indLabel}>{t('landing.metricsActiveIncidents')}</span>
              <span className={`${styles.indVal} ${styles.textCritical} tech-code`}>{String(activeIncidentsCount).padStart(2, '0')}</span>
            </div>
            <div className={styles.indicatorDivider} />
            <div className={styles.indicatorItem}>
              <span className={styles.indLabel}>{t('landing.metricsDepotsStatus')}</span>
              <span className={`${styles.indVal} ${styles.textSuccess} tech-code`}>{t('common.active').toUpperCase()}</span>
            </div>
            <div className={styles.indicatorDivider} />
            <div className={styles.indicatorItem}>
              <span className={styles.indLabel}>{t('landing.metricsVehiclesMission')}</span>
              <span className={`${styles.indVal} ${styles.textPrimary} tech-code`}>{String(dispatchedVehiclesCount || 6).padStart(2, '0')}</span>
            </div>
            <div className={styles.indicatorDivider} />
            <div className={styles.indicatorItem}>
              <span className={styles.indLabel}>{t('landing.metricsSheltersAvailable')}</span>
              <span className={`${styles.indVal} tech-code`}>354</span>
            </div>
          </div>

          <div className={styles.metricsGrid}>
            <div className={styles.metricCard}>
              <div className={styles.metricValue}>12m</div>
              <h4>{t('landing.metricCard1Title')}</h4>
              <p>{t('landing.metricCard1Desc')}</p>
            </div>
            <div className={styles.metricCard}>
              <div className={styles.metricValue}>99%</div>
              <h4>{t('landing.metricCard2Title')}</h4>
              <p>{t('landing.metricCard2Desc')}</p>
            </div>
            <div className={styles.metricCard}>
              <div className={styles.metricValue}>15k+</div>
              <h4>{t('landing.metricCard3Title')}</h4>
              <p>{t('landing.metricCard3Desc')}</p>
            </div>
          </div>
        </div>
      </section>

      {/* 6. CIVILIAN SUPPORT EMERGENCY PORTAL */}
      <section id="sos-section" className={`${styles.sosSection} textureForest ${styles.stackedLayer}`} style={{ position: 'relative', overflow: 'hidden' }}>
        <ShaderBackground className="absolute inset-0" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 0 }} />
        <div className={styles.sosGlow} />

        {/* Subtle background coordinate lines & grid geometry */}
        <svg className={styles.sosBgGeometry} viewBox="0 0 1000 500" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="250" cy="120" r="3" fill="#FAF8F3" opacity="0.1" />
          <circle cx="750" cy="380" r="3" fill="#FAF8F3" opacity="0.1" />
          <path d="M 250,120 L 750,380" stroke="rgba(250, 248, 243, 0.04)" strokeWidth="0.8" fill="none" strokeDasharray="3 3" />
          <path d="M 120,430 C 350,350 650,450 880,150" stroke="rgba(250, 248, 243, 0.03)" strokeWidth="1" fill="none" />
        </svg>

        <div className={styles.sectionContainer}>
          <div className={styles.sosGrid}>
            <div className={styles.sosContent}>
              <span className={`${styles.sectionSub} sos-eyebrow`}>{t('landing.sosEyebrow')}</span>
              <h2 className={styles.sectionTitle}>
                <span className={styles.sosHeadingLineMask}>
                  <span className={`${styles.sosHeadingLine} reveal-block`} data-reveal-color="#F47C20">{t('landing.sosTitleLine1')}</span>
                </span>
                <span className={styles.sosHeadingLineMask}>
                  <span className={`${styles.sosHeadingLine} reveal-block`} data-reveal-color="#F47C20">{t('landing.sosTitleLine2')}</span>
                </span>
              </h2>
              <p className={`${styles.sosText} sos-description`}>
                {t('landing.sosDesc')}
              </p>
              <div className={styles.sosBenefits}>
                <div className={`${styles.sosBenefitItem} sos-reassurance-item`}>
                  <span className={styles.reassuranceBullet}>◉</span>
                  <span>{t('landing.sosBenefit1')}</span>
                </div>
                <div className={`${styles.sosBenefitItem} sos-reassurance-item`}>
                  <span className={styles.reassuranceBullet}>◉</span>
                  <span>{t('landing.sosBenefit2')}</span>
                </div>
              </div>
            </div>

            <div className="sos-form-card-container" style={{ position: 'relative', width: '100%', maxWidth: '440px', justifySelf: 'center' }}>
              {/* Decorative floating glassmorphic orbs */}
              <div className={styles.glassOrbTop} />
              <div className={styles.glassOrbBottom} />

              {/* Backing layer for visual depth */}
              <div className={styles.sosFormCardBacking} />

              <div className={`${styles.sosFormCard} textureCream`}>
                {sosSubmitted ? (
                  <div className={styles.formSuccess}>
                    <FileCheck size={48} className={styles.successIcon} />
                    <h3>{t('landing.successTitle')}</h3>
                    <p>{t('landing.successDesc')}</p>
                    <div className={styles.successBadge}>
                      <span>{t('landing.successStatusLabel')}</span>
                      <strong className={styles.textPrimary}>{t('landing.successStatusVal')}</strong>
                    </div>
                    <div className={styles.successTicket}>
                      <span>{t('landing.successIdLabel')}</span>
                      <strong>{ticketId}</strong>
                    </div>
                    <button
                      onClick={() => setSosSubmitted(false)}
                      className={styles.resetBtn}
                    >
                      {t('landing.successResetBtn')}
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleSosSubmit} className={styles.form}>
                    <div className={styles.formHeader}>
                      <div className={styles.formHeaderTitle}>
                        <span>{t('landing.formHeader')}</span>
                        <span>{t('landing.formSub')}</span>
                      </div>
                      <div className={styles.formHeaderStatus}>
                        <span className={styles.formLiveDot} />
                        <span>{t('landing.formSecure')}</span>
                      </div>
                    </div>

                    <div className={styles.formDivider} />

                    <div className={styles.formGroup}>
                      <label htmlFor="name">{t('landing.formNameLabel')}</label>
                      <input
                        id="name"
                        type="text"
                        placeholder="e.g., Rajesh Khanna"
                        value={sosForm.name}
                        onChange={(e) => setSosForm({ ...sosForm, name: e.target.value })}
                        required
                        disabled={isSubmitting}
                      />
                    </div>
                    <div className={styles.formGroup}>
                      <label htmlFor="phone">{t('landing.formPhoneLabel')}</label>
                      <input
                        id="phone"
                        type="tel"
                        placeholder="e.g., +91-98765-XXXXX"
                        value={sosForm.phone}
                        onChange={(e) => setSosForm({ ...sosForm, phone: e.target.value })}
                        required
                        disabled={isSubmitting}
                      />
                    </div>
                    <div className={styles.formGroup}>
                      <label htmlFor="need">{t('landing.formNeedLabel')}</label>
                      <div className={styles.selectWrapper}>
                        <select
                          id="need"
                          value={sosForm.need}
                          onChange={(e) => setSosForm({ ...sosForm, need: e.target.value })}
                          disabled={isSubmitting}
                        >
                          <option value="Drinking Water">Drinking Water</option>
                          <option value="Dry Ration Packets">Dry Ration Packets</option>
                          <option value="Medical Assistance">Medical Assistance</option>
                          <option value="Emergency Tents">Emergency Tents</option>
                          <option value="Rescue Boat Dispatch">Rescue Boat Dispatch</option>
                        </select>
                      </div>
                    </div>
                    <div className={styles.formGroup}>
                      <label htmlFor="details">{t('landing.formDetailsLabel')}</label>
                      <textarea
                        id="details"
                        rows={3}
                        placeholder={t('landing.formDetailsPlaceholder')}
                        value={sosForm.details}
                        onChange={(e) => setSosForm({ ...sosForm, details: e.target.value })}
                        required
                        disabled={isSubmitting}
                      />
                      <span className={styles.fieldHelper}>{t('landing.formDetailsPlaceholder')}</span>
                    </div>
                    <button type="submit" className={styles.submitBtn} disabled={isSubmitting}>
                      {isSubmitting ? (
                        <>
                          {t('common.loading')}
                          <span className={styles.buttonSpinner} />
                        </>
                      ) : (
                        <>
                          {t('landing.formSubmitBtn')}
                          <Send size={15} />
                        </>
                      )}
                    </button>
                  </form>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 7. Bottom Call-To-Action (FINAL CTA) */}
      <section className={`${styles.ctaSection} textureForest ${styles.stackedLayer}`}>
        <div className={styles.sectionContainer}>
          <div className={styles.ctaWrapper}>
            <h2>{t('landing.accessConsole')}</h2>
            <p>{t('landing.heroDesc')}</p>
            <Link to="/operations/command-center" className={styles.ctaButton}>
              {t('landing.exploreConsole')}
              <ArrowRight size={18} />
            </Link>
          </div>
        </div>
      </section>

      <PageGuidebook guideKey="home" />
    </div>
  );
};

export default Landing;
