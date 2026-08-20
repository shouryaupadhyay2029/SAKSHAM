import React from 'react';
import { Link } from 'react-router-dom';
import { Shield, ArrowLeft } from 'lucide-react';
import styles from './OfficerLogin.module.css';

/**
 * Forgot Password — placeholder page.
 * Password recovery is handled through the organization's authorized access system.
 * This page exists as a UI entry point for future backend integration.
 */
export const ForgotPassword: React.FC = () => {
  return (
    <div className={styles.page} style={{ gridTemplateColumns: '1fr' }}>
      <div className={styles.formArea} style={{ maxWidth: 480 }}>
        <Link to="/officer/login" className={styles.backLink}>
          <ArrowLeft size={13} />
          <span>Back to Officer Login</span>
        </Link>

        <div className={styles.brand}>
          <div className={styles.brandMark}>
            <Shield size={20} className={styles.brandShield} />
          </div>
          <span className={styles.brandName}>SAKSHAM</span>
        </div>

        <div className={styles.headingBlock}>
          <p className={styles.accessLabel}>PASSWORD RECOVERY</p>
          <h1 className={styles.heading} style={{ fontSize: 28 }}>Forgot Password?</h1>
          <p className={styles.subtext} style={{ marginTop: 16, lineHeight: 1.7 }}>
            Password recovery is handled through your organization's authorized access system.
            <br /><br />
            Contact your SAKSHAM system administrator or your organization's IT helpdesk
            to reset your credentials.
          </p>
        </div>

        <div className={styles.civilianSeparator}>
          <span className={styles.civilianText}>
            Not an officer? Emergency assistance is available without an account.
          </span>
          <Link to="/report" className={styles.civilianLink}>
            Get Help →
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
