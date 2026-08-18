import React, { useState, useEffect, useRef } from 'react';
import { NavLink, Outlet, Link, useLocation } from 'react-router-dom';
import { 
  Bell, 
  User, 
  Clock, 
  ShieldCheck
} from 'lucide-react';
import styles from './OperationsLayout.module.css';

export const OperationsLayout: React.FC = () => {
  const [time, setTime] = useState(new Date());
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const location = useLocation();
  const notifRef = useRef<HTMLDivElement>(null);

  // Close notification popover on outside click
  useEffect(() => {
    if (!notificationsOpen) return;
    const handler = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotificationsOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [notificationsOpen]);

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

  const navItems: { path: string; label: string; badge?: string }[] = [
    { path: '/operations/command-center', label: 'Command Center' },
    { path: '/operations/matching', label: 'Matching' },
    { path: '/operations/dispatch', label: 'Dispatch' },
    { path: '/operations/delivery', label: 'Delivery' }
  ];

  return (
    <div className={styles.layout}>
      {/* Top navigation system similar to public landing page */}
      <header className={styles.topbar}>
        <div className={styles.topbarLeft}>
          <div className={styles.logoArea}>
            <img src="/logo.png" alt="SAKSHAM Logo" className={styles.logoImg} />
            <Link to="/" className={styles.logoText}>SAKSHAM</Link>
          </div>
          
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
          {/* Delhi Operational Clock */}
          <div className={styles.clockArea}>
            <Clock size={13} className={styles.clockIcon} />
            <span className={`${styles.clockTime} tech-code`}>{formatDelhiTime(time)}</span>
            <span className={styles.clockZone}>IST</span>
            <span className={styles.clockDivider}>|</span>
            <span className={styles.clockDate}>{formatDelhiDate(time)}</span>
          </div>

          {/* Notifications Alerts Popover */}
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

          {/* Officer badge */}
          <div className={styles.profileArea}>
            <div className={styles.profileBadge}>
              <ShieldCheck size={12} className={styles.shieldIcon} />
              <span>OFFICER</span>
            </div>
            <div className={styles.profileAvatar}>
              <User size={13} />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area without sidebar */}
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
