import React, { useState, useEffect } from 'react';
import { NavLink, Outlet, Link, useLocation } from 'react-router-dom';
import { 
  Activity, 
  AlertTriangle, 
  Layers, 
  FileText, 
  Truck, 
  Home, 
  BarChart3, 
  Bell, 
  User, 
  Menu, 
  X, 
  Clock, 
  ChevronRight,
  ShieldCheck
} from 'lucide-react';
import styles from './OperationsLayout.module.css';

export const OperationsLayout: React.FC = () => {
  const [time, setTime] = useState(new Date());
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const location = useLocation();

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

  const navItems = [
    { path: '/operations/command-center', label: 'Command Center', icon: Activity },
    { path: '/operations/incidents', label: 'Incidents Registry', icon: AlertTriangle, badge: '5' },
    { path: '/operations/resources', label: 'Resource Registry', icon: Layers },
    { path: '/operations/requests', label: 'Demand Requests', icon: FileText, badge: '3' },
    { path: '/operations/vehicles', label: 'Vehicle Fleet', icon: Truck },
    { path: '/operations/shelters', label: 'Shelter Network', icon: Home },
    { path: '/operations/analytics', label: 'Analytics & Reports', icon: BarChart3 },
  ];

  const getPageTitle = () => {
    const activeItem = navItems.find(item => location.pathname.startsWith(item.path));
    return activeItem ? activeItem.label : 'Operations Board';
  };

  return (
    <div className={styles.layout}>
      {/* Topbar */}
      <header className={styles.topbar}>
        <div className={styles.topbarLeft}>
          <button 
            className={styles.menuToggle} 
            onClick={() => setSidebarOpen(!sidebarOpen)}
            aria-label="Toggle Sidebar"
          >
            {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          <div className={styles.logoArea}>
            <div className={styles.logoAccent} />
            <Link to="/" className={styles.logoText}>SAKSHAM</Link>
          </div>
          <span className={styles.divider} />
          <div className={styles.systemStatus}>
            <span className={styles.statusDot} />
            <span className={styles.statusText}>SYS STATUS: ACTIVE / LIVE</span>
          </div>
        </div>

        <div className={styles.topbarRight}>
          {/* Delhi Operational Clock */}
          <div className={styles.clockArea}>
            <Clock size={16} className={styles.clockIcon} />
            <div className={styles.clockTimes}>
              <span className={`${styles.clockTime} tech-code`}>{formatDelhiTime(time)}</span>
              <span className={styles.clockZone}>IST (DELHI)</span>
            </div>
            <span className={styles.clockDate}>{formatDelhiDate(time)}</span>
          </div>

          <div className={styles.divider} />

          {/* Notifications */}
          <div className={styles.actionBtnWrapper}>
            <button 
              className={styles.iconBtn} 
              onClick={() => setNotificationsOpen(!notificationsOpen)}
              aria-label="Notifications"
            >
              <Bell size={20} />
              <span className={styles.notificationBadge}>3</span>
            </button>

            {notificationsOpen && (
              <div className={styles.notificationsDropdown}>
                <div className={styles.dropdownHeader}>
                  <h4>System Alerts</h4>
                  <button onClick={() => setNotificationsOpen(false)}>Close</button>
                </div>
                <div className={styles.dropdownContent}>
                  <div className={`${styles.alertItem} ${styles.alertCritical}`}>
                    <span className={styles.alertDot} />
                    <div className={styles.alertBody}>
                      <p><strong>CRITICAL INCIDENT:</strong> Evacuation initiated at Yamuna Bank, East Delhi due to surge.</p>
                      <span className={styles.alertTime}>5 mins ago</span>
                    </div>
                  </div>
                  <div className={`${styles.alertItem} ${styles.alertWarning}`}>
                    <span className={styles.alertDot} />
                    <div className={styles.alertBody}>
                      <p><strong>WARNING:</strong> South Depot trauma kit stocks running LOW.</p>
                      <span className={styles.alertTime}>12 mins ago</span>
                    </div>
                  </div>
                  <div className={`${styles.alertItem} ${styles.alertInfo}`}>
                    <span className={styles.alertDot} />
                    <div className={styles.alertBody}>
                      <p><strong>INFO:</strong> Rescue Boat VEH-BT-401 dispatched to East Delhi.</p>
                      <span className={styles.alertTime}>18 mins ago</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* User Profile Info */}
          <div className={styles.profileArea}>
            <div className={styles.profileBadge}>
              <ShieldCheck size={14} className={styles.shieldIcon} />
              <span>NDRF OFFICER</span>
            </div>
            <div className={styles.profileAvatar}>
              <User size={16} />
            </div>
          </div>
        </div>
      </header>

      <div className={styles.bodyContainer}>
        {/* Sidebar */}
        <aside className={`${styles.sidebar} ${sidebarOpen ? styles.sidebarOpen : styles.sidebarClosed}`}>
          <nav className={styles.sidebarNav}>
            {navItems.map((item) => {
              const IconComponent = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) => 
                    `${styles.navItem} ${isActive ? styles.navItemActive : ''}`
                  }
                >
                  <IconComponent size={18} className={styles.navIcon} />
                  <span className={styles.navLabel}>{item.label}</span>
                  {item.badge && <span className={styles.navBadge}>{item.badge}</span>}
                  <ChevronRight size={14} className={styles.navArrow} />
                </NavLink>
              );
            })}
          </nav>

          <div className={styles.sidebarFooter}>
            <div className={styles.hqText}>DELHI OPERATIONS HQ</div>
            <div className={styles.latLngText}>28.6139° N, 77.2090° E</div>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className={styles.mainContent}>
          <div className={styles.pageHeader}>
            <div className={styles.breadcrumbs}>
              <Link to="/">Home</Link>
              <ChevronRight size={12} />
              <span>Operations</span>
              <ChevronRight size={12} />
              <span className={styles.currentBreadcrumb}>{getPageTitle()}</span>
            </div>
          </div>
          <div className={styles.contentWrapper}>
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default OperationsLayout;
