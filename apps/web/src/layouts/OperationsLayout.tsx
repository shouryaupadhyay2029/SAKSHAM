import React, { useState, useEffect, useRef } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  Bell,
  Clock,
  ShieldCheck,
  ChevronDown,
  Menu,
  X,
  LogOut,
  User,
} from 'lucide-react';
import styles from './OperationsLayout.module.css';
import { ConnectionIndicator } from '../components/ui/SystemStates';
import { useOperationalState } from '../context/OperationalStateContext';
import { useAuth } from '../context/AuthContext';

export const OperationsLayout: React.FC = () => {
  const [time, setTime] = useState(new Date());
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const notifRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  const { isOffline } = useOperationalState();
  const { authUser, logout } = useAuth();

  // Close mobile drawer on route change
  useEffect(() => {
    setIsMobileOpen(false);
  }, [location.pathname]);

  // Close popovers on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotificationsOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formatDelhiTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
      timeZone: 'Asia/Kolkata'
    });
  };

  const formatDelhiDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      timeZone: 'Asia/Kolkata'
    });
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const navItems: { path: string; label: string; badge?: string }[] = [
    { path: '/operations/command-center', label: 'Command Center' },
    { path: '/operations/matching', label: 'Matching' },
    { path: '/operations/dispatch', label: 'Dispatch' },
    { path: '/operations/delivery', label: 'Delivery' }
  ];

  // Role display label
  const roleLabel = authUser?.role === 'REGIONAL_AUTHORITY'
    ? 'REG. AUTHORITY'
    : authUser?.role ?? 'OFFICER';

  return (
    <div className={styles.layout}>
      {/* Top navigation system */}
      <header className={styles.topbar}>
        <div className={styles.topbarLeft}>
          {/* Main Horizontal Operations Menu */}
          <nav className={styles.navMenu}>
            {navItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `${styles.navMenuLink} ${isActive ? styles.navMenuLinkActive : ''}`
                }
              >
                {item.label}
                {item.badge && <span className={styles.navMenuBadge}>{item.badge}</span>}
                <span className={styles.activeIndicator} />
              </NavLink>
            ))}
          </nav>
        </div>

        <div className={styles.topbarRight}>
          <ConnectionIndicator isOffline={isOffline} />

          {/* Delhi Operational Clock */}
          <div className={styles.clockArea}>
            <Clock size={13} className={styles.clockIcon} />
            <span className={`${styles.clockTime} tech-code`}>{formatDelhiTime(time)}</span>
            <span className={styles.clockZone}>IST</span>
            <span className={styles.clockDivider}>|</span>
            <span className={styles.clockDate}>{formatDelhiDate(time)}</span>
          </div>

          {/* Notifications */}
          <div className={styles.actionBtnWrapper} ref={notifRef}>
            <button
              className={styles.iconBtn}
              onClick={() => setNotificationsOpen(!notificationsOpen)}
              aria-label="System Alerts"
            >
              <Bell size={15} />
              <span className={styles.notificationBadge}>3</span>
            </button>

            <div className={`${styles.notificationsDropdown} ${notificationsOpen ? styles.notificationsDropdownOpen : ''}`}>
              <div className={styles.dropdownHeader}>
                <h4>SYSTEM ALERTS</h4>
                <button onClick={() => setNotificationsOpen(false)}>Close</button>
              </div>
              <div className={styles.dropdownContent}>
                <div className={`${styles.alertItem} ${styles.alertCritical}`}>
                  <span className={styles.alertDot} />
                  <div className={styles.alertBody}>
                    <p><strong>CRITICAL INCIDENT</strong></p>
                    <p>Evacuation initiated at Yamuna Bank, East Delhi.</p>
                    <span className={styles.alertTime}>5 mins ago</span>
                  </div>
                </div>
                <div className={`${styles.alertItem} ${styles.alertWarning}`}>
                  <span className={styles.alertDot} />
                  <div className={styles.alertBody}>
                    <p><strong>WARNING</strong></p>
                    <p>South Depot trauma kit stocks running LOW.</p>
                    <span className={styles.alertTime}>12 mins ago</span>
                  </div>
                </div>
                <div className={`${styles.alertItem} ${styles.alertInfo}`}>
                  <span className={styles.alertDot} />
                  <div className={styles.alertBody}>
                    <p><strong>INFO</strong></p>
                    <p>Rescue Boat VEH-BT-401 dispatched to East Delhi.</p>
                    <span className={styles.alertTime}>18 mins ago</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* User profile dropdown */}
          <div className={styles.actionBtnWrapper} ref={profileRef}>
            <button
              className={styles.profileTrigger}
              onClick={() => setProfileOpen(!profileOpen)}
              aria-expanded={profileOpen}
              aria-label="User profile and logout"
            >
              <div className={styles.profileBadge}>
                <ShieldCheck size={12} className={styles.shieldIcon} />
                <span>{roleLabel}</span>
              </div>
              <div className={styles.profileAvatar}>
                <User size={13} />
              </div>
              <ChevronDown size={11} className={`${styles.profileChevron} ${profileOpen ? styles.profileChevronOpen : ''}`} />
            </button>

            {/* Profile dropdown */}
            <div className={`${styles.profileDropdown} ${profileOpen ? styles.profileDropdownOpen : ''}`}>
              <div className={styles.profileDropdownInfo}>
                <span className={styles.profileName}>{authUser?.name ?? 'Officer'}</span>
                <span className={styles.profileRole}>{authUser?.role?.replace('_', ' ') ?? 'OPERATOR'}</span>
                <span className={styles.profileRegion}>{authUser?.region ?? '—'}</span>
                <span className={styles.profileOrg}>{authUser?.organization ?? '—'}</span>
              </div>
              <div className={styles.profileDropdownDivider} />
              <button
                className={styles.logoutBtn}
                onClick={handleLogout}
              >
                <LogOut size={13} />
                <span>Sign Out</span>
              </button>
            </div>
          </div>

          {/* Mobile menu toggle */}
          <button
            className={styles.mobileMenuToggle}
            onClick={() => setIsMobileOpen(!isMobileOpen)}
            aria-expanded={isMobileOpen}
            aria-label="Toggle navigation"
          >
            {isMobileOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </header>

      {/* Mobile Navigation Drawer */}
      <div className={`${styles.mobileDrawer} ${isMobileOpen ? styles.mobileDrawerOpen : ''}`}>
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `${styles.mobileNavLink} ${isActive ? styles.mobileNavLinkActive : ''}`
            }
          >
            {item.label}
          </NavLink>
        ))}
        <button className={styles.mobileLogoutBtn} onClick={handleLogout}>
          <LogOut size={13} />
          Sign Out
        </button>
      </div>

      {/* Main Content */}
      <div className={styles.bodyContainer}>
        <main className={styles.mainContent}>
          <div
            key={location.pathname}
            className={`${styles.contentWrapper} ${styles.animatePageIn}`}
          >
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default OperationsLayout;
