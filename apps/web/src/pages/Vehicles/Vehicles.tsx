import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useOperationalState } from '../../context/OperationalStateContext';
import styles from './Vehicles.module.css';
import { PageGuideTrigger, PageGuidebook } from '../../components/ui/PageGuide';
import { ShaderBackground } from '../../components/ui/ShaderBackground';

const VEHICLE_TYPE_LABELS: Record<string, string> = {
  TRUCK: 'TRUCK',
  AMBULANCE: 'AMBULANCE',
  HELICOPTER: 'HELICOPTER',
  RESCUE_BOAT: 'RESCUE BOAT',
  DRONE: 'DRONE',
};

const STATUS_DISPLAY: Record<string, string> = {
  EN_ROUTE: 'EN ROUTE',
  DISPATCHED: 'DISPATCHED',
  AVAILABLE: 'AVAILABLE',
  MAINTENANCE: 'MAINTENANCE',
  RETURNING: 'RETURNING',
  ARRIVED: 'ARRIVED',
};

export const Vehicles: React.FC = () => {
  const { t } = useTranslation();
  const { vehicles } = useOperationalState();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 60);
    return () => clearTimeout(t);
  }, []);

  const filteredVehicles = vehicles.filter(veh => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      veh.name.toLowerCase().includes(q) ||
      veh.driverName.toLowerCase().includes(q) ||
      veh.id.toLowerCase().includes(q) ||
      veh.type.toLowerCase().includes(q) ||
      (veh.cargo && veh.cargo.toLowerCase().includes(q));
    const matchesStatus = statusFilter === 'ALL' || veh.status === statusFilter;
    const matchesType = typeFilter === 'ALL' || veh.type === typeFilter;
    return matchesSearch && matchesStatus && matchesType;
  });

  const selectedVehicle = vehicles.find(v => v.id === selectedVehicleId) || null;

  const statusCounts = {
    total: vehicles.length,
    enRoute: vehicles.filter(v => v.status === 'EN_ROUTE').length,
    dispatched: vehicles.filter(v => v.status === 'DISPATCHED').length,
    available: vehicles.filter(v => v.status === 'AVAILABLE').length,
    critical: vehicles.filter(v => v.status === 'DISPATCHED' || v.status === 'EN_ROUTE').length,
  };

  const statusPills = ['ALL', 'AVAILABLE', 'EN_ROUTE', 'DISPATCHED', 'MAINTENANCE'];
  const typePills = ['ALL', 'TRUCK', 'AMBULANCE', 'HELICOPTER', 'RESCUE_BOAT', 'DRONE'];

  return (
    <div className={`${styles.container} ${mounted ? styles.mounted : ''}`}>

      <header className={`${styles.pageHeader} shaderHeaderWrapper`}>
        <ShaderBackground className="absolute inset-0" />
        <div className={styles.headerTitles}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap', marginBottom: '8px' }}>
            <span className={styles.eyebrow} style={{ marginBottom: 0 }}>FLEET OPERATIONS</span>
            <PageGuideTrigger />
          </div>
          <h1 className={`${styles.title} reveal-block`} data-reveal-color="#3B82F6">{t('vehicles.title')}</h1>
          <p className={styles.lead}>{t('vehicles.subtitle')}</p>
        </div>
        <div className={styles.headerActions}>
          <div className={styles.liveStatus}>
            <span className={styles.liveDot} />
            <span className={styles.liveLabel}>FLEET NETWORK LIVE</span>
          </div>
          <div className={styles.unitCount}>
            <span className={styles.unitNum}>{String(vehicles.length).padStart(2, '0')}</span>
            <span className={styles.unitLabel}>UNITS TRACKED</span>
          </div>
        </div>
      </header>

      {/* ── 2. Summary Strip ── */}
      <div className={styles.statsStrip}>
        <div className={styles.statCell}>
          <span className={styles.statNum}>{String(statusCounts.total).padStart(2, '0')}</span>
          <span className={styles.statLabel}>UNITS TRACKED</span>
        </div>
        <div className={styles.statDivider} />
        <div className={styles.statCell}>
          <span className={`${styles.statNum} ${styles.warningAccent}`}>{String(statusCounts.enRoute).padStart(2, '0')}</span>
          <span className={styles.statLabel}>EN ROUTE</span>
        </div>
        <div className={styles.statDivider} />
        <div className={styles.statCell}>
          <span className={`${styles.statNum} ${styles.dispatchAccent}`}>{String(statusCounts.dispatched).padStart(2, '0')}</span>
          <span className={styles.statLabel}>DISPATCHED</span>
        </div>
        <div className={styles.statDivider} />
        <div className={styles.statCell}>
          <span className={`${styles.statNum} ${styles.successAccent}`}>{String(statusCounts.available).padStart(2, '0')}</span>
          <span className={styles.statLabel}>AVAILABLE</span>
        </div>
        <div className={styles.statDivider} />
        <div className={styles.statCell}>
          <span className={`${styles.statNum} ${styles.criticalAccent}`}>{String(statusCounts.critical).padStart(2, '0')}</span>
          <span className={styles.statLabel}>ON MISSION</span>
        </div>
      </div>

      {/* ── 3. Filter Bar ── */}
      <div className={styles.filterBar}>
        <div className={styles.searchWrapper}>
          <SearchIcon className={styles.searchIcon} />
          <input
            type="text"
            placeholder={t('vehicles.searchPlaceholder')}
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>
        <div className={styles.filterGroups}>
          <div className={styles.filterPills}>
            {statusPills.map(s => (
              <button
                key={s}
                className={`${styles.filterPill} ${statusFilter === s ? styles.filterPillActive : ''}`}
                onClick={() => setStatusFilter(s)}
              >
                {s === 'ALL' ? t('common.all') : (t(`status.${s}`) || s)}
              </button>
            ))}
          </div>
          <div className={styles.pillDivider} />
          <div className={styles.filterPills}>
            {typePills.map(tKey => (
              <button
                key={tKey}
                className={`${styles.filterPill} ${typeFilter === tKey ? styles.filterPillActive : ''}`}
                onClick={() => setTypeFilter(tKey)}
              >
                {tKey === 'ALL' ? t('common.all') : tKey.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── 4. Main Split Workspace ── */}
      <div className={styles.splitWorkspace}>

        {/* Left: Fleet Registry */}
        <div className={styles.registryColumn}>
          {filteredVehicles.length === 0 ? (
            <div className={styles.emptyState}>
              <TruckIcon />
              <p>{t('common.noResultsFound')}</p>
            </div>
          ) : (
            <div className={styles.fleetList}>
              {filteredVehicles.map((veh, i) => {
                const isSelected = veh.id === selectedVehicleId;
                return (
                  <div
                    key={veh.id}
                    className={`${styles.fleetUnit} ${isSelected ? styles.fleetUnitSelected : ''}`}
                    style={{ animationDelay: `${i * 70}ms` }}
                    onClick={() => setSelectedVehicleId(isSelected ? null : veh.id)}
                  >
                    <div className={styles.unitTop}>
                      <span className={`${styles.unitStatus} ${styles['vStatus_' + veh.status]}`}>
                        {veh.status === 'EN_ROUTE' || veh.status === 'DISPATCHED' ? (
                          <span className={styles.statusPulse} />
                        ) : null}
                        {t(`status.${veh.status}`) || veh.status}
                      </span>
                      <span className={styles.unitId}>{veh.id}</span>
                    </div>

                    <div className={styles.unitMain}>
                      <h3 className={styles.unitName}>{veh.name}</h3>
                      <div className={styles.unitMeta}>
                        <span className={styles.unitType}>{VEHICLE_TYPE_LABELS[veh.type] || veh.type}</span>
                        <span className={styles.metaDot}>·</span>
                        <span>Capacity {veh.capacity}</span>
                      </div>
                    </div>

                    {veh.cargo && (
                      <div className={styles.unitCargo}>
                        <span className={styles.cargoLabel}>ACTIVE MISSION</span>
                        <span className={styles.cargoValue}>{veh.cargo}</span>
                      </div>
                    )}

                    <div className={styles.unitFooter}>
                      <div className={styles.footerLeft}>
                        <div className={styles.coordLine}>
                          <PinIcon />
                          <span className="tech-code">{veh.location.lat.toFixed(4)}° N, {veh.location.lng.toFixed(4)}° E</span>
                        </div>
                        {veh.speedKmh && (
                          <span className={styles.speedChip}>{veh.speedKmh} km/h</span>
                        )}
                      </div>
                      <div className={styles.footerRight}>
                        <div className={styles.driverLine}>
                          <span className={styles.radioLabel}>RADIO {veh.driverContact}</span>
                          <span className={styles.driverName}>{veh.driverName}</span>
                        </div>
                        <span className={styles.viewArrow}>VIEW UNIT →</span>
                      </div>
                    </div>

                    {isSelected && <div className={styles.selectedAccent} />}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right: Detail Panel */}
        <div className={styles.ledgerColumn}>
          <ShaderBackground style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0.85, pointerEvents: 'none', zIndex: 0 }} />
          {selectedVehicle ? (
            <div className={styles.ledgerContent}>
              <div className={styles.ledgerHeader}>
                <div className={styles.titleArea}>
                  <div className={styles.metaRow}>
                    <span className="tech-code font-bold" style={{ color: '#FAF8F3' }}>{selectedVehicle.id}</span>
                    <span className={`${styles.detailStatus} ${styles['vStatus_' + selectedVehicle.status]}`}>
                      {selectedVehicle.status === 'EN_ROUTE' || selectedVehicle.status === 'DISPATCHED' ? (
                        <span className={styles.statusPulse} />
                      ) : null}
                      {STATUS_DISPLAY[selectedVehicle.status] || selectedVehicle.status}
                    </span>
                  </div>
                  <h3 className={styles.ledgerName}>{selectedVehicle.name}</h3>
                </div>
                <button className={styles.closeLedgerBtn} onClick={() => setSelectedVehicleId(null)}>
                  <CloseIcon />
                </button>
              </div>

              {/* Mission */}
              {selectedVehicle.cargo && (
                <div className={styles.ledgerSection}>
                  <span className={styles.sectionTitle}>CURRENT MISSION</span>
                  <div className={styles.missionBlock}>
                    <p className={styles.missionCargo}>{selectedVehicle.cargo}</p>
                  </div>
                </div>
              )}

              {/* Route Diagram */}
              <div className={styles.ledgerSection}>
                <span className={styles.sectionTitle}>ROUTE VISUALIZATION</span>
                <div className={styles.routeDiagram}>
                  <div className={styles.routeNode}>
                    <span className={styles.routeNodeLabel}>ORIGIN DEPOT</span>
                    <span className={styles.routeNodeValue}>{(selectedVehicle as any).depotName || (selectedVehicle as any).depot || 'Central Operations Base'}</span>
                  </div>
                  <div className={styles.routeConnector}>
                    <div className={styles.routeLine} />
                    <span className={styles.routeDist}>{(selectedVehicle as any).distanceKm ? `${(selectedVehicle as any).distanceKm} km` : '—'}</span>
                    <div className={styles.routeLine} />
                  </div>
                  <div className={`${styles.routeNode} ${styles.routeNodeActive}`}>
                    <span className={styles.routeNodeLabel}>VEHICLE NOW</span>
                    <span className={styles.routeNodeValue}>{selectedVehicle.id}</span>
                    {selectedVehicle.speedKmh && (
                      <span className={styles.routeSpeed}>{selectedVehicle.speedKmh} km/h</span>
                    )}
                  </div>
                  {selectedVehicle.destination && (
                    <>
                      <div className={styles.routeConnector}>
                        <div className={styles.routeLine} />
                        {selectedVehicle.etaMinutes ? (
                          <span className={styles.routeEta}>ETA {selectedVehicle.etaMinutes} MIN</span>
                        ) : <span className={styles.routeDist}>IN TRANSIT</span>}
                        <div className={styles.routeLine} />
                      </div>
                      <div className={styles.routeNode}>
                        <span className={styles.routeNodeLabel}>DESTINATION</span>
                        <span className={styles.routeNodeValue}>{(selectedVehicle as any).destinationName || `${selectedVehicle.destination.lat.toFixed(4)}°N, ${selectedVehicle.destination.lng.toFixed(4)}°E`}</span>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Location */}
              <div className={styles.ledgerSection}>
                <span className={styles.sectionTitle}>LIVE COORDINATES</span>
                <div className={styles.gridData}>
                  <div className={styles.gridRow}>
                    <span className={styles.gridLabel}>LATITUDE</span>
                    <span className="tech-code" style={{ color: '#FAF8F3' }}>{selectedVehicle.location.lat.toFixed(4)}° N</span>
                  </div>
                  <div className={styles.gridRow}>
                    <span className={styles.gridLabel}>LONGITUDE</span>
                    <span className="tech-code" style={{ color: '#FAF8F3' }}>{selectedVehicle.location.lng.toFixed(4)}° E</span>
                  </div>
                  {selectedVehicle.speedKmh && (
                    <div className={styles.gridRow}>
                      <span className={styles.gridLabel}>GROUND SPEED</span>
                      <span className="tech-code" style={{ color: '#FAF8F3' }}>{selectedVehicle.speedKmh} km/h</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Driver */}
              <div className={styles.ledgerSection}>
                <span className={styles.sectionTitle}>OPERATOR</span>
                <div className={styles.gridData}>
                  <div className={styles.gridRow}>
                    <span className={styles.gridLabel}>DRIVER / PILOT</span>
                    <span style={{ fontWeight: 700, color: '#FAF8F3' }}>{selectedVehicle.driverName}</span>
                  </div>
                  <div className={styles.gridRow}>
                    <span className={styles.gridLabel}>RADIO FREQUENCY</span>
                    <span className="tech-code" style={{ color: '#FAF8F3' }}>{selectedVehicle.driverContact}</span>
                  </div>
                  <div className={styles.gridRow}>
                    <span className={styles.gridLabel}>VEHICLE TYPE</span>
                    <span style={{ color: '#FAF8F3' }}>{VEHICLE_TYPE_LABELS[selectedVehicle.type] || selectedVehicle.type}</span>
                  </div>
                  <div className={styles.gridRow}>
                    <span className={styles.gridLabel}>CAPACITY</span>
                    <span style={{ color: '#FAF8F3' }}>{selectedVehicle.capacity}</span>
                  </div>
                </div>
              </div>

              <div className={styles.ledgerActions}>
                <button className={styles.primaryActionBtn}>TRACK LIVE UNIT</button>
              </div>
            </div>
          ) : (
            <div className={styles.emptyLedger}>
              <div className={styles.emptyLedgerContent}>
                <TruckIcon size={32} className={styles.emptyIcon} />
                <h4>SELECT A UNIT</h4>
                <p>Click any fleet unit from the registry to view live mission details and route visualization.</p>
              </div>
            </div>
          )}
        </div>
      </div>

      <PageGuidebook guideKey="vehicles" />
    </div>
  );
};

/* ── Inline SVG Icons ── */
const SearchIcon = ({ className }: { className?: string }) => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
  </svg>
);

const PinIcon = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" /><circle cx="12" cy="10" r="3" />
  </svg>
);

const CloseIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 6 6 18M6 6l12 12" />
  </svg>
);

const TruckIcon = ({ size = 24, className }: { size?: number; className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M5 17H3a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11a2 2 0 0 1 2 2v3" />
    <rect width="9" height="11" x="11" y="6" rx="2" />
    <circle cx="7" cy="17" r="2" /><circle cx="17" cy="17" r="2" />
  </svg>
);

export default Vehicles;
