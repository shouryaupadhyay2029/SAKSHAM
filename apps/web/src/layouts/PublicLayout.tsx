import React from 'react';
import { Link, Outlet } from 'react-router-dom';
import styles from './PublicLayout.module.css';

export const PublicLayout: React.FC = () => {
  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.logoArea}>
          <div className={styles.logoAccent} />
          <Link to="/" className={styles.logoText}>SAKSHAM</Link>
        </div>
        <nav className={styles.nav}>
          <a href="#features" className={styles.navLink}>Platform</a>
          <a href="#how-it-works" className={styles.navLink}>How It Works</a>
          <a href="#metrics" className={styles.navLink}>Impact</a>
          <a href="#about" className={styles.navLink}>About</a>
        </nav>
        <div className={styles.ctaArea}>
          <Link to="/operations/command-center" className={styles.primaryCta}>
            Enter Command Center
          </Link>
        </div>
      </header>
      
      <main className={styles.main}>
        <Outlet />
      </main>

      <footer className={styles.footer}>
        <div className={styles.footerContent}>
          <div className={styles.footerBrand}>
            <h3>SAKSHAM</h3>
            <p>Resilient Disaster Relief & Logistics Systems</p>
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
              <a href="#">Security Protocol</a>
              <a href="#">API Documentation</a>
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
export default PublicLayout;
