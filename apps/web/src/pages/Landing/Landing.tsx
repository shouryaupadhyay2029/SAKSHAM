import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useOperationalState } from '../../context/OperationalStateContext';
import { SituationalAwarenessMap } from '../../components/map/SituationalAwarenessMap';

gsap.registerPlugin(ScrollTrigger);
import { 
  ShieldAlert, 
  MapPin, 
  ArrowRight, 
  Send,
  CheckCircle,
  FileCheck,
  Truck,
  CloudSun,
  BarChart3,
  Layers,
  Link2
} from 'lucide-react';
import styles from './Landing.module.css';

export const Landing: React.FC = () => {
  const { incidents, vehicles, shelters, addIncidentFromSOS } = useOperationalState();
  const [sosSubmitted, setSosSubmitted] = useState(false);
  const [ticketId, setTicketId] = useState('');
  
  const [sosForm, setSosForm] = useState({
    name: '',
    phone: '',
    zone: 'East Delhi',
    need: 'Drinking Water',
    details: ''
  });

  // State hooks for capability rail continuous surveying (motion Level 2 & 3)
  const [activeFeatureIndex, setActiveFeatureIndex] = useState(0);
  const [isFeatureHovered, setIsFeatureHovered] = useState(false);

  React.useEffect(() => {
    // Check prefers-reduced-motion to respect system options
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (mediaQuery.matches || isFeatureHovered) return;

    const interval = setInterval(() => {
      setActiveFeatureIndex(prev => (prev + 1) % 4);
    }, 8000); // Surveying capabilities every 8s

    return () => clearInterval(interval);
  }, [isFeatureHovered]);

  const handleSosSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!sosForm.name || !sosForm.phone || !sosForm.details) return;
    
    // Dispatch to global Operational State Store
    const reqId = addIncidentFromSOS({
      name: sosForm.name,
      phone: sosForm.phone,
      zone: sosForm.zone,
      need: sosForm.need,
      details: sosForm.details
    });

    setTicketId(reqId);
    setSosSubmitted(true);
    setSosForm({ name: '', phone: '', zone: 'East Delhi', need: 'Drinking Water', details: '' });
  };

  const landingRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Check prefers-reduced-motion to respect system options
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const headerEl = document.querySelector('header');

    if (mediaQuery.matches) {
      gsap.set([
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
        '.parallax-back'
      ], { opacity: 1, y: 0, scale: 1 });
      return;
    }

    // Set initial states for elements
    if (headerEl) {
      gsap.set(headerEl, { opacity: 0, y: -8 });
    }
    gsap.set('.parallax-back', { opacity: 0, y: 0 });
    gsap.set(`.${styles.eyebrowText}`, { opacity: 0, y: 12 });
    gsap.set(`.${styles.headingLine}`, { opacity: 0, y: '105%' });
    gsap.set(`.${styles.editorialDesc}`, { opacity: 0, y: 14 });
    gsap.set(`.${styles.featureRow}`, { opacity: 0, y: 14 });
    
    // Child targets inside rows
    gsap.set(`.${styles.featureRow} .${styles.featureIconContainer}`, { opacity: 0, x: -4 });
    gsap.set(`.${styles.featureRow} .${styles.featureRowText}`, { opacity: 0, y: 8 });

    gsap.set(`.${styles.exploreTextLink}`, { opacity: 0, y: 8 });
    gsap.set(`.${styles.rightMapCol}`, { opacity: 0, y: 22, scale: 0.985 });

    gsap.set([
      '.map-header-overlay',
      '.map-legend-overlay',
      '.map-right-overlay',
      '.map-team-overlay'
    ], { opacity: 0, y: 10 });

    const ctx = gsap.context(() => {
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

      // 5. Map Panel Outer reveal (starts slightly after headline starts)
      tl.to(`.${styles.rightMapCol}`, {
        opacity: 1,
        y: 0,
        scale: 1,
        duration: 1.0,
        ease: 'power3.out'
      }, '-=1.2');

      // 6. Feature Stack rows staggered entry
      const rows = gsap.utils.toArray(`.${styles.featureStack} .${styles.featureRow}`);
      rows.forEach((row: any, idx: number) => {
        const rowTl = gsap.timeline();
        rowTl.to(row, {
          opacity: 1,
          y: 0,
          duration: 0.5,
          ease: 'power2.out'
        });
        rowTl.to(row.querySelector(`.${styles.featureIconContainer}`), {
          opacity: 1,
          x: 0,
          duration: 0.4,
          ease: 'power2.out'
        }, '-=0.4');
        rowTl.to(row.querySelector(`.${styles.featureRowText}`), {
          opacity: 1,
          y: 0,
          duration: 0.4,
          ease: 'power2.out'
        }, '-=0.4');

        tl.add(rowTl, `-=${idx === 0 ? 0.35 : 0.4}`);
      });

      // 7. Map internal overlays stagger
      tl.to([
        '.map-header-overlay',
        '.map-legend-overlay',
        '.map-right-overlay',
        '.map-team-overlay'
      ], {
        opacity: 1,
        y: 0,
        duration: 0.6,
        stagger: 0.1,
        ease: 'power2.out'
      }, '-=0.75');

      // 8. Explore CTA link
      tl.to(`.${styles.exploreTextLink}`, {
        opacity: 1,
        y: 0,
        duration: 0.45,
        ease: 'power2.out'
      }, '-=0.4');

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

    }, landingRef);

    return () => ctx.revert();
  }, []);

  // Get dynamic numbers for later stats strip
  const activeIncidentsCount = incidents.filter(inc => inc.status !== 'RESOLVED').length;
  const dispatchedVehiclesCount = vehicles.filter(v => v.status === 'EN_ROUTE').length;
  const openSheltersCount = shelters.filter(s => s.status === 'OPEN').length;

  return (
    <div ref={landingRef} className={styles.landingPage}>
      {/* 1. HOMEPAGE HERO — "See everything. Respond anywhere." with Live MapLibre Map */}
      <section id="features" className={`${styles.heroSection} textureCream`}>
        <div className={styles.sectionContainer}>
          <div className={styles.editorialGrid}>
            
            {/* Left Content Column */}
            <div className={styles.leftContentCol}>
              <div className={styles.parallaxHeaderContainer}>
                {/* Back Layer Watermark (Absolute Positioned behind content) */}
                <h3 className={`${styles.parallaxBackWatermark} parallax-back`}>RESPONSE</h3>

                {/* Front Layer (Eyebrow text) */}
                <span className={`${styles.eyebrowText} parallax-front`}>
                  LIVE SITUATIONAL AWARENESS
                </span>
                
                {/* Mid Layer (Actual Heading text) */}
                <h1 className={`${styles.editorialHeading} parallax-mid`}>
                  <span className={styles.headingLineMask}>
                    <span className={styles.headingLine}>
                      See everything.
                    </span>
                  </span>
                  <span className={styles.headingLineMask}>
                    <span className={`${styles.headingLine} ${styles.accentOrangeText}`}>
                      Respond anywhere.
                    </span>
                  </span>
                </h1>
              </div>
              <p className={styles.editorialDesc}>
                Live maps, real-time feeds, and intelligent dashboards keep you ahead of every situation.
              </p>

              {/* Capability feature stack with dynamic motion overlays */}
              <div className={styles.featureStack}>
                <div 
                  className={`${styles.featureRow} ${activeFeatureIndex === 0 ? styles.featureRowActive : ''}`}
                  onMouseEnter={() => {
                    setActiveFeatureIndex(0);
                    setIsFeatureHovered(true);
                  }}
                  onMouseLeave={() => setIsFeatureHovered(false)}
                >
                  <div className={styles.featureIconContainer}>
                    <MapPin size={16} />
                  </div>
                  <div className={styles.featureRowText}>
                    <h4>REAL-TIME INCIDENT MAP</h4>
                    <p>Real-time location &amp; status</p>
                  </div>
                  <span className={styles.orangeIndicator} />
                </div>

                <div 
                  className={`${styles.featureRow} ${activeFeatureIndex === 1 ? styles.featureRowActive : ''}`}
                  onMouseEnter={() => {
                    setActiveFeatureIndex(1);
                    setIsFeatureHovered(true);
                  }}
                  onMouseLeave={() => setIsFeatureHovered(false)}
                >
                  <div className={styles.featureIconContainer}>
                    <CloudSun size={16} />
                  </div>
                  <div className={styles.featureRowText}>
                    <h4>WEATHER INTELLIGENCE</h4>
                    <p>Predictive alerts &amp; risk zones</p>
                  </div>
                  <span className={styles.orangeIndicator} />
                </div>

                <div 
                  className={`${styles.featureRow} ${activeFeatureIndex === 2 ? styles.featureRowActive : ''}`}
                  onMouseEnter={() => {
                    setActiveFeatureIndex(2);
                    setIsFeatureHovered(true);
                  }}
                  onMouseLeave={() => setIsFeatureHovered(false)}
                >
                  <div className={styles.featureIconContainer}>
                    <Truck size={16} />
                  </div>
                  <div className={styles.featureRowText}>
                    <h4>RESOURCE TRACKING</h4>
                    <p>Assets, supplies &amp; teams live</p>
                  </div>
                  <span className={styles.orangeIndicator} />
                </div>

                <div 
                  className={`${styles.featureRow} ${activeFeatureIndex === 3 ? styles.featureRowActive : ''}`}
                  onMouseEnter={() => {
                    setActiveFeatureIndex(3);
                    setIsFeatureHovered(true);
                  }}
                  onMouseLeave={() => setIsFeatureHovered(false)}
                >
                  <div className={styles.featureIconContainer}>
                    <BarChart3 size={16} />
                  </div>
                  <div className={styles.featureRowText}>
                    <h4>DECISION SUPPORT</h4>
                    <p>Data-driven insights for smarter choices</p>
                  </div>
                  <span className={styles.orangeIndicator} />
                </div>
              </div>

              {/* Explore text link */}
              <div>
                <Link to="/operations/command-center" className={styles.exploreTextLink}>
                  EXPLORE COMMAND CENTER &rarr;
                </Link>
              </div>
            </div>

            {/* Right Map Column - Dominates first viewport */}
            <div className={styles.rightMapCol}>
              <SituationalAwarenessMap />
            </div>

          </div>
        </div>
      </section>

      {/* 2. ONE RESPONSE NETWORK. EVERYTHING CONNECTED. */}
      <section id="network-flow" className={`${styles.networkFlowSection} textureCream`}>
        <div className={styles.sectionContainer}>
          <div className={styles.networkHeader}>
            <span className={styles.sectionSub}>SAKSHAM ECOSYSTEM</span>
            <h2 className={styles.sectionTitle}>One Response Network. Everything Connected.</h2>
            <p className={styles.sectionDesc}>
              SAKSHAM bridges the gap between field updates, inventory registries, and routing models to deliver speed and clarity.
            </p>
          </div>

          <div className={styles.networkDiagram}>
            <div className={styles.diagramNode}>
              <div className={styles.nodeIcon}><ShieldAlert size={20} /></div>
              <span>Incidents</span>
            </div>
            <div className={styles.diagramLine} />
            <div className={styles.diagramNode}>
              <div className={styles.nodeIcon}><Layers size={20} /></div>
              <span>Demand</span>
            </div>
            <div className={styles.diagramLine} />
            <div className={styles.diagramNode}>
              <div className={styles.nodeIcon}><Link2 size={20} /></div>
              <span>Resources</span>
            </div>
            <div className={styles.diagramLine} />
            <div className={styles.diagramNode}>
              <div className={styles.nodeIcon}><Truck size={20} /></div>
              <span>Routes</span>
            </div>
          </div>
        </div>
      </section>

      {/* 3. FROM DISTRESS TO RELIEF IN SIX STEPS */}
      <section id="how-it-works" className={`${styles.workflowSection} textureCream`}>
        <div className={styles.sectionContainer}>
          <div className={styles.networkHeader}>
            <span className={styles.sectionSub}>OPERATIONAL RUNTIME</span>
            <h2 className={styles.sectionTitle}>From Distress to Relief in Six Steps</h2>
          </div>

          <div className={styles.stepsGrid}>
            <div className={styles.stepCard}>
              <div className={styles.stepNum}>01</div>
              <h4>Incident Reported</h4>
              <p>Civilians or field officers file coordinates and urgency specs.</p>
            </div>
            <div className={styles.stepCard}>
              <div className={styles.stepNum}>02</div>
              <h4>Verified &amp; Analyzed</h4>
              <p>Central desk prioritizes incidents based on local risk values.</p>
            </div>
            <div className={styles.stepCard}>
              <div className={styles.stepNum}>03</div>
              <h4>Resources Matched</h4>
              <p>The routing engine reserves supplies from the nearest active depot.</p>
            </div>
            <div className={styles.stepCard}>
              <div className={styles.stepNum}>04</div>
              <h4>Units Deployed</h4>
              <p>Vehicles receive live GPS navigation maps to direct deliveries.</p>
            </div>
            <div className={styles.stepCard}>
              <div className={styles.stepNum}>05</div>
              <h4>On-Ground Response</h4>
              <p>Responders arrive at destination, updating status live on map.</p>
            </div>
            <div className={styles.stepCard}>
              <div className={styles.stepNum}>06</div>
              <h4>Relief Delivered</h4>
              <p>Supplies are verified as handed over, resolving the incident node.</p>
            </div>
          </div>
        </div>
      </section>

      {/* 4. OLD TELEMETRY / RADAR CONCEPT (Reused lower down as supporting section) */}
      <section id="telemetry-radar" className={`${styles.radarSection} textureForest`}>
        <div className={styles.heroGlow} />
        <div className={styles.sectionContainer}>
          <div className={styles.radarLayoutGrid}>
            <div className={styles.radarText}>
              <span className={styles.badgeText}>[ ● LIVE ] RESPONSE MATRIX</span>
              <h2 className={styles.radarHeading}>Building Resilient Communities.</h2>
              <p className={styles.radarDesc}>
                Our telemetry radar and incident routing loops coordinate relief depots and fleet deployment protocols synchronously.
              </p>
            </div>
            
            <div className={styles.radarCardWrapper}>
              <div className={`${styles.radarCard} textureDark`}>
                <div className={styles.radarHeader}>
                  <div className={styles.liveIndicator}>
                    <span className={styles.liveDot} />
                    <span>HQ LIVE TELEMETRY (DELHI)</span>
                  </div>
                  <span className={styles.techText}>NODE: DL-CP-01</span>
                </div>
                <div className={styles.radarBody}>
                  <div className={styles.radarScope}>
                    <div className={styles.radarSweep} />
                    <div className={`${styles.radarPin} ${styles.pinCritical}`} style={{ top: '35%', left: '42%' }} />
                    <div className={`${styles.radarPin} ${styles.pinWarning}`} style={{ top: '60%', left: '70%' }} />
                    <div className={`${styles.radarPin} ${styles.pinShelter}`} style={{ top: '25%', left: '68%' }} />
                    <div className={`${styles.radarPin} ${styles.pinVehicle}`} style={{ top: '50%', left: '25%' }} />
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
      <section id="metrics" className={`${styles.metricsSection} textureCream`}>
        <div className={styles.sectionContainer}>
          {/* Moved stats strip here */}
          <div className={styles.indicatorBar}>
            <div className={styles.indicatorItem}>
              <span className={styles.indLabel}>ACTIVE INCIDENTS</span>
              <span className={`${styles.indVal} ${styles.textCritical} tech-code`}>{String(activeIncidentsCount).padStart(2, '0')}</span>
            </div>
            <div className={styles.indicatorDivider} />
            <div className={styles.indicatorItem}>
              <span className={styles.indLabel}>RELIEF DEPOTS STATUS</span>
              <span className={`${styles.indVal} ${styles.textSuccess} tech-code`}>ONLINE</span>
            </div>
            <div className={styles.indicatorDivider} />
            <div className={styles.indicatorItem}>
              <span className={styles.indLabel}>VEHICLES ON-MISSION</span>
              <span className={`${styles.indVal} ${styles.textPrimary} tech-code`}>{String(dispatchedVehiclesCount || 6).padStart(2, '0')}</span>
            </div>
            <div className={styles.indicatorDivider} />
            <div className={styles.indicatorItem}>
              <span className={styles.indLabel}>SHELTER SPACES AVAIL.</span>
              <span className={`${styles.indVal} tech-code`}>354</span>
            </div>
          </div>

          <div className={styles.metricsGrid}>
            <div className={styles.metricCard}>
              <div className={styles.metricValue}>12m</div>
              <h4>Average Dispatch Time</h4>
              <p>Emergency trucks are loaded, routed, and rolling in under 12 minutes.</p>
            </div>
            <div className={styles.metricCard}>
              <div className={styles.metricValue}>99%</div>
              <h4>Demand-Supply Match</h4>
              <p>Almost zero wastage in relief materials due to coordinate-based allocations.</p>
            </div>
            <div className={styles.metricCard}>
              <div className={styles.metricValue}>15k+</div>
              <h4>Civilians Assisted</h4>
              <p>Lives supported with food, water, shelter, and active medical rescues.</p>
            </div>
          </div>
        </div>
      </section>

      {/* 6. CIVILIAN SUPPORT EMERGENCY PORTAL */}
      <section id="sos-section" className={`${styles.sosSection} textureForest`}>
        <div className={styles.sosGlow} />
        <div className={styles.sectionContainer}>
          <div className={styles.sosGrid}>
            <div className={styles.sosContent}>
              <span className={styles.sectionSub}>CIVILIAN EMERGENCY PORTAL</span>
              <h2 className={styles.sectionTitle}>Need Assistance? File an SOS Request</h2>
              <p className={styles.sosText}>
                Are you an affected civilian, NGO worker, or volunteer? Submit your zone demand immediately. SAKSHAM's matching engine pairs incoming requests with the nearest available depot.
              </p>
              <div className={styles.sosBenefits}>
                <div className={styles.sosBenefitItem}>
                  <CheckCircle size={16} className="text-emerald-300" />
                  <span>Immediate notification to Delhi NDRF Control Room</span>
                </div>
                <div className={styles.sosBenefitItem}>
                  <CheckCircle size={16} className="text-emerald-300" />
                  <span>Automated tracking ID generated on submission</span>
                </div>
              </div>
            </div>

            <div className={`${styles.sosFormCard} textureCream`}>
              {sosSubmitted ? (
                <div className={styles.formSuccess}>
                  <FileCheck size={48} className={styles.successIcon} />
                  <h3>SOS Request Registered</h3>
                  <p>Your emergency demand has been logged into the SAKSHAM Command Center. First responders have been notified.</p>
                  <div className={styles.successTicket}>
                    <span>REQUEST ID:</span>
                    <strong>{ticketId}</strong>
                  </div>
                  <button 
                    onClick={() => setSosSubmitted(false)} 
                    className={styles.resetBtn}
                  >
                    File Another Request
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSosSubmit} className={styles.form}>
                  <div className={styles.formGroup}>
                    <label htmlFor="name">Reporter Full Name</label>
                    <input 
                      id="name"
                      type="text" 
                      placeholder="e.g., Rajesh Khanna" 
                      value={sosForm.name} 
                      onChange={(e) => setSosForm({...sosForm, name: e.target.value})}
                      required
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label htmlFor="phone">Contact Number</label>
                    <input 
                      id="phone"
                      type="tel" 
                      placeholder="e.g., +91-98765-XXXXX" 
                      value={sosForm.phone} 
                      onChange={(e) => setSosForm({...sosForm, phone: e.target.value})}
                      required
                    />
                  </div>
                  <div className={styles.formRow}>
                    <div className={styles.formGroup}>
                      <label htmlFor="zone">Affected Zone</label>
                      <select 
                        id="zone"
                        value={sosForm.zone} 
                        onChange={(e) => setSosForm({...sosForm, zone: e.target.value})}
                      >
                        <option value="East Delhi">East Delhi</option>
                        <option value="West Delhi">West Delhi</option>
                        <option value="North Delhi">North Delhi</option>
                        <option value="South Delhi">South Delhi</option>
                        <option value="Central Delhi">Central Delhi</option>
                      </select>
                    </div>
                    <div className={styles.formGroup}>
                      <label htmlFor="need">Primary Need</label>
                      <select 
                        id="need"
                        value={sosForm.need} 
                        onChange={(e) => setSosForm({...sosForm, need: e.target.value})}
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
                    <label htmlFor="details">Situation Details</label>
                    <textarea 
                      id="details"
                      rows={3} 
                      placeholder="Describe the number of people affected and current safety levels..."
                      value={sosForm.details} 
                      onChange={(e) => setSosForm({...sosForm, details: e.target.value})}
                      required
                    />
                  </div>
                  <button type="submit" className={styles.submitBtn}>
                    Submit Emergency SOS
                    <Send size={15} />
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* 7. Bottom Call-To-Action (FINAL CTA) */}
      <section className={`${styles.ctaSection} textureForest`}>
        <div className={styles.sectionContainer}>
          <div className={styles.ctaWrapper}>
            <h2>Ready to Respond.</h2>
            <p>Access live GIS maps, dispatch logs, active alert filters, and coordinates registries.</p>
            <Link to="/operations/command-center" className={styles.ctaButton}>
              Go to Command Center
              <ArrowRight size={18} />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Landing;
