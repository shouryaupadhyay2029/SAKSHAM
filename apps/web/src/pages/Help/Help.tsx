import { PhoneCall, ShieldAlert, ArrowLeft, HeartHandshake } from 'lucide-react';
import { Link } from 'react-router-dom';
import styles from './Help.module.css';

export const Help: React.FC = () => {
  return (
    <div className={`${styles.container} textureCream`}>
      <div className="mb-4">
        <Link to="/" className="inline-flex items-center text-sm font-semibold text-emerald-900 gap-1 hover:underline">
          <ArrowLeft size={16} /> Back to civilian portal
        </Link>
      </div>

      <div className={styles.header}>
        <h2>Civilian Support Desk & Protocol Center</h2>
        <p className={styles.subtext}>
          Emergency hotlines, relief camp workflows, and flood/fire safety instructions during active deployment.
        </p>
      </div>

      <div className={styles.grid}>
        <div>
          <h3 className={styles.sectionTitle}>
            <HeartHandshake size={20} className="text-emerald-700" /> Operational Relief Workflows
          </h3>
          
          <div className={styles.card}>
            <h4>1. Submitting an Emergency SOS</h4>
            <p>
              Stranded civilians can broadcast live help alerts using the **[Report SOS Form](/report)**. This request gets mapped instantly to the nearest NDRF or Civil Defence dispatch terminal for active vehicle routing.
            </p>
          </div>

          <div className={styles.card}>
            <h4>2. Locating Nearest Shelter Camps</h4>
            <p>
              Emergency transit camps are located across public government schools and community centers in Delhi. Check transit capacities, check availability coordinates on maps, or consult district authorities for transport guides.
            </p>
          </div>

          <div className={styles.card}>
            <h4>3. Supply Logistics Distributions</h4>
            <p>
              SAKSHAM's fleet dispatches water tanks, dry rations, and medical kits to depots daily. If a neighborhood requires direct air drops or vehicle supplies, register requests using the civilian portal.
            </p>
          </div>
        </div>

        <div>
          <h3 className={styles.sectionTitle}>
            <PhoneCall size={20} className="text-orange-600" /> Helpline Directory
          </h3>

          <div className={styles.phoneList}>
            <div className={styles.phoneItem}>
              <span className={styles.phoneLabel}>Delhi Flood Control</span>
              <span className={styles.phoneValue}>011-22627936</span>
            </div>
            <div className={styles.phoneItem}>
              <span className={styles.phoneLabel}>National Emergency</span>
              <span className={styles.phoneValue}>112</span>
            </div>
            <div className={styles.phoneItem}>
              <span className={styles.phoneLabel}>NDRF Control Room</span>
              <span className={styles.phoneValue}>011-24363260</span>
            </div>
            <div className={styles.phoneItem}>
              <span className={styles.phoneLabel}>Fire & Rescue Desk</span>
              <span className={styles.phoneValue}>101</span>
            </div>
            <div className={styles.phoneItem}>
              <span className={styles.phoneLabel}>Ambulance Dispatch</span>
              <span className={styles.phoneValue}>102</span>
            </div>
          </div>

          <div className="mt-6 p-4 rounded bg-amber-50 border border-amber-200 text-amber-900 text-sm">
            <div className="flex items-start gap-2">
              <ShieldAlert size={18} className="mt-0.5 shrink-0" />
              <div>
                <strong className="block font-semibold mb-1">Status Advisory</strong>
                Current monsoon levels on the Yamuna banks have triggered Level-2 alerts. Restrict entry near flood zones.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Help;
