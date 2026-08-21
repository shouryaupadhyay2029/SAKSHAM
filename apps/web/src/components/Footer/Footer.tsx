import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import styles from './Footer.module.css';

export const Footer: React.FC = () => {
  const { t } = useTranslation();

  return (
    <footer className={styles.footer}>
      <div className={styles.footerTopDivider}>
        <div className={styles.footerTopDividerSignal} />
      </div>

      <div className={styles.footerContent}>
        {/* Brand */}
        <div className={styles.footerBrand}>
          <h3 className={styles.footerBrandTitle}>{t('footer.brandName')}</h3>
          <p className={styles.footerBrandTagline}>{t('footer.tagline')}</p>
        </div>

        {/* Links Groups */}
        <div className={styles.footerLinksGroup}>
          <div className={styles.footerCol}>
            <h4 className={styles.footerColTitle}>{t('footer.operations')}</h4>
            <Link to="/operations/command-center" className={styles.footerLink}>
              <span className={styles.footerLinkBullet}>→</span> {t('footer.commandCenter')}
            </Link>
            <Link to="/operations/incidents" className={styles.footerLink}>
              <span className={styles.footerLinkBullet}>→</span> {t('footer.liveIncidents')}
            </Link>
            <Link to="/operations/requests" className={styles.footerLink}>
              <span className={styles.footerLinkBullet}>→</span> {t('footer.demandRequests')}
            </Link>
            <Link to="/operations/resources" className={styles.footerLink}>
              <span className={styles.footerLinkBullet}>→</span> {t('footer.resourceRegistry')}
            </Link>
            <Link to="/operations/vehicles" className={styles.footerLink}>
              <span className={styles.footerLinkBullet}>→</span> {t('footer.fleetVehicles')}
            </Link>
          </div>

          <div className={styles.footerCol}>
            <h4 className={styles.footerColTitle}>{t('footer.civilian')}</h4>
            <Link to="/report" className={styles.footerLink}>
              <span className={styles.footerLinkBullet}>→</span> {t('footer.fileSos')}
            </Link>
            <Link to="/operations/shelters" className={styles.footerLink}>
              <span className={styles.footerLinkBullet}>→</span> {t('footer.shelterNetwork')}
            </Link>
            <Link to="/help" className={styles.footerLink}>
              <span className={styles.footerLinkBullet}>→</span> {t('footer.helplines')}
            </Link>
            <Link to="/officer/login" className={styles.footerLink}>
              <span className={styles.footerLinkBullet}>→</span> {t('footer.officerLogin')}
            </Link>
          </div>
        </div>
      </div>

      {/* Network Status */}
      <div className={styles.footerStatus}>
        <span className={styles.statusDot} />
        <span>{t('footer.networkOnline')}</span>
      </div>

      {/* Footer Bottom */}
      <div className={styles.footerBottom}>
        <p>{t('footer.copyright')}</p>
        <div className={styles.footerSystemLabel}>
          <span>{t('footer.systemStatus')}</span>
        </div>
      </div>

      {/* Background Wordmark */}
      <div className={styles.hugeWordmark} aria-hidden="true">
        {t('footer.brandName')}
      </div>
    </footer>
  );
};

export default Footer;
