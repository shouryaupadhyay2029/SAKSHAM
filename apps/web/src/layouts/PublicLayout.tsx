import React, { useState, useEffect, useRef } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import {
  Menu, X, Search, ChevronDown, LayoutGrid,
  AlertTriangle, Package, Truck, Home, AlertCircle,
  FileText, Phone, Info, Zap, Activity, BookOpen,
} from 'lucide-react';
import styles from './PublicLayout.module.css';
import { GradientBackground } from '../components/ui/noisy-gradient-backgrounds';

gsap.registerPlugin(ScrollTrigger);

// ─── Dropdown data ─────────────────────────────────────────────────────────
const GET_HELP_ITEMS = [
  {
    icon: AlertCircle,
    to: '/report',
    title: 'Civilian SOS',
    desc: 'Report an emergency or request assistance',
    highlight: true,
  },
  {
    icon: Home,
    to: '/operations/shelters',
    title: 'Shelter Network',
    desc: 'Find nearby shelters and available capacity',
    highlight: false,
  },
  {
    icon: Phone,
    to: '/help',
    title: 'Help & Helplines',
    desc: 'Emergency contacts, protocols and useful information',
    highlight: false,
  },
];

const RESPONSE_ITEMS = [
  {
    icon: LayoutGrid,
    to: '/operations/command-center',
    title: 'Command Centre',
    desc: 'Live operational situational overview',
  },
  {
    icon: AlertTriangle,
    to: '/operations/incidents',
    title: 'Incident Monitoring',
    desc: 'Live threat & incident tracking',
  },
  {
    icon: Zap,
    to: '/operations/requests',
    title: 'Demand Requests',
    desc: 'Track and review active requests',
  },
  {
    icon: FileText,
    to: '/operations/analytics',
    title: 'Response Overview',
    desc: 'Analytics, metrics and reports',
  },
];

const RESOURCES_ITEMS = [
  {
    icon: Package,
    to: '/operations/resources',
    title: 'Resource Registry',
    desc: 'Available equipment and supplies',
  },
  {
    icon: Truck,
    to: '/operations/vehicles',
    title: 'Vehicle Fleet',
    desc: 'Deploy and track field vehicles',
  },
  {
    icon: Home,
    to: '/operations/shelters',
    title: 'Shelter Network',
    desc: 'Shelter locations & capacity',
  },
  {
    icon: FileText,
    to: '/help',
    title: 'Help & Documentation',
    desc: 'Protocols, guides and emergency contacts',
  },
];

const ABOUT_ITEMS = [
  {
    icon: Activity,
    anchor: '#how-it-works',
    title: 'How It Works',
    desc: 'Understand the SAKSHAM response workflow',
  },
  {
    icon: BookOpen,
    anchor: '#metrics',
    title: 'Impact',
    desc: 'Network reach and response statistics',
  },
  {
    icon: Info,
    anchor: '#about',
    title: 'About SAKSHAM',
    desc: 'Mission, team and operational mandate',
  },
];

// ─── Dropdown hook ───────────────────────────────────────────────────────────
function useDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const timeout = useRef<number | null>(null);

  const open = () => {
    if (timeout.current) { window.clearTimeout(timeout.current); timeout.current = null; }
    setIsOpen(true);
  };

  const close = () => {
    timeout.current = window.setTimeout(() => setIsOpen(false), 160);
  };

  // Cleanup on unmount
  useEffect(() => () => { if (timeout.current) window.clearTimeout(timeout.current); }, []);

  return { isOpen, open, close };
}

// ─── NavItem + compact dropdown ─────────────────────────────────────────────
interface NavItemProps {
  label: string;
  children: React.ReactNode;
  isActive?: boolean;
}
const NavItem: React.FC<NavItemProps> = ({ label, children, isActive }) => {
  const { isOpen, open, close } = useDropdown();

  return (
    <div
      className={styles.navItemWrapper}
      onMouseEnter={open}
      onMouseLeave={close}
    >
      <button
        className={`${styles.navLink} ${isActive || isOpen ? styles.navLinkActive : ''}`}
        onClick={() => (isOpen ? close() : open())}
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        {label}
        <ChevronDown size={12} className={`${styles.chevron} ${isOpen ? styles.chevronOpen : ''}`} />
        <span className={styles.activeIndicator} />
      </button>

      <div
        className={`${styles.dropdown} ${isOpen ? styles.dropdownOpen : ''}`}
        onMouseEnter={open}
        onMouseLeave={close}
      >
        {children}
      </div>
    </div>
  );
};

