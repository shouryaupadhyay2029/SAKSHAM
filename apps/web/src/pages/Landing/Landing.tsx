import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { 
  ShieldAlert, 
  MapPin, 
  ArrowRight, 
  Send,
  CheckCircle,
  FileCheck,
  Layers,
  Truck
} from 'lucide-react';
import styles from './Landing.module.css';

export const Landing: React.FC = () => {
  // SOS Mock Form State
  const [sosSubmitted, setSosSubmitted] = useState(false);
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
    setSosSubmitted(true);
    setTimeout(() => {
      // Clear form after delay
      setSosForm({ name: '', phone: '', zone: 'East Delhi', need: 'Drinking Water', details: '' });
    }, 5000);
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.15 }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1, transition: { duration: 0.5 } }
  };

  return (
    <div className={styles.landingPage}>
      {/* 1. Hero Section */}
      <section className={styles.heroSection}>
        <div className={styles.heroGlow} />
        <div className={styles.heroGrid}>
          <motion.div 
            className={styles.heroContent}
            initial="hidden"
            animate="visible"
            variants={containerVariants}
          >
            <motion.div className={styles.badge} variants={itemVariants}>
              <ShieldAlert size={14} className={styles.badgeIcon} />
              <span>DISASTER RELIEF LOGISTICS PROTOCOL V2.6</span>
            </motion.div>
            
            <motion.h1 className={styles.title} variants={itemVariants}>
              Building Resilient Communities.<br />
              <span className={styles.highlightText}>Delivering Hope.</span>
            </motion.h1>
            
            <motion.p className={styles.description} variants={itemVariants}>
              Real-time resource coordination, GIS threat mapping, and automated logistics supply dispatching for responders and civilian relief when every minute counts.
            </motion.p>
            
            <motion.div className={styles.ctaGroup} variants={itemVariants}>
              <Link to="/operations/command-center" className={styles.primaryCta}>
                Get Started
                <ArrowRight size={16} />
              </Link>
              <a href="#sos-section" className={styles.secondaryCta}>
                Report an Incident
              </a>
            </motion.div>
          </motion.div>

          <motion.div 
            className={styles.heroVisual}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8 }}
          >
            {/* Visual preview card showing live logistics node */}
            <div className={styles.radarCard}>
              <div className={styles.radarHeader}>
                <div className={styles.liveIndicator}>
                  <span className={styles.liveDot} />
                  <span>HQ LIVE RADAR (DELHI)</span>
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
                    <span>Active Incidents</span>
                    <strong className={styles.textCritical}>5 Critical</strong>
                  </div>
                  <div className={styles.metricRow}>
                    <span>Response Vehicles</span>
                    <strong className={styles.textPrimary}>6 Dispatched</strong>
                  </div>
                  <div className={styles.metricRow}>
                    <span>Shelter Occupancy</span>
                    <strong className={styles.textSuccess}>82% Capacity</strong>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* 2. Live Operational Indicators */}
      <section className={styles.indicatorsSection}>
        <div className={styles.sectionContainer}>
          <div className={styles.indicatorBar}>
            <div className={styles.indicatorItem}>
              <span className={styles.indLabel}>ACTIVE INCIDENTS</span>
              <span className={`${styles.indVal} ${styles.textCritical} tech-code`}>05</span>
            </div>
            <div className={styles.indicatorDivider} />
            <div className={styles.indicatorItem}>
              <span className={styles.indLabel}>RELIEF DEPOTS STATUS</span>
              <span className={`${styles.indVal} ${styles.textSuccess} tech-code`}>ONLINE</span>
            </div>
            <div className={styles.indicatorDivider} />
            <div className={styles.indicatorItem}>
              <span className={styles.indLabel}>VEHICLES ON-MISSION</span>
              <span className={`${styles.indVal} ${styles.textPrimary} tech-code`}>06</span>
            </div>
            <div className={styles.indicatorDivider} />
            <div className={styles.indicatorItem}>
              <span className={styles.indLabel}>SHELTER SPACES AVAIL.</span>
              <span className={`${styles.indVal} tech-code`}>354</span>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Platform Capabilities */}
      <section id="features" className={styles.featuresSection}>
        <div className={styles.sectionContainer}>
          <div className={styles.sectionHeader}>
            <span className={styles.sectionSub}>PLATFORM ARCHITECTURE</span>
            <h2 className={styles.sectionTitle}>Designed for High-Stress Coordination</h2>
            <p className={styles.sectionDesc}>SAKSHAM integrates real-time datasets to eliminate bottlenecks in emergency workflows.</p>
          </div>

          <div className={styles.featuresGrid}>
            <div className={styles.featureCard}>
              <div className={`${styles.featIconWrapper} ${styles.bgPrimary}`}>
                <MapPin size={24} />
              </div>
              <h3>Live GIS Mapping</h3>
              <p>Dynamic overlays of threats, responders, inventory, and shelters. Real-time geo-coordinates prevent dispatch overlap.</p>
            </div>
            <div className={styles.featureCard}>
              <div className={`${styles.featIconWrapper} ${styles.bgCritical}`}>
                <ShieldAlert size={24} />
              </div>
              <h3>Intelligent Incident Sorting</h3>
              <p>Incidents are classified instantly based on severity (Critical, High, Medium, Low) and routing urgency.</p>
            </div>
            <div className={styles.featureCard}>
              <div className={`${styles.featIconWrapper} ${styles.bgSuccess}`}>
                <Layers size={24} />
              </div>
              <h3>Dynamic Resource Matching</h3>
              <p>Real-time ledger tracking of food, water, medical kits, and rescue gear across decentralized depots.</p>
            </div>
            <div className={styles.featureCard}>
              <div className={`${styles.featIconWrapper} ${styles.bgInfo}`}>
                <Truck size={24} />
              </div>
              <h3>Logistics Dispatch Control</h3>
              <p>Track delivery routes, vehicle speeds, cargo descriptions, and contact drivers directly from the operational deck.</p>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Interactive SOS Submission (Civilian Support) */}
      <section id="sos-section" className={styles.sosSection}>
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
                  <CheckCircle size={16} className={styles.textSuccess} />
                  <span>Immediate notification to Delhi NDRF Control Room</span>
                </div>
                <div className={styles.sosBenefitItem}>
                  <CheckCircle size={16} className={styles.textSuccess} />
                  <span>Automated tracking ID generated on submission</span>
                </div>
              </div>
            </div>

            <div className={styles.sosFormCard}>
              {sosSubmitted ? (
                <div className={styles.formSuccess}>
                  <FileCheck size={48} className={styles.successIcon} />
                  <h3>SOS Request Registered</h3>
                  <p>Your emergency demand has been logged into the SAKSHAM Command Center. First responders have been notified.</p>
                  <div className={styles.successTicket}>
                    <span>REQUEST ID:</span>
                    <strong className="tech-code">REQ-DEL-{Math.floor(Math.random() * 900) + 100}</strong>
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
                    <Send size={14} />
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* 5. Impact Metrics */}
      <section id="metrics" className={styles.metricsSection}>
        <div className={styles.sectionContainer}>
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

      {/* 6. Bottom Call-To-Action */}
      <section className={styles.ctaSection}>
        <div className={styles.sectionContainer}>
          <div className={styles.ctaWrapper}>
            <h2>Enter the Operational Dashboard</h2>
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
