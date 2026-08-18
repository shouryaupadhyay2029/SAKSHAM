import React, { useState, useEffect } from 'react';
import { useOperationalState } from '../../context/OperationalStateContext';
import styles from './Shelters.module.css';

const STATUS_DISPLAY: Record<string, string> = {
  OPEN: 'OPEN',
  FULL: 'NEAR CAPACITY',
  CLOSED: 'CLOSED',
};

// Demand/resource context cross-link per shelter (derived from mock data)
const SHELTER_DEMAND: Record<string, { displaced: number; need: string; resourceNeed: string }> = {
  'SHL-DEL-001': { displaced: 280, need: '280 displaced persons', resourceNeed: '500 Thermal Blankets' },
  'SHL-DEL-002': { displaced: 90, need: '90 overflow displaced persons', resourceNeed: 'Emergency Food Packets' },
  'SHL-DEL-003': { displaced: 0, need: '—', resourceNeed: '—' },
  'SHL-DEL-004': { displaced: 0, need: '—', resourceNeed: '—' },
};

export const Shelters: React.FC = () => {
  const { shelters, requests } = useOperationalState();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedShelterId, setSelectedShelterId] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 60);
    return () => clearTimeout(t);
  }, []);

  const filteredShelters = shelters.filter(shl => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      shl.name.toLowerCase().includes(q) ||
      shl.locationName.toLowerCase().includes(q) ||
      shl.id.toLowerCase().includes(q);
    const matchesStatus = statusFilter === 'ALL' || shl.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const selectedShelter = shelters.find(s => s.id === selectedShelterId) || null;

  // Stats
  const totalCapacity = shelters.reduce((a, s) => a + s.capacityTotal, 0);
  const totalOccupied = shelters.reduce((a, s) => a + s.capacityOccupied, 0);
  const networkPct = totalCapacity > 0 ? Math.round((totalOccupied / totalCapacity) * 100) : 0;
  const openCount = shelters.filter(s => s.status === 'OPEN').length;
  const nearCapacity = shelters.filter(s => {
    const pct = s.capacityTotal > 0 ? s.capacityOccupied / s.capacityTotal : 0;
    return pct >= 0.85;
  }).length;
  const closedCount = shelters.filter(s => s.status === 'CLOSED').length;

  const statusPills = ['ALL', 'OPEN', 'FULL', 'CLOSED'];

  // Pending requests for shelter context
  const pendingRequests = requests.filter(r => r.status === 'PENDING' || r.status === 'ALLOCATED');

  return (
    <div className={`${styles.container} ${mounted ? styles.mounted : ''}`}>

      {/* ── 1. Page Header ── */}
      <header className={styles.pageHeader}>
        <div className={styles.headerTitles}>
          <span className={styles.eyebrow}>SHELTER OPERATIONS</span>
          <h1 className={styles.title}>Emergency Shelter Network</h1>
          <p className={styles.lead}>Monitor shelter occupancy, available facilities and safe capacity across the response region.</p>
        </div>
        <div className={styles.headerActions}>
          <div className={styles.liveStatus}>
            <span className={styles.liveDot} />
            <span className={styles.liveLabel}>SHELTER NETWORK LIVE</span>
          </div>
          <div className={styles.unitCount}>
            <span className={styles.unitNum}>{String(shelters.length).padStart(2, '0')}</span>
            <span className={styles.unitLabel}>FACILITIES</span>
          </div>
        </div>
      </header>

      {/* ── 2. Summary Strip ── */}
      <div className={styles.statsStrip}>
        <div className={styles.statCell}>
          <span className={styles.statNum}>{String(shelters.length).padStart(2, '0')}</span>
          <span className={styles.statLabel}>ACTIVE FACILITIES</span>
        </div>
        <div className={styles.statDivider} />
        <div className={styles.statCell}>
          <span className={`${styles.statNum} ${styles.warningAccent}`}>{nearCapacity}</span>
          <span className={styles.statLabel}>NEAR CAPACITY</span>
        </div>
        <div className={styles.statDivider} />
        <div className={styles.statCell}>
          <span className={`${styles.statNum} ${styles.successAccent}`}>{openCount}</span>
          <span className={styles.statLabel}>OPEN</span>
        </div>
        <div className={styles.statDivider} />
        <div className={styles.statCell}>
          <span className={`${styles.statNum} ${styles.mutedAccent}`}>{closedCount}</span>
          <span className={styles.statLabel}>CLOSED</span>
        </div>
        <div className={styles.statDivider} />
        <div className={styles.statCell}>
          <span className={`${styles.statNum} ${networkPct >= 80 ? styles.warningAccent : styles.successAccent}`}>{networkPct}%</span>
          <span className={styles.statLabel}>NETWORK CAPACITY</span>
        </div>
      </div>

      {/* ── 3. Filter Bar ── */}
      <div className={styles.filterBar}>
        <div className={styles.searchWrapper}>
          <SearchIcon className={styles.searchIcon} />
          <input
            type="text"
            placeholder="Search shelter, sector, facility..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>
        <div className={styles.filterPills}>
          {statusPills.map(s => (
            <button
              key={s}
              className={`${styles.filterPill} ${statusFilter === s ? styles.filterPillActive : ''}`}
              onClick={() => setStatusFilter(s)}
            >
              {s === 'FULL' ? 'NEAR CAPACITY' : s}
            </button>
          ))}
        </div>
      </div>

      {/* ── 4. Near-capacity Alert ── */}
      {shelters.filter(s => s.capacityTotal > 0 && s.capacityOccupied / s.capacityTotal >= 0.9).map(s => (
        <div key={s.id + '_alert'} className={styles.nearCapacityAlert}>
          <AlertIcon />
          <div className={styles.alertText}>
            <span className={styles.alertBadge}>NEAR CAPACITY</span>
            <span className={styles.alertName}>{s.name}</span>
            <span className={styles.alertDetail}>{s.capacityTotal - s.capacityOccupied} beds remaining</span>
          </div>
          <button className={styles.alertViewBtn} onClick={() => setSelectedShelterId(s.id)}>VIEW FACILITY →</button>
        </div>
      ))}

      {/* ── 5. Main Split Workspace ── */}
      <div className={styles.splitWorkspace}>

        {/* Left: Shelter Registry */}
        <div className={styles.registryColumn}>
          {filteredShelters.length === 0 ? (
            <div className={styles.emptyState}>
              <HomeIcon size={28} />
              <p>No shelter facilities match current filter criteria.</p>
            </div>
          ) : (
            <div className={styles.shelterList}>
              {filteredShelters.map((shl, i) => {
                const occPct = shl.capacityTotal > 0
                  ? Math.round((shl.capacityOccupied / shl.capacityTotal) * 100)
                  : 0;
                const available = shl.capacityTotal - shl.capacityOccupied;
                const isSelected = shl.id === selectedShelterId;
                const capColor = occPct >= 90 ? '#DC2626' : occPct >= 70 ? '#E86F16' : '#059669';

                return (
                  <div
                    key={shl.id}
                    className={`${styles.shelterUnit} ${isSelected ? styles.shelterUnitSelected : ''}`}
                    style={{ animationDelay: `${i * 80}ms` }}
                    onClick={() => setSelectedShelterId(isSelected ? null : shl.id)}
                  >
                    <div className={styles.unitTop}>
                      <span className={`${styles.unitStatus} ${styles['sStatus_' + shl.status]}`}>
                        {shl.status === 'OPEN' ? <span className={styles.statusPulse} /> : null}
                        {STATUS_DISPLAY[shl.status] || shl.status}
                      </span>
                      <span className={styles.unitId}>{shl.id}</span>
                    </div>

                    <div className={styles.unitMain}>
                      <h3 className={styles.unitName}>{shl.name}</h3>
                      <p className={styles.unitLocation}>
                        <PinIcon />
                        {shl.locationName}
                      </p>
                    </div>

                    {/* Capacity Meter */}
                    <div className={styles.capacityBlock}>
                      <div className={styles.capacityHeader}>
                        <span className={styles.capacityLabel}>OCCUPANCY</span>
                        <span className={styles.capacityFraction} style={{ color: capColor }}>
                          {shl.capacityOccupied.toLocaleString()} / {shl.capacityTotal.toLocaleString()} BEDS
                        </span>
                      </div>
                      <div className={styles.capacityMeterTrack}>
                        <div
                          className={styles.capacityMeterFill}
                          style={{ width: `${occPct}%`, backgroundColor: capColor }}
                        />
                      </div>
                      <div className={styles.capacityFooter}>
                        <span className={styles.capacityPct} style={{ color: capColor }}>{occPct}%</span>
                        {shl.status !== 'CLOSED' && (
                          <span className={styles.availableBeds}>
                            {available.toLocaleString()} beds available
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Facilities */}
                    {shl.resourcesAvailable.length > 0 && (
                      <div className={styles.facilitiesRow}>
                        {shl.resourcesAvailable.slice(0, 3).map((f, fi) => (
                          <span key={fi} className={styles.facilityTag}>{f}</span>
                        ))}
                        {shl.resourcesAvailable.length > 3 && (
                          <span className={styles.facilityMore}>+{shl.resourcesAvailable.length - 3}</span>
                        )}
                      </div>
                    )}

                    <div className={styles.unitFooter}>
                      <div className={styles.contactLine}>
                        <span className={styles.contactName}>{shl.contactPerson}</span>
                        <span className={styles.contactPhone}>{shl.contactNumber}</span>
                      </div>
                      <span className={styles.viewArrow}>VIEW SHELTER →</span>
                    </div>

                    {isSelected && <div className={styles.selectedAccent} />}
                  </div>
                );
              })}
            </div>
          )}

          {/* ── Shelter Network Overview ── */}
          <div className={styles.networkSection}>
            <span className={styles.networkTitle}>SHELTER CAPACITY NETWORK</span>
            <div className={styles.networkGrid}>
              {shelters.map(shl => {
                const pct = shl.capacityTotal > 0
                  ? Math.round((shl.capacityOccupied / shl.capacityTotal) * 100)
                  : 0;
                const color = pct >= 90 ? '#DC2626' : pct >= 70 ? '#E86F16' : shl.status === 'CLOSED' ? '#9CA3AF' : '#059669';
                return (
                  <div
                    key={shl.id}
                    className={`${styles.networkCard} ${selectedShelterId === shl.id ? styles.networkCardActive : ''}`}
                    onClick={() => setSelectedShelterId(selectedShelterId === shl.id ? null : shl.id)}
                  >
                    <span className={styles.networkName}>{shl.name.split(' ')[0].toUpperCase()}</span>
                    <span className={styles.networkPct} style={{ color }}>{pct}%</span>
                    <div className={styles.networkBar}>
                      <div style={{ width: `${pct}%`, backgroundColor: color, height: '100%', borderRadius: '2px', transition: 'width 0.5s ease' }} />
                    </div>
                    <span className={styles.networkOcc}>{shl.capacityOccupied.toLocaleString()} / {shl.capacityTotal.toLocaleString()}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right: Detail Ledger */}
        <div className={styles.ledgerColumn}>
          {selectedShelter ? (() => {
            const occPct = selectedShelter.capacityTotal > 0
              ? Math.round((selectedShelter.capacityOccupied / selectedShelter.capacityTotal) * 100)
              : 0;
            const available = selectedShelter.capacityTotal - selectedShelter.capacityOccupied;
            const capColor = occPct >= 90 ? '#DC2626' : occPct >= 70 ? '#E86F16' : '#059669';
            const demandCtx = SHELTER_DEMAND[selectedShelter.id];
            const relatedRequests = pendingRequests.filter(r =>
              Math.abs(r.coordinates.lat - selectedShelter.coordinates.lat) < 0.05 &&
              Math.abs(r.coordinates.lng - selectedShelter.coordinates.lng) < 0.05
            );

            return (
              <div className={styles.ledgerContent}>
                <div className={styles.ledgerHeader}>
                  <div className={styles.titleArea}>
                    <div className={styles.metaRow}>
                      <span className="tech-code font-bold">{selectedShelter.id}</span>
                      <span className={`${styles.detailStatus} ${styles['sStatus_' + selectedShelter.status]}`}>
                        {selectedShelter.status === 'OPEN' && <span className={styles.statusPulse} />}
                        {STATUS_DISPLAY[selectedShelter.status] || selectedShelter.status}
                      </span>
                    </div>
                    <h3 className={styles.ledgerName}>{selectedShelter.name}</h3>
                  </div>
                  <button className={styles.closeLedgerBtn} onClick={() => setSelectedShelterId(null)}>
                    <CloseIcon />
                  </button>
                </div>

                {/* Occupancy */}
                <div className={styles.ledgerSection}>
                  <span className={styles.sectionTitle}>OCCUPANCY</span>
                  <div className={styles.occupancyPanel}>
                    <div className={styles.occNumbers}>
                      <span className={styles.occMain} style={{ color: capColor }}>
                        {occPct}%
                      </span>
                      <div className={styles.occDetail}>
                        <span style={{ fontWeight: 800, fontSize: 15, color: '#0B2119' }}>
                          {selectedShelter.capacityOccupied.toLocaleString()} / {selectedShelter.capacityTotal.toLocaleString()}
                        </span>
                        <span style={{ fontSize: 11, color: 'rgba(11,33,25,0.5)' }}>
                          {available.toLocaleString()} beds available
                        </span>
                      </div>
                    </div>
                    <div className={styles.occMeterTrack}>
                      <div className={styles.occMeterFill} style={{ width: `${occPct}%`, backgroundColor: capColor }} />
                    </div>
                    <div className={styles.occStatus}>
                      {occPct >= 90 ? (
                        <span className={styles.occBadgeRed}>CRITICAL — {available} BEDS REMAINING</span>
                      ) : occPct >= 70 ? (
                        <span className={styles.occBadgeOrange}>APPROACHING CAPACITY</span>
                      ) : (
                        <span className={styles.occBadgeGreen}>SAFE CAPACITY</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Facilities */}
                <div className={styles.ledgerSection}>
                  <span className={styles.sectionTitle}>AVAILABLE FACILITIES</span>
                  <div className={styles.facilitiesList}>
                    {selectedShelter.resourcesAvailable.length === 0 ? (
                      <span style={{ fontSize: 12, color: 'rgba(11,33,25,0.4)' }}>No facilities logged.</span>
                    ) : selectedShelter.resourcesAvailable.map((f, fi) => (
                      <div key={fi} className={styles.facilityRow}>
                        <CheckIcon />
                        <span>{f}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Location */}
                <div className={styles.ledgerSection}>
                  <span className={styles.sectionTitle}>LOCATION</span>
                  <div className={styles.gridData}>
                    <div className={styles.gridRow}>
                      <span className={styles.gridLabel}>ADDRESS</span>
                      <span style={{ fontWeight: 600, fontSize: 12 }}>{selectedShelter.locationName}</span>
                    </div>
                    <div className={styles.gridRow}>
                      <span className={styles.gridLabel}>COORDINATES</span>
                      <span className="tech-code">{selectedShelter.coordinates.lat.toFixed(4)}° N, {selectedShelter.coordinates.lng.toFixed(4)}° E</span>
                    </div>
                  </div>
                </div>

                {/* Contact */}
                <div className={styles.ledgerSection}>
                  <span className={styles.sectionTitle}>CONTACT</span>
                  <div className={styles.gridData}>
                    <div className={styles.gridRow}>
                      <span className={styles.gridLabel}>COORDINATOR</span>
                      <span style={{ fontWeight: 700 }}>{selectedShelter.contactPerson}</span>
                    </div>
                    <div className={styles.gridRow}>
                      <span className={styles.gridLabel}>PHONE</span>
                      <span className="tech-code">{selectedShelter.contactNumber}</span>
                    </div>
                  </div>
                </div>

                {/* Demand Connection */}
                {demandCtx && demandCtx.displaced > 0 && (
                  <div className={styles.demandLink}>
                    <span className={styles.sectionTitle}>DEMAND CONNECTION</span>
                    <div className={styles.demandBlock}>
                      <div className={styles.demandRow}>
                        <span className={styles.demandLabel}>CURRENT DEMAND</span>
                        <span className={styles.demandValue}>{demandCtx.need}</span>
                      </div>
                      <div className={styles.demandRow}>
                        <span className={styles.demandLabel}>RESOURCE NEED</span>
                        <span className={styles.demandValue}>{demandCtx.resourceNeed}</span>
                      </div>
                      {relatedRequests.length > 0 ? (
                        <div className={styles.demandMatch}>
                          <CheckIcon />
                          <span>RESOURCE MATCH AVAILABLE</span>
                        </div>
                      ) : (
                        <div className={styles.demandNoMatch}>
                          <AlertIcon size={12} />
                          <span>NO MATCHED RESOURCE YET</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div className={styles.ledgerActions}>
                  <button className={styles.primaryActionBtn}>VIEW ON MAP</button>
                  <button className={styles.secondaryActionBtn}>ALLOCATE DEMAND</button>
                </div>
              </div>
            );
          })() : (
            <div className={styles.emptyLedger}>
              <HomeIcon size={28} />
              <h4>SELECT A FACILITY</h4>
              <p>Click any shelter from the registry to view occupancy details, facilities and demand connections.</p>
            </div>
          )}
        </div>
      </div>
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
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
    <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" /><circle cx="12" cy="10" r="3" />
  </svg>
);

const CloseIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 6 6 18M6 6l12 12" />
  </svg>
);

const HomeIcon = ({ size = 24 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    <polyline points="9 22 9 12 15 12 15 22" />
  </svg>
);

const CheckIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const AlertIcon = ({ size = 14 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3" />
    <path d="M12 9v4" /><path d="M12 17h.01" />
  </svg>
);

export default Shelters;
