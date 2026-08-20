import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';
import styles from './NotFound.module.css';

export const NotFound: React.FC = () => {
  return (
    <div className={styles.container}>
      <ShieldAlert size={64} className={styles.icon} />
      <h1>404 - Area Unregistered</h1>
      <p>The coordinate or panel zone you requested is outside SAKSHAM's operational system boundaries.</p>
      <Link to="/" className={styles.btn}>Return to Headquarters</Link>
    </div>
  );
};

export default NotFound;
