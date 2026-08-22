import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  PhoneCall,
  Phone,
  ShieldAlert,
  ArrowLeft,
  HeartHandshake,
  AlertCircle,
  Home,
  Package,
  Clock,
  Radio,
  LifeBuoy,
  Flame,
  Activity,
  ArrowRight,
  ShieldCheck,
  AlertTriangle,
} from 'lucide-react';
import styles from './Help.module.css';
import { ShaderBackground } from '../../components/ui/ShaderBackground';

export const Help: React.FC = () => {
  const { t } = useTranslation();
  const [activeCategory, setActiveCategory] = useState<string>('ALL');

  const categories = [
    { key: 'ALL', label: t('help.allCategories') },
    { key: 'EMERGENCY', label: t('help.catEmergency') },
    { key: 'SHELTER', label: t('help.catShelter') },
    { key: 'MEDICAL', label: t('help.catMedical') },
    { key: 'FIRE', label: t('help.catFire') },
    { key: 'FLOOD', label: t('help.catFlood') },
    { key: 'SUPPLIES', label: t('help.catSupplies') },
  ];

  return (
    <div className={styles.pageContainer}>
      {/* ── Back Navigation ── */}
      <div className={styles.backNav}>
        <Link to="/" className={styles.backLink}>
          <ArrowLeft size={16} />
          <span>{t('help.backToPortal')}</span>
        </Link>
      </div>

      {/* ── 1. PAGE HERO ── */}
      <div className={styles.heroCard}>
        <ShaderBackground className="absolute inset-0 opacity-40 pointer-events-none" />

        <div className={styles.heroContent}>
          <div className={styles.heroTopRow}>
            <span className={styles.eyebrow}>{t('help.eyebrow')}</span>
            <div className={styles.statusIndicator}>
              <span className={styles.statusDot} />
              <span>{t('help.networkOnline')}</span>
            </div>
          </div>

          <h1 className={styles.heroTitle}>
            Civilian Support Desk <br />
            <span className={styles.heroTitleHighlight}>&amp; Protocol Center</span>
          </h1>

          <p className={styles.heroSubtitle}>{t('help.subtitle')}</p>

          <div className={styles.heroMetadata}>
            <div className={styles.metaItem}>
              <Clock size={14} className={styles.metaIcon} />
              <span>{t('help.support247')}</span>
            </div>
            <div className={styles.metaItem}>
              <Radio size={14} className={styles.metaIcon} />
              <span>{t('help.responseNetwork')}</span>
            </div>
            <div className={styles.metaItem}>
              <Activity size={14} className={styles.metaIcon} />
              <span>{t('help.liveAdvisories')}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── 2. NEED HELP NOW? ACTION STRIP ── */}
      <section className={styles.actionStrip} aria-label="Immediate assistance strip">
        <div className={styles.actionStripText}>
          <h2 className={styles.actionStripTitle}>
            <AlertCircle size={18} />
            {t('help.needHelpTitle')}
          </h2>
          <p className={styles.actionStripSubtitle}>{t('help.needHelpSubtitle')}</p>
        </div>

        <div className={styles.actionStripButtons}>
          <a href="tel:112" className={styles.call112Btn} aria-label="Call 112 National Emergency">
            <Phone size={16} />
            <span>{t('help.call112')}</span>
          </a>
          <Link to="/report" className={styles.reportSosBtn} aria-label="Report an SOS emergency">
            <AlertTriangle size={16} />
            <span>{t('help.reportSos')}</span>
          </Link>
        </div>
      </section>

      {/* ── 3. VISUAL EMERGENCY CATEGORIES ── */}
      <nav className={styles.categoriesBar} aria-label="Filter categories">
        {categories.map((cat) => (
          <button
            key={cat.key}
            onClick={() => setActiveCategory(cat.key)}
            className={`${styles.categoryChip} ${
              activeCategory === cat.key ? styles.categoryChipActive : ''
            }`}
          >
            {cat.label}
          </button>
        ))}
      </nav>

      {/* ── 4. TWO-COLUMN MAIN GRID ── */}
      <div className={styles.mainGrid}>
        {/* LEFT COLUMN: Operational Relief Workflows */}
        <div>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>
              <HeartHandshake size={22} className="text-emerald-700" />
              <span>{t('help.workflowsTitle')}</span>
            </h2>
            <span className={styles.sectionSubtitle}>Standard Protocols</span>
          </div>

          <div className={styles.workflowsList}>
            {/* Step 01 */}
            <div className={styles.workflowCard}>
              <div className={styles.workflowTopBar}>
                <span className={styles.workflowNumber}>01</span>
                <span className={styles.workflowCategory}>{t('help.catEmergency')}</span>
              </div>
              <div className={styles.workflowHeader}>
                <div className={styles.workflowIcon}>
                  <AlertCircle size={18} />
                </div>
                <h3 className={styles.workflowTitle}>{t('help.step1Title')}</h3>
              </div>
              <p className={styles.workflowDesc}>{t('help.step1Desc')}</p>
              <Link to="/report" className={styles.workflowLink}>
                <span>File SOS Alert</span>
                <ArrowRight size={14} />
              </Link>
            </div>

            {/* Step 02 */}
            <div className={styles.workflowCard}>
              <div className={styles.workflowTopBar}>
                <span className={styles.workflowNumber}>02</span>
                <span className={styles.workflowCategory}>{t('help.catShelter')}</span>
              </div>
              <div className={styles.workflowHeader}>
                <div className={styles.workflowIcon}>
                  <Home size={18} />
                </div>
                <h3 className={styles.workflowTitle}>{t('help.step2Title')}</h3>
              </div>
              <p className={styles.workflowDesc}>{t('help.step2Desc')}</p>
              <Link to="/operations/shelters" className={styles.workflowLink}>
                <span>View Shelter Camps</span>
                <ArrowRight size={14} />
              </Link>
            </div>

            {/* Step 03 */}
            <div className={styles.workflowCard}>
              <div className={styles.workflowTopBar}>
                <span className={styles.workflowNumber}>03</span>
                <span className={styles.workflowCategory}>{t('help.catSupplies')}</span>
              </div>
              <div className={styles.workflowHeader}>
                <div className={styles.workflowIcon}>
                  <Package size={18} />
                </div>
                <h3 className={styles.workflowTitle}>{t('help.step3Title')}</h3>
              </div>
              <p className={styles.workflowDesc}>{t('help.step3Desc')}</p>
              <Link to="/operations/requests" className={styles.workflowLink}>
                <span>Request Supplies</span>
                <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Helpline Directory */}
        <div>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>
              <PhoneCall size={22} className="text-orange-600" />
              <span>{t('help.contactsTitle')}</span>
            </h2>
            <span className={styles.sectionSubtitle}>{t('help.contactsSubtitle')}</span>
          </div>

          <div className={styles.contactsList}>
            {/* Priority 1: National Emergency */}
            <div className={`${styles.contactCard} ${styles.contactCardPrimary}`}>
              <div className={styles.contactInfo}>
                <div className={styles.contactHeader}>
                  <ShieldAlert size={14} className={styles.contactIcon} />
                  <span className={styles.contactName}>National Emergency</span>
                </div>
                <span className={styles.contactNumber}>112</span>
                <span className={styles.contactCategory}>Primary emergency dispatch &amp; response</span>
              </div>
              <a
                href="tel:112"
                className={`${styles.callButton} ${styles.callButtonPrimary}`}
                aria-label="Call 112 National Emergency"
              >
                <Phone size={13} />
                <span>{t('help.callBtn')}</span>
              </a>
            </div>

            {/* Priority 2: Fire & Rescue Desk */}
            <div className={styles.contactCard}>
              <div className={styles.contactInfo}>
                <div className={styles.contactHeader}>
                  <Flame size={14} className={styles.contactIconSecondary} />
                  <span className={styles.contactName}>Fire &amp; Rescue Desk</span>
                </div>
                <span className={styles.contactNumberSecondary}>101</span>
                <span className={styles.contactCategory}>Fire suppression, hazard containment &amp; rescue</span>
              </div>
              <a
                href="tel:101"
                className={styles.callButton}
                aria-label="Call 101 Fire and Rescue Desk"
              >
                <Phone size={13} />
                <span>{t('help.callBtn')}</span>
              </a>
            </div>

            {/* Priority 3: Ambulance Dispatch */}
            <div className={styles.contactCard}>
              <div className={styles.contactInfo}>
                <div className={styles.contactHeader}>
                  <Activity size={14} className={styles.contactIconSecondary} />
                  <span className={styles.contactName}>Ambulance Dispatch</span>
                </div>
                <span className={styles.contactNumberSecondary}>102</span>
                <span className={styles.contactCategory}>Emergency medical transport &amp; trauma unit</span>
              </div>
              <a
                href="tel:102"
                className={styles.callButton}
                aria-label="Call 102 Ambulance Dispatch"
              >
                <Phone size={13} />
                <span>{t('help.callBtn')}</span>
              </a>
            </div>

            {/* Priority 4: Delhi Flood Control */}
            <div className={styles.contactCard}>
              <div className={styles.contactInfo}>
                <div className={styles.contactHeader}>
                  <LifeBuoy size={14} className={styles.contactIconSecondary} />
                  <span className={styles.contactName}>Delhi Flood Control</span>
                </div>
                <span className={styles.contactNumberSecondary}>011-22627936</span>
                <span className={styles.contactCategory}>Monsoon &amp; Yamuna river flood monitoring</span>
              </div>
              <a
                href="tel:01122627936"
                className={styles.callButton}
                aria-label="Call 011-22627936 Delhi Flood Control"
              >
                <Phone size={13} />
                <span>{t('help.callBtn')}</span>
              </a>
            </div>

            {/* Priority 5: NDRF Control Room */}
            <div className={styles.contactCard}>
              <div className={styles.contactInfo}>
                <div className={styles.contactHeader}>
                  <ShieldCheck size={14} className={styles.contactIconSecondary} />
                  <span className={styles.contactName}>NDRF Control Room</span>
                </div>
                <span className={styles.contactNumberSecondary}>011-24363260</span>
                <span className={styles.contactCategory}>National Disaster Response Force HQ</span>
              </div>
              <a
                href="tel:01124363260"
                className={styles.callButton}
                aria-label="Call 011-24363260 NDRF Control Room"
              >
                <Phone size={13} />
                <span>{t('help.callBtn')}</span>
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* ── 5. LIVE SAFETY ADVISORY CARD ── */}
      <section className={styles.advisoryCard} aria-label="Live Safety Advisory">
        <div className={styles.advisoryHeader}>
          <div className={styles.advisoryBadge}>
            <span className={styles.advisoryPulse} />
            <span>{t('help.advisoryTitle')}</span>
          </div>
          <span className={styles.advisoryFooter}>{t('help.advisoryStatus')}</span>
        </div>

        <h3 className={styles.advisoryHeading}>{t('help.advisoryHeading')}</h3>
        <p className={styles.advisoryBodyText}>{t('help.advisoryBody')}</p>
      </section>

      {/* ── 6. HOW TO RESPOND SECTION ── */}
      <section className={styles.guidanceSection} aria-label="How to respond during an active emergency">
        <div className={styles.guidanceHeader}>
          <h2 className={styles.guidanceMainTitle}>{t('help.guidanceTitle')}</h2>
          <p className={styles.guidanceSubTitle}>
            Core safety directives for individuals and families in affected disaster zones.
          </p>
        </div>

        <div className={styles.principlesGrid}>
          {/* Principle 01 */}
          <div className={styles.principleCard}>
            <span className={styles.principleNumber}>01</span>
            <h3 className={styles.principleTitle}>{t('help.principle1Title')}</h3>
            <p className={styles.principleDesc}>{t('help.principle1Desc')}</p>
          </div>

          {/* Principle 02 */}
          <div className={styles.principleCard}>
            <span className={styles.principleNumber}>02</span>
            <h3 className={styles.principleTitle}>{t('help.principle2Title')}</h3>
            <p className={styles.principleDesc}>{t('help.principle2Desc')}</p>
          </div>

          {/* Principle 03 */}
          <div className={styles.principleCard}>
            <span className={styles.principleNumber}>03</span>
            <h3 className={styles.principleTitle}>{t('help.principle3Title')}</h3>
            <p className={styles.principleDesc}>{t('help.principle3Desc')}</p>
          </div>

          {/* Principle 04 */}
          <div className={styles.principleCard}>
            <span className={styles.principleNumber}>04</span>
            <h3 className={styles.principleTitle}>{t('help.principle4Title')}</h3>
            <p className={styles.principleDesc}>{t('help.principle4Desc')}</p>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Help;
