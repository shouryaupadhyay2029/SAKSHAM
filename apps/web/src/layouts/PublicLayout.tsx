import React, { useState, useEffect, useRef } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { 
  Menu, X, Search, ChevronDown, LayoutGrid, 
  AlertTriangle, Package, 
  Truck, Home, AlertCircle, FileText 
} from 'lucide-react';
import styles from './PublicLayout.module.css';

export const PublicLayout: React.FC = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isMegaOpen, setIsMegaOpen] = useState(false);
  const [isAlertVisible, setIsAlertVisible] = useState(true);
  const [activeSection, setActiveSection] = useState('');
  const closeTimeout = useRef<number | null>(null);
  const location = useLocation();

  const isHome = location.pathname === '/';

  // Scroll handler
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 40);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Intersection Observer for scroll highlights
  useEffect(() => {
    if (!isHome) {
      setActiveSection('');
      return;
    }

    const sections = ['features', 'how-it-works', 'metrics', 'about'];
    const observers = sections.map(id => {
      const el = document.getElementById(id);
      if (!el) return null;

      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach(entry => {
            if (entry.isIntersecting) {
              setActiveSection(`#${id}`);
            }
          });
        },
        { rootMargin: '-40% 0px -50% 0px' }
      );
      observer.observe(el);
      return { observer, el };
    });

    return () => {
      observers.forEach(obs => {
        if (obs) obs.observer.unobserve(obs.el);
      });
    };
  }, [isHome]);

  const handleMegaEnter = () => {
    if (closeTimeout.current) {
      window.clearTimeout(closeTimeout.current);
      closeTimeout.current = null;
    }
    setIsMegaOpen(true);
  };

  const handleMegaLeave = () => {
    closeTimeout.current = window.setTimeout(() => {
      setIsMegaOpen(false);
    }, 180);
  };

  const toggleMobileMenu = () => {
    setIsMobileOpen(!isMobileOpen);
  };

  return (
    <div className={styles.container}>
      {/* 1. TOP ANNOUNCEMENT / STATUS BAR (Dark Charcoal/Green with dismiss close icon) */}
      {isAlertVisible && (
        <div className={styles.announcementBar}>
          <div className={styles.announcementContent}>
            <span className={styles.alertPulseDot}>●</span> SAKSHAM OPERATIONS ALERT: RESPONSE CHANNELS &amp; LOGISTICS DELEGATION ONLINE.{' '}
            <Link to="/operations/command-center" className={styles.announcementLink}>
              ENTER COMMAND CENTER &rarr;
            </Link>
          </div>
          <button className={styles.alertCloseButton} onClick={() => setIsAlertVisible(false)}>
            <X size={14} />
          </button>
        </div>
      )}

      {/* 2. MAIN NAV HEADER */}
      <header className={`${styles.header} ${isScrolled ? styles.headerScrolled : ''}`}>
        <div className={styles.headerWrapper}>
          {/* Brand Logo & Wordmark */}
          <div className={styles.brandArea}>
            <svg width="22" height="22" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="18" y="2" width="22" height="22" rx="4" transform="rotate(45 18 2)" fill="none" stroke="#B35D38" strokeWidth="3"/>
              <circle cx="18" cy="18" r="4" fill="#B35D38"/>
            </svg>
            <Link to="/" className={styles.logoText}>SAKSHAM</Link>
          </div>

          {/* Desktop Navigation Links */}
          <nav className={styles.nav}>
            <div 
              className={styles.navItemWrapper}
              onMouseEnter={handleMegaEnter}
              onMouseLeave={handleMegaLeave}
            >
              <a 
                href="#features" 
                className={`${styles.navLink} ${activeSection === '#features' || isMegaOpen ? styles.navLinkActive : ''}`}
              >
                Platform <ChevronDown size={12} className={`${styles.chevron} ${isMegaOpen ? styles.chevronOpen : ''}`} />
                <span className={styles.activeIndicator} />
              </a>
            </div>

            <div className={styles.navItemWrapper}>
              <a 
                href="#how-it-works" 
                className={`${styles.navLink} ${activeSection === '#how-it-works' ? styles.navLinkActive : ''}`}
              >
                How It Works
                <span className={styles.activeIndicator} />
              </a>
            </div>

            <div className={styles.navItemWrapper}>
              <a 
                href="#metrics" 
                className={`${styles.navLink} ${activeSection === '#metrics' ? styles.navLinkActive : ''}`}
              >
                Impact
                <span className={styles.activeIndicator} />
              </a>
            </div>

            <div className={styles.navItemWrapper}>
              <a 
                href="#about" 
                className={`${styles.navLink} ${activeSection === '#about' ? styles.navLinkActive : ''}`}
              >
                About
                <span className={styles.activeIndicator} />
              </a>
            </div>
          </nav>

          {/* Right Action Controls */}
          <div className={styles.ctaArea}>
            <Link to="/report" className={styles.secondaryLink}>
              Civilian SOS
            </Link>
            
            <Link to="/operations/command-center" className={styles.primaryCta}>
              Enter Command Center &rarr;
            </Link>

            <button className={styles.searchCircleButton}>
              <Search size={14} />
            </button>

            <button className={styles.mobileMenuButton} onClick={toggleMobileMenu}>
              {isMobileOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </div>

        {/* Floating Mega Menu Dropdown */}
        <div 
          className={`${styles.megaMenu} ${isMegaOpen ? styles.megaMenuOpen : ''}`}
          onMouseEnter={handleMegaEnter}
          onMouseLeave={handleMegaLeave}
        >
          <div className={styles.megaMenuContainer}>
            {/* Column 1: Core Operations */}
            <div className={styles.megaMenuCol}>
              <div className={styles.columnHeader}>CORE OPERATIONS</div>
              <div className={styles.itemList}>
                <Link to="/operations/command-center" className={`${styles.megaItem} ${styles.megaItemActive}`} onClick={() => setIsMegaOpen(false)}>
                  <div className={`${styles.iconWrapper} ${styles.orangeIcon}`}>
                    <LayoutGrid size={16} />
                  </div>
                  <div>
                    <div className={styles.megaTitle}>Command Center</div>
                    <div className={styles.megaDesc}>Real-time situational overview</div>
                  </div>
                </Link>
                <Link to="/operations/incidents" className={styles.megaItem} onClick={() => setIsMegaOpen(false)}>
                  <div className={styles.iconWrapper}>
                    <AlertTriangle size={16} />
                  </div>
                  <div>
                    <div className={styles.megaTitle}>Incident Monitoring</div>
                    <div className={styles.megaDesc}>Live threat &amp; incident tracking</div>
                  </div>
                </Link>
                <Link to="/operations/resources" className={styles.megaItem} onClick={() => setIsMegaOpen(false)}>
                  <div className={styles.iconWrapper}>
                    <Package size={16} />
                  </div>
                  <div>
                    <div className={styles.megaTitle}>Resource Registry</div>
                    <div className={styles.megaDesc}>People, equipment &amp; supplies</div>
                  </div>
                </Link>
                <Link to="/operations/requests" className={styles.megaItem} onClick={() => setIsMegaOpen(false)}>
                  <div className={styles.iconWrapper}>
                    <ArrowRightSideIcon />
                  </div>
                  <div>
                    <div className={styles.megaTitle}>Demand Matching</div>
                    <div className={styles.megaDesc}>Match needs with available resources</div>
                  </div>
                </Link>
              </div>
            </div>

            {/* Column 2: Field Operations */}
            <div className={styles.megaMenuCol}>
              <div className={styles.columnHeader}>FIELD OPERATIONS</div>
              <div className={styles.itemList}>
                <Link to="/operations/vehicles" className={styles.megaItem} onClick={() => setIsMegaOpen(false)}>
                  <div className={styles.iconWrapper}>
                    <Truck size={16} />
                  </div>
                  <div>
                    <div className={styles.megaTitle}>Vehicle Fleet</div>
                    <div className={styles.megaDesc}>Deploy &amp; track field vehicles</div>
                  </div>
                </Link>
                <Link to="/operations/shelters" className={styles.megaItem} onClick={() => setIsMegaOpen(false)}>
                  <div className={styles.iconWrapper}>
                    <Home size={16} />
                  </div>
                  <div>
                    <div className={styles.megaTitle}>Shelter Network</div>
                    <div className={styles.megaDesc}>Shelter locations &amp; capacity</div>
                  </div>
                </Link>
                <Link to="/report" className={styles.megaItem} onClick={() => setIsMegaOpen(false)}>
                  <div className={styles.iconWrapper}>
                    <AlertCircle size={16} />
                  </div>
                  <div>
                    <div className={styles.megaTitle}>Civilian SOS Form</div>
                    <div className={styles.megaDesc}>Report incidents &amp; request help</div>
                  </div>
                </Link>
                <Link to="/help" className={styles.megaItem} onClick={() => setIsMegaOpen(false)}>
                  <div className={styles.iconWrapper}>
                    <FileText size={16} />
                  </div>
                  <div>
                    <div className={styles.megaTitle}>Helplines &amp; Docs</div>
                    <div className={styles.megaDesc}>Guides, protocols &amp; contacts</div>
                  </div>
                </Link>
              </div>
            </div>

            {/* Column 3: Banner Card */}
            <div className={styles.megaMenuCard}>
              <div className={styles.cardContent}>
                <h3 className={styles.cardHeading}>
                  Satellite links are active. Now they're <span className={styles.highlightText}>operational,</span> too.
                </h3>
                <Link to="/operations/command-center" className={styles.cardLink} onClick={() => setIsMegaOpen(false)}>
                  Learn more &rarr;
                </Link>
              </div>
              <div className={styles.cardGraphic}>
                <svg width="76" height="76" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="50" cy="50" r="40" stroke="#FAF8F3" strokeWidth="1" />
                  <circle cx="50" cy="50" r="40" stroke="#B35D38" strokeWidth="1" strokeDasharray="3 3" opacity="0.3" />
                  <circle cx="50" cy="50" r="24" stroke="#B35D38" strokeWidth="1.5" opacity="0.5" />
                  <circle cx="50" cy="50" r="8" fill="#F47C20" />
                  <line x1="50" y1="10" x2="50" y2="90" stroke="rgba(12, 29, 23, 0.08)" strokeWidth="1" />
                  <line x1="10" y1="50" x2="90" y2="50" stroke="rgba(12, 29, 23, 0.08)" strokeWidth="1" />
                  <path d="M 50,50 L 74,26" stroke="#F47C20" strokeWidth="2.5" strokeLinecap="round" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Drawer Overlay */}
      <div className={`${styles.mobileDrawer} ${isMobileOpen ? styles.mobileDrawerOpen : ''}`}>
        <div className={styles.mobileNavLinks}>
          <a href="#features" className={styles.mobileLink} onClick={toggleMobileMenu}>Platform</a>
          <a href="#how-it-works" className={styles.mobileLink} onClick={toggleMobileMenu}>How It Works</a>
          <a href="#metrics" className={styles.mobileLink} onClick={toggleMobileMenu}>Impact</a>
          <a href="#about" className={styles.mobileLink} onClick={toggleMobileMenu}>About</a>
          
          <div className={styles.mobileDivider} />
          
          <Link to="/report" className={styles.mobileActionLink} onClick={toggleMobileMenu}>Report an Incident (SOS)</Link>
          <Link to="/help" className={styles.mobileActionLink} onClick={toggleMobileMenu}>Help &amp; Helplines</Link>
        </div>

        <Link to="/operations/command-center" className={styles.mobileCtaButton} onClick={toggleMobileMenu}>
          <span>ENTER COMMAND CENTER</span>
          <ArrowRightSideIcon />
        </Link>
      </div>
      
      <main className={styles.main}>
        <Outlet />
      </main>

      <footer className={styles.footer}>
        <div className={styles.footerContent}>
          <div className={styles.footerBrand}>
            <h3>SAKSHAM</h3>
            <p>Resilient Disaster Relief &amp; Logistics Systems</p>
          </div>
          <div className={styles.footerLinks}>
            <div>
              <h4>Operations</h4>
              <Link to="/operations/command-center">Command Center</Link>
              <Link to="/operations/incidents">Live Incidents</Link>
              <Link to="/operations/resources">Resource Registry</Link>
            </div>
            <div>
              <h4>Resources</h4>
              <Link to="/help">Helplines</Link>
              <Link to="/report">File SOS Report</Link>
              <a href="#">System Status</a>
            </div>
          </div>
        </div>
        <div className={styles.footerBottom}>
          <p>&copy; {new Date().getFullYear()} SAKSHAM. Designed for SIH 2026. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

// Helper SVG Arrow left/right icon to avoid compiling conflicts
const ArrowRightSideIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m18 8 4 4-4 4M2 12h20M6 8l-4 4 4 4" />
  </svg>
);

export default PublicLayout;