// ─── Dropdown Item ────────────────────────────────────────────────────────────
interface DropItemProps {
  icon: React.FC<{ size?: number }>;
  to?: string;
  anchor?: string;
  title: string;
  desc: string;
  highlight?: boolean;
  active?: boolean;
  onClick?: () => void;
}
const DropItem: React.FC<DropItemProps> = ({ icon: Icon, to, anchor, title, desc, highlight, active, onClick }) => {
  const inner = (
    <div className={`${styles.dropItem} ${highlight ? styles.dropItemHighlight : ''} ${active ? styles.dropItemActive : ''}`}>
      <div className={`${styles.dropIcon} ${highlight ? styles.dropIconHighlight : active ? styles.dropIconActive : ''}`}>
        <Icon size={14} />
      </div>
      <div className={styles.dropText}>
        <span className={styles.dropTitle}>{title}</span>
        <span className={styles.dropDesc}>{desc}</span>
      </div>
    </div>
  );

  if (anchor) {
    return <a href={anchor} className={styles.dropItemLink} onClick={onClick}>{inner}</a>;
  }
  return <Link to={to!} className={styles.dropItemLink} onClick={onClick}>{inner}</Link>;
};

// ─── Main Layout ─────────────────────────────────────────────────────────────
export const PublicLayout: React.FC = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isCompressed, setIsCompressed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isAlertVisible, setIsAlertVisible] = useState(true);
  const [activeSection, setActiveSection] = useState('');
  const [mobileExpanded, setMobileExpanded] = useState<string | null>(null);
  const footerRef = useRef<HTMLDivElement>(null);
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated, authUser, logout } = useAuth();

  const isHome = location.pathname === '/';

  // Close mobile menu on route change
  useEffect(() => { setIsMobileOpen(false); }, [location.pathname]);

  // Scroll handler
  useEffect(() => {
    let lastY = window.scrollY;
    const handleScroll = () => {
      const currentY = window.scrollY;
      setIsScrolled(currentY > 40);
      if (currentY > 120) {
        setIsCompressed(currentY > lastY);
      } else {
        setIsCompressed(false);
      }
      lastY = currentY;
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Footer animations (unchanged)
  useEffect(() => {
    const footer = footerRef.current;
    if (!footer) return;

    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (mediaQuery.matches) {
      gsap.set(footer.querySelectorAll('.footer-animate'), { opacity: 1, y: 0 });
      gsap.set(footer.querySelector(`.${styles.hugeWordmark}`), { opacity: 0.05, y: 0 });
      return;
    }

    gsap.set(footer.querySelectorAll('.footer-animate'), { opacity: 0, y: 15 });
    gsap.set(footer.querySelector(`.${styles.hugeWordmark}`), { opacity: 0, y: 40 });

    const tl = gsap.timeline({
      scrollTrigger: { trigger: footer, start: 'top 92%', once: true }
    });

    tl.to(footer.querySelector(`.${styles.footerTopDivider}`), { opacity: 1, y: 0, duration: 0.4 })
      .to(footer.querySelector(`.${styles.footerBrand}`), { opacity: 1, y: 0, duration: 0.5 }, '-=0.1')
      .to(footer.querySelectorAll(`.${styles.footerLinks} > div`), { opacity: 1, y: 0, duration: 0.5, stagger: 0.1 }, '-=0.35')
      .to(footer.querySelector(`.${styles.footerStatus}`), { opacity: 1, y: 0, duration: 0.4 }, '-=0.25')
      .to(footer.querySelector(`.${styles.footerBottom}`), { opacity: 1, y: 0, duration: 0.5 }, '-=0.2')
      .to(footer.querySelector(`.${styles.hugeWordmark}`), { opacity: 0.05, y: 0, duration: 0.9, ease: 'power3.out' }, '-=0.4');

    gsap.to(footer.querySelector(`.${styles.hugeWordmark}`), {
      y: -15,
      scrollTrigger: { trigger: footer, start: 'top bottom', end: 'bottom top', scrub: true }
    });
  }, []);

  // Active section intersection observer
  useEffect(() => {
    if (!isHome) { setActiveSection(''); return; }
    const sections = ['features', 'how-it-works', 'metrics', 'about'];
    const observers = sections.map(id => {
      const el = document.getElementById(id);
      if (!el) return null;
      const observer = new IntersectionObserver(
        (entries) => { entries.forEach(e => { if (e.isIntersecting) setActiveSection(`#${id}`); }); },
        { rootMargin: '-40% 0px -50% 0px' }
      );
      observer.observe(el);
      return { observer, el };
    });
    return () => observers.forEach(obs => obs && obs.observer.unobserve(obs.el));
  }, [isHome]);

  const toggleMobile = (key: string) =>
    setMobileExpanded(prev => (prev === key ? null : key));



  // Show dark/transparent header on home top and officer login/forgot-password pages
  const isOfficerRoute = location.pathname.startsWith('/officer');
  const isDarkHeader = (isHome && !isScrolled) || isOfficerRoute;
  const isStickyHeader = isHome || isOfficerRoute;

  return (
    <div className={`${styles.container} ${isOfficerRoute ? styles.containerDark : ''}`}>
      {/* ── ANNOUNCEMENT BAR ── */}
      {isAlertVisible && (
        <div className={styles.announcementBar}>
          <div className={styles.announcementContent}>
            <span className={styles.alertPulseDot}>●</span>
            SAKSHAM OPERATIONS ALERT: RESPONSE CHANNELS &amp; LOGISTICS DELEGATION ONLINE.{' '}
            <Link to="/operations/command-center" className={styles.announcementLink}>
              ENTER COMMAND CENTER &rarr;
            </Link>
          </div>
          <button className={styles.alertCloseButton} onClick={() => setIsAlertVisible(false)}>
            <X size={14} />
          </button>
        </div>
      )}

      {/* ── MAIN NAV HEADER ── */}
      <header className={`${styles.header} ${isScrolled ? styles.headerScrolled : ''} ${isCompressed ? styles.headerCompressed : ''} ${isStickyHeader ? styles.headerSticky : ''} ${isDarkHeader ? styles.headerHomeDark : ''}`}>
        {/* Animated gradient background — orange-dominant, mirrors hero palette */}
        {isHome && !isScrolled && (
          <GradientBackground
            gradientType="radial-gradient"
            gradientSize="220% 600%"
            gradientOrigin="bottom-right"
            colors={[
              { color: 'rgba(244, 124, 32, 1)', stop: '0%' },
              { color: 'rgba(215, 101, 16, 1)', stop: '18%' },
              { color: 'rgba(180, 80,  15, 1)', stop: '36%' },
              { color: 'rgba(120, 55,  10, 1)', stop: '55%' },
              { color: 'rgba(18,  50,  36, 1)', stop: '75%' },
              { color: 'rgba(14,  35,  26, 1)', stop: '88%' },
              { color: 'rgba(10,  24,  18, 1)', stop: '100%' },
            ]}
            noisePatternAlpha={18}
            noiseIntensity={0.45}
            noisePatternRefreshInterval={2}
            noisePatternSize={90}
          />
        )}
        <div className={styles.headerWrapper}>

          {/* Brand */}
          <div className={styles.brandArea}>
            <img src="/logo.png" alt="SAKSHAM Logo" style={{ width: '60px', height: '60px', objectFit: 'contain', marginRight: '14px' }} />
            <Link to="/" style={{ display: 'flex', alignItems: 'center', height: '100%', textDecoration: 'none' }}>
              <img
                src="/WEB_NAME.webp"
                alt="SAKSHAM"
                style={{
                  height: '100px',
                  width: 'auto',
                  objectFit: 'contain',
                  filter: isDarkHeader ? 'none' : 'invert(1) brightness(1.2)',
                  pointerEvents: 'none'
                }}
              />
            </Link>
          </div>

          {/* ── Desktop Nav ── */}
          <nav className={styles.nav} aria-label="Primary navigation">

            {/* GET HELP */}
            <NavItem label="Get Help" isActive={location.pathname === '/report' || location.pathname === '/help'}>
              <div className={styles.dropPanel} style={{ minWidth: 280 }}>
                <div className={styles.dropPanelHead}>
                  <span className={styles.dropPanelLabel}>CIVILIAN EMERGENCY</span>
                </div>
                <div className={styles.dropPanelBody}>
                  {GET_HELP_ITEMS.map(item => (
                    <DropItem key={item.to} {...item} />
                  ))}
                </div>
              </div>
            </NavItem>

            {/* RESPONSE */}
            <NavItem
              label="Response"
              isActive={location.pathname.startsWith('/operations')}
            >
              <div className={styles.dropPanel} style={{ minWidth: 320 }}>
                <div className={styles.dropPanelHead}>
                  <span className={styles.dropPanelLabel}>OPERATIONAL RESPONSE</span>
                </div>
                <div className={styles.dropPanelBody}>
                  {RESPONSE_ITEMS.map(item => (
                    <DropItem key={item.to} {...item} />
                  ))}
                </div>
              </div>
            </NavItem>

            {/* RESOURCES */}
            <NavItem label="Resources">
              <div className={styles.dropPanel} style={{ minWidth: 300 }}>
                <div className={styles.dropPanelHead}>
                  <span className={styles.dropPanelLabel}>AVAILABLE RESOURCES</span>
                </div>
                <div className={styles.dropPanelBody}>
                  {RESOURCES_ITEMS.map(item => (
                    <DropItem key={item.to} {...item} />
                  ))}
                </div>
              </div>
            </NavItem>

            {/* ABOUT */}
            <NavItem
              label="About"
              isActive={activeSection === '#about' || activeSection === '#metrics' || activeSection === '#how-it-works'}
            >
              <div className={styles.dropPanel} style={{ minWidth: 260 }}>
                <div className={styles.dropPanelHead}>
                  <span className={styles.dropPanelLabel}>ABOUT SAKSHAM</span>
                </div>
                <div className={styles.dropPanelBody}>
                  {ABOUT_ITEMS.map(item => (
                    <DropItem key={item.anchor} {...item} />
                  ))}
                </div>
              </div>
            </NavItem>

          </nav>

          {/* ── Right action area ── */}
          <div className={styles.ctaArea}>
            {/* Civilian SOS — high-visibility standalone link */}
            <Link to="/report" className={styles.sosLink} aria-label="Civilian SOS — report an emergency">
              <span className={styles.sosDot} />
              Civilian SOS
            </Link>

            {/* Officer Login / authenticated user badge */}
            {isAuthenticated && authUser ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Link to="/operations" className={styles.primaryCta}>
                  Command Centre →
                </Link>
                <button
                  onClick={() => { logout(); navigate('/'); }}
                  style={{
                    background: 'none',
                    border: '1px solid rgba(26,47,35,0.2)',
                    borderRadius: '3px',
                    padding: '6px 12px',
                    fontSize: '10px',
                    fontWeight: 700,
                    letterSpacing: '0.08em',
                    color: 'rgba(26,47,35,0.6)',
                    cursor: 'pointer',
                    fontFamily: 'Inter, sans-serif',
                    textTransform: 'uppercase',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(26,47,35,0.06)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'none'; }}
                  aria-label="Sign out"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <>
                {/* Enter Command Center pill */}
                <Link to="/operations" className={styles.primaryCta}>
                  Enter Command Center →
                </Link>

                {/* Officer Login — understated */}
                <Link
                  to="/officer/login"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                    fontSize: '10px',
                    fontWeight: 700,
                    letterSpacing: '0.1em',
                    color: isHome && !isScrolled ? 'rgba(250,248,243,0.55)' : 'rgba(26,47,35,0.55)',
                    textDecoration: 'none',
                    textTransform: 'uppercase',
                    fontFamily: 'Inter, sans-serif',
                    border: `1px solid ${isHome && !isScrolled ? 'rgba(250,248,243,0.22)' : 'rgba(26,47,35,0.18)'}`,
                    borderRadius: '3px',
                    padding: '6px 12px',
                    transition: 'all 0.2s',
                    whiteSpace: 'nowrap',
                  }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLAnchorElement).style.color = isHome && !isScrolled ? '#FAF8F3' : '#1A2F23';
                    (e.currentTarget as HTMLAnchorElement).style.background = isHome && !isScrolled ? 'rgba(250,248,243,0.08)' : 'rgba(26,47,35,0.04)';
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLAnchorElement).style.color = isHome && !isScrolled ? 'rgba(250,248,243,0.55)' : 'rgba(26,47,35,0.55)';
                    (e.currentTarget as HTMLAnchorElement).style.background = 'none';
                  }}
                >
                  Officer Login
                </Link>
              </>
            )}

            {/* Search */}
            <button className={styles.searchCircleButton} aria-label="Search">
              <Search size={14} />
            </button>

            {/* Mobile hamburger */}
            <button
              className={styles.mobileMenuButton}
              onClick={() => setIsMobileOpen(v => !v)}
              aria-label={isMobileOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={isMobileOpen}
            >
              {isMobileOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </div>
      </header>

      {/* ── MOBILE DRAWER ── */}
      <div className={`${styles.mobileDrawer} ${isMobileOpen ? styles.mobileDrawerOpen : ''}`} role="dialog" aria-modal="true" aria-label="Navigation menu">

        <div className={styles.mobileNavLinks}>

          {/* EMERGENCY FIRST */}
          <Link to="/report" className={styles.mobileSosButton} onClick={() => setIsMobileOpen(false)}>
            <AlertCircle size={16} />
            Civilian SOS — Report an Emergency
          </Link>

          <div className={styles.mobileDivider} />

          {/* GET HELP accordion */}
          <div className={styles.mobileAccordion}>
            <button className={styles.mobileAccordionToggle} onClick={() => toggleMobile('help')}>
              <span>Get Help</span>
              <ChevronDown size={14} className={mobileExpanded === 'help' ? styles.chevronOpen : ''} />
            </button>
            {mobileExpanded === 'help' && (
              <div className={styles.mobileAccordionBody}>
                {GET_HELP_ITEMS.map(item => (
                  <Link key={item.to} to={item.to} className={styles.mobileSubLink} onClick={() => setIsMobileOpen(false)}>
                    <item.icon size={13} /> {item.title}
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* RESPONSE accordion */}
          <div className={styles.mobileAccordion}>
            <button className={styles.mobileAccordionToggle} onClick={() => toggleMobile('response')}>
              <span>Response</span>
              <ChevronDown size={14} className={mobileExpanded === 'response' ? styles.chevronOpen : ''} />
            </button>
            {mobileExpanded === 'response' && (
              <div className={styles.mobileAccordionBody}>
                {RESPONSE_ITEMS.map(item => (
                  <Link key={item.to} to={item.to} className={styles.mobileSubLink} onClick={() => setIsMobileOpen(false)}>
                    <item.icon size={13} /> {item.title}
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* RESOURCES accordion */}
          <div className={styles.mobileAccordion}>
            <button className={styles.mobileAccordionToggle} onClick={() => toggleMobile('resources')}>
              <span>Resources</span>
              <ChevronDown size={14} className={mobileExpanded === 'resources' ? styles.chevronOpen : ''} />
            </button>
            {mobileExpanded === 'resources' && (
              <div className={styles.mobileAccordionBody}>
                {RESOURCES_ITEMS.map(item => (
                  <Link key={item.to} to={item.to} className={styles.mobileSubLink} onClick={() => setIsMobileOpen(false)}>
                    <item.icon size={13} /> {item.title}
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* ABOUT accordion */}
          <div className={styles.mobileAccordion}>
            <button className={styles.mobileAccordionToggle} onClick={() => toggleMobile('about')}>
              <span>About</span>
              <ChevronDown size={14} className={mobileExpanded === 'about' ? styles.chevronOpen : ''} />
            </button>
            {mobileExpanded === 'about' && (
              <div className={styles.mobileAccordionBody}>
                {ABOUT_ITEMS.map(item => (
                  <a key={item.anchor} href={item.anchor} className={styles.mobileSubLink} onClick={() => setIsMobileOpen(false)}>
                    <item.icon size={13} /> {item.title}
                  </a>
                ))}
              </div>
            )}
          </div>

        </div>

        {/* Mobile Command Center CTA */}
        <Link to="/operations" className={styles.mobileCtaButton} onClick={() => setIsMobileOpen(false)}>
          <span>ENTER COMMAND CENTER</span>
          <ArrowRightSideIcon />
        </Link>

        {/* Officer Login (mobile) */}
        {!isAuthenticated && (
          <Link
            to="/officer/login"
            style={{
              display: 'block',
              textAlign: 'center',
              padding: '12px',
              marginTop: '8px',
              fontSize: '10px',
              fontWeight: 700,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: 'rgba(26,47,35,0.55)',
              textDecoration: 'none',
              fontFamily: 'Inter, sans-serif',
              border: '1px solid rgba(26,47,35,0.15)',
              borderRadius: '3px',
            }}
            onClick={() => setIsMobileOpen(false)}
          >
            Officer Login
          </Link>
        )}
      </div>

      {/* ── PAGE CONTENT ── */}
      <main className={styles.main}>
        <Outlet />
      </main>

      {/* ── FOOTER (unchanged) ── */}
      <footer ref={footerRef} className={`${styles.footer} textureForest`}>
        <div className={`${styles.footerTopDivider} footer-animate`}>
          <div className={styles.footerTopDividerSignal} />
        </div>

        <div className={styles.footerContent}>
          <div className={`${styles.footerBrand} footer-animate`}>
            <h3>SAKSHAM</h3>
            <p>Resilient Disaster Relief &amp; Logistics Systems</p>
          </div>
          <div className={styles.footerLinks}>
            <div className="footer-animate">
              <h4>OPERATIONS</h4>
              <Link to="/operations/command-center" className={styles.footerLink}>
                <span className={styles.footerLinkBullet}>→</span> Command Center
              </Link>
              <Link to="/operations/incidents" className={styles.footerLink}>
                <span className={styles.footerLinkBullet}>→</span> Live Incidents
              </Link>
              <Link to="/operations/resources" className={styles.footerLink}>
                <span className={styles.footerLinkBullet}>→</span> Resource Registry
              </Link>
            </div>
            <div className="footer-animate">
              <h4>RESOURCES</h4>
              <Link to="/help" className={styles.footerLink}>
                <span className={styles.footerLinkBullet}>→</span> Helplines
              </Link>
              <Link to="/report" className={styles.footerLink}>
                <span className={styles.footerLinkBullet}>→</span> File SOS Report
              </Link>
              <a href="#" className={styles.footerLink}>
                <span className={styles.footerLinkBullet}>→</span> System Status
              </a>
            </div>
          </div>
        </div>

        <div className={`${styles.footerStatus} footer-animate`}>
          <span className={styles.statusDot} />
          <span>RESPONSE NETWORK ONLINE</span>
        </div>

        <div className={`${styles.footerBottom} footer-animate`}>
          <p>&copy; {new Date().getFullYear()} SAKSHAM. Designed for SIH 2026. All rights reserved.</p>
          <div className={styles.footerSystemLabel}>
            <span>SAKSHAM RESPONSE NETWORK</span>
            <span>SYSTEM STATUS / ONLINE</span>
          </div>
        </div>

        <div className={styles.hugeWordmark} aria-hidden="true">SAKSHAM</div>
      </footer>
    </div>
  );
};

// Helper icon
const ArrowRightSideIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m18 8 4 4-4 4M2 12h20M6 8l-4 4 4 4" />
  </svg>
);

export default PublicLayout;
