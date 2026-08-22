import { Link } from 'react-router-dom';
import { ArrowRight, Navigation } from 'lucide-react';
import { useOperationalState } from '../../context/OperationalStateContext';
import styles from './RoutingPanel.module.css';

interface RoutingPanelProps {
  className?: string;
  onOpenOptimizer?: () => void;
}

export const RoutingPanel: React.FC<RoutingPanelProps> = ({ className, onOpenOptimizer }) => {
  const { vehicles, missions, requests } = useOperationalState();

  const availableVehicles = vehicles.filter((v) => v.status === 'AVAILABLE').length;
  const activeDispatches = missions.filter((m) => m.status !== 'DELIVERED').length;
  const pendingDemands = requests.filter((r) => r.status === 'PENDING' || r.status === 'ALLOCATED').length;

  return (
    <div className={`${styles.routingPanel} ${className || ''}`}>
      <div className={styles.panelHeader}>
        <h3 className={styles.panelTitle}>
          <Navigation size={14} color="#E86F16" />
          <span>Fleet Routing & Optimization</span>
        </h3>
        <span className={styles.badgeAI}>OR-Tools</span>
      </div>

      <div className={styles.metricsGrid}>
        <div className={styles.metricItem}>
          <span className={styles.metricLabel}>Fleet Ready</span>
          <span className={styles.metricValue}>{availableVehicles} Units</span>
        </div>
        <div className={styles.metricItem}>
          <span className={styles.metricLabel}>Active Routes</span>
          <span className={styles.metricValue}>{activeDispatches}</span>
        </div>
        <div className={styles.metricItem}>
          <span className={styles.metricLabel}>Pending Stops</span>
          <span className={styles.metricValue}>{pendingDemands}</span>
        </div>
      </div>

      {/* Active Missions Quick List */}
      <div className={styles.activeRoutesList}>
        {missions.slice(0, 3).map((mission) => (
          <Link
            to="/operations/dispatch"
            key={mission.id}
            className={styles.routeMiniCard}
          >
            <div>
              <div className={styles.routeMiniName}>{mission.vehicleId} · {mission.destinationName}</div>
              <div className={styles.routeMiniSub}>{mission.resourceType} ({mission.quantity} {mission.unit})</div>
            </div>
            <span className={styles.routeMiniDist}>{mission.distanceKm} km</span>
          </Link>
        ))}
        {missions.length === 0 && (
          <div style={{ fontSize: '11.5px', color: '#64748B', textAlign: 'center', padding: '8px 0' }}>
            No active multi-stop routes. Run optimizer to generate fleet paths.
          </div>
        )}
      </div>

      <div className={styles.panelFooter}>
        <span style={{ fontSize: '11px', color: '#64748B' }}>
          OpenStreetMap Road Network
        </span>
        <Link
          to="/operations/route-optimizer"
          className={styles.consoleLink}
          onClick={onOpenOptimizer}
        >
          <span>Open Optimizer Console</span>
          <ArrowRight size={13} />
        </Link>
      </div>
    </div>
  );
};

export default RoutingPanel;
