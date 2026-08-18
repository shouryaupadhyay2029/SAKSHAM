import React, { useState, useMemo } from 'react';
import { Search, ChevronRight, FileText, Plus, AlertCircle, ArrowDown } from 'lucide-react';
import { useOperationalState } from '../../context/OperationalStateContext';
import styles from './Requests.module.css';
import { PageGuideTrigger, PageGuidebook } from '../../components/ui/PageGuide';

export const Requests: React.FC = () => {
  const { requests, resources } = useOperationalState();
  const [searchQuery, setSearchQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);

  const filteredRequests = useMemo(() => {
    return requests.filter(req => {
      const matchesSearch = req.zoneName.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            req.itemNeeded.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            req.id.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesPriority = priorityFilter === 'ALL' || req.priority === priorityFilter;
      const matchesStatus = statusFilter === 'ALL' || req.status === statusFilter;
      return matchesSearch && matchesPriority && matchesStatus;
    });
  }, [requests, searchQuery, priorityFilter, statusFilter]);

  const selectedRequest = useMemo(() => {
    return requests.find(r => r.id === selectedRequestId) || null;
  }, [requests, selectedRequestId]);

  const summary = useMemo(() => {
    const active = requests.filter(r => r.status !== 'FULFILLED' && r.status !== 'CANCELLED').length;
    const critical = requests.filter(r => r.priority === 'CRITICAL' && r.status !== 'FULFILLED').length;
    const awaiting = requests.filter(r => r.status === 'PENDING').length;
    const transit = requests.filter(r => r.status === 'DISPATCHED' || r.status === 'ALLOCATED').length;
    const fulfilled = requests.filter(r => r.status === 'FULFILLED').length;
    return { active, critical, awaiting, transit, fulfilled };
  }, [requests]);

  // Find a matching resource for selected request
  const matchedResource = useMemo(() => {
    if (!selectedRequest) return null;
    return resources.find(
      res => res.name.toLowerCase().includes(selectedRequest.itemNeeded.toLowerCase()) && res.status === 'AVAILABLE'
    ) || null;
  }, [selectedRequest, resources]);

  return (
    <div className={styles.container}>
      {/* ── 1. Page Header ── */}
      <header className={styles.pageHeader}>
        <div className={styles.headerTitles}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap', marginBottom: '8px' }}>
            <span className={styles.eyebrow} style={{ marginBottom: 0 }}>DEMAND COORDINATION</span>
            <PageGuideTrigger />
          </div>
          <h1 className={styles.title}>Civilian Demand Registry</h1>
          <p className={styles.lead}>Track incoming relief requests, prioritize unmet needs, and coordinate resource allocation.</p>
        </div>
        <div className={styles.headerActions}>
          <div className={styles.liveStatus}>
            <span className={styles.statusDot} />
            <span className={styles.statusLabel}>LIVE DEMAND FEED</span>
          </div>
          <button className={styles.addBtn} onClick={() => alert('Feature incoming: Manual SOS ingestion.')}>
            <Plus size={13} />
            <span>MANUAL REQUEST</span>
          </button>
        </div>
      </header>

      {/* ── 2. Operational Summary Strip ── */}
      <section className={styles.statsStrip}>
        <div className={styles.statCell}>
          <span className={styles.statNum}>{summary.active}</span>
          <span className={styles.statLabel}>Active Requests</span>
        </div>
        <div className={styles.statDivider} />
        <div className={styles.statCell}>
          <span className={`${styles.statNum} ${styles.criticalAccent}`}>{summary.critical}</span>
          <span className={styles.statLabel}>Critical Needs</span>
        </div>
        <div className={styles.statDivider} />
        <div className={styles.statCell}>
          <span className={`${styles.statNum} ${styles.warningAccent}`}>{summary.awaiting}</span>
          <span className={styles.statLabel}>Awaiting Match</span>
        </div>
        <div className={styles.statDivider} />
        <div className={styles.statCell}>
          <span className={`${styles.statNum} ${styles.successAccent}`}>{summary.transit}</span>
          <span className={styles.statLabel}>In Transit</span>
        </div>
        <div className={styles.statDivider} />
        <div className={styles.statCell}>
          <span className={styles.statNum}>{summary.fulfilled}</span>
          <span className={styles.statLabel}>Fulfilled Today</span>
        </div>
      </section>

      {/* ── 3. Filters & Search Control Bar ── */}
      <section className={styles.filterBar}>
        <div className={styles.searchWrapper}>
          <Search size={14} className={styles.searchIcon} />
          <input 
            type="text" 
            placeholder="Search request ID, location, material..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className={styles.filterPills}>
          {['ALL', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map(pill => (
            <button
              key={pill}
              className={`${styles.filterPill} ${priorityFilter === pill ? styles.filterPillActive : ''}`}
              onClick={() => setPriorityFilter(pill)}
            >
              {pill}
            </button>
          ))}
          <div className={styles.pillDivider} />
          {['ALL STATUS', 'PENDING', 'ALLOCATED', 'DISPATCHED', 'FULFILLED'].map(pill => {
            const val = pill === 'ALL STATUS' ? 'ALL' : pill;
            return (
              <button
                key={pill}
                className={`${styles.filterPill} ${statusFilter === val ? styles.filterPillActive : ''}`}
                onClick={() => setStatusFilter(val)}
              >
                {pill}
              </button>
            );
          })}
        </div>
      </section>

      {/* ── 4. Main Two-Column Workspace ── */}
      <div className={styles.splitWorkspace}>
        
        {/* Left Side: Requests Registry Table */}
        <div className={styles.registryColumn}>
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>REQUEST ID</th>
                  <th>AFFECTED ZONE</th>
                  <th>MATERIAL / NEED</th>
                  <th>PRIORITY</th>
                  <th>AFFECTED</th>
                  <th>MATCHING STATUS</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filteredRequests.length === 0 ? (
                  <tr>
                    <td colSpan={7} className={styles.emptyRow}>
                      <AlertCircle size={22} className={styles.emptyIcon} />
                      <p>NO ACTIVE DEMAND ENTRIES</p>
                      <span>Adjust filters or search parameters.</span>
                    </td>
                  </tr>
                ) : (
                  filteredRequests.map(req => {
                    const isSelected = selectedRequestId === req.id;
                    return (
                      <tr 
                        key={req.id} 
                        className={`${styles.tableRow} ${isSelected ? styles.rowSelected : ''}`}
                        onClick={() => setSelectedRequestId(req.id)}
                      >
                        <td className="tech-code font-bold">{req.id}</td>
                        <td className={styles.locCol}>{req.zoneName}</td>
                        <td>
                          <div className={styles.itemCol}>
                            <FileText size={12} className={styles.itemIcon} />
                            <span>{req.quantity.toLocaleString()} {req.unit} of <strong>{req.itemNeeded}</strong></span>
                          </div>
                        </td>
                        <td>
                          <span className={`${styles.priorityBadge} ${styles['priority_' + req.priority]}`}>
                            ● {req.priority}
                          </span>
                        </td>
                        <td className="tech-code">{req.affectedCount.toLocaleString()}</td>
                        <td>
                          <span className={`${styles.statusLabel} ${styles['status_' + req.status]}`}>
                            {req.status}
                          </span>
                        </td>
                        <td className={styles.actionCol}>
                          <ChevronRight size={14} className={styles.rowArrow} />
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Side: Operational Context Ledger Panel */}
        <div className={styles.ledgerColumn}>
          {selectedRequest ? (
            <div className={styles.ledgerContent}>
              <div className={styles.ledgerHeader}>
                <div className={styles.titleArea}>
                  <div className={styles.metaRow}>
                    <span className="tech-code font-bold">{selectedRequest.id}</span>
                    <span className={`${styles.statusLabel} ${styles['status_' + selectedRequest.status]}`}>
                      {selectedRequest.status}
                    </span>
                  </div>
                  <h3 className={styles.ledgerTypeLabel}>
                    {selectedRequest.quantity.toLocaleString()} {selectedRequest.unit} {selectedRequest.itemNeeded}
                  </h3>
                  <p className={styles.ledgerLocation}>
                    <MapPin size={11} className={styles.mapPinIcon} /> {selectedRequest.zoneName}
                  </p>
                </div>
                <button className={styles.closeLedgerBtn} onClick={() => setSelectedRequestId(null)}>
                  <X size={15} />
                </button>
              </div>

              {/* Matching status context */}
              <div className={styles.detailsGrid}>
                <h4 className={styles.sectionTitle}>REQUEST METRICS</h4>
                <div className={styles.gridData}>
                  <div className={styles.gridRow}>
                    <span className={styles.gridLabel}>AFFECTED POPULATION</span>
                    <span>{selectedRequest.affectedCount.toLocaleString()} people</span>
                  </div>
                  <div className={styles.gridRow}>
                    <span className={styles.gridLabel}>PRIORITY INDEX</span>
                    <span style={{ fontWeight: 800 }}>{selectedRequest.priority}</span>
                  </div>
                  <div className={styles.gridRow}>
                    <span className={styles.gridLabel}>MATCH STATE</span>
                    <span>{selectedRequest.status === 'PENDING' ? 'Awaiting Allocation' : 'Assigned'}</span>
                  </div>
                </div>
              </div>

              {/* Matching Engine Flow diagram */}
              <div className={styles.matchFlow}>
                <h4 className={styles.sectionTitle}>MATCHING ENGINE PATHWAY</h4>
                <div className={styles.flowNode}>
                  <span className={styles.flowLabel}>CIVILIAN NEED</span>
                  <span className={styles.flowValue}>{selectedRequest.zoneName}</span>
                </div>
                <div className={styles.flowConnector}><ArrowDown size={12} /></div>
                <div className={styles.flowNode}>
                  <span className={styles.flowLabel}>LOGISTICS ALGORITHM</span>
                  <span className={styles.flowValue}>Depot Distance &amp; Capacity Check</span>
                </div>
                <div className={styles.flowConnector}><ArrowDown size={12} /></div>
                {matchedResource ? (
                  <div className={styles.flowNode}>
                    <span className={styles.flowLabel}>MATCHED DEPOT</span>
                    <span className={styles.flowValue}>{matchedResource.locationName} ({matchedResource.quantity.toLocaleString()} {matchedResource.unit} avail)</span>
                  </div>
                ) : (
                  <div className={`${styles.flowNode} ${styles.flowNodeEmpty}`}>
                    <span className={styles.flowLabel}>RESOURCE POOL</span>
                    <span className={styles.flowValue}>Searching Active Depots...</span>
                  </div>
                )}
              </div>

              {/* Matching Actions */}
              <div className={styles.ledgerActions}>
                {selectedRequest.status === 'PENDING' && matchedResource ? (
                  <button className={styles.primaryActionBtn} onClick={() => alert('Feature coming: Match Demand to Depot.')}>
                    MATCH RESOURCE
                  </button>
                ) : selectedRequest.status === 'PENDING' ? (
                  <div className={styles.noMatchBanner}>
                    <AlertCircle size={14} /> Searching fallback supply chains
                  </div>
                ) : (
                  <div className={styles.resolvedBanner}>
                    ✓ Match completed successfully
                  </div>
                )}
              </div>

            </div>
          ) : (
            <div className={styles.emptyLedger}>
              <AlertCircle size={24} className={styles.ledgerIcon} />
              <h4>CIVILIAN DEMAND LEDGER</h4>
              <p>Select any active demand request from the registry to inspect priority indices, matching logistics engine status, and potential depot allocations.</p>
            </div>
          )}
        </div>

      </div>

      <PageGuidebook guideKey="demand" />
    </div>
  );
};

const X = ({ size }: { size?: number }) => (
  <svg width={size || 15} height={size || 15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 6 6 18M6 6l12 12" />
  </svg>
);

const MapPin = ({ size, className }: { size?: number, className?: string }) => (
  <svg width={size || 16} height={size || 16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
    <circle cx="12" cy="10" r="3" />
  </svg>
);

export default Requests;
