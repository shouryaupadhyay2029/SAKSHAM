import React, { useState, useMemo } from 'react';
import { Search, ChevronRight, Package, MapPin, AlertTriangle, AlertCircle, Plus } from 'lucide-react';
import { useOperationalState } from '../../context/OperationalStateContext';
import styles from './Resources.module.css';
import { PageGuideTrigger, PageGuidebook } from '../../components/ui/PageGuide';

export const Resources: React.FC = () => {
  const { resources, requests } = useOperationalState();
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedResourceId, setSelectedResourceId] = useState<string | null>(null);

  const filteredResources = useMemo(() => {
    return resources.filter(res => {
      const matchesSearch = res.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            res.locationName.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = categoryFilter === 'ALL' || res.category === categoryFilter;
      const matchesStatus = statusFilter === 'ALL' || res.status === statusFilter;
      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [resources, searchQuery, categoryFilter, statusFilter]);

  const selectedResource = useMemo(() => {
    return resources.find(r => r.id === selectedResourceId) || null;
  }, [resources, selectedResourceId]);

  const summary = useMemo(() => {
    const tracked = resources.length;
    const available = resources.filter(r => r.status === 'AVAILABLE').length;
    const low = resources.filter(r => r.status === 'LOW').length;
    const reserved = resources.filter(r => r.status === 'RESERVED').length;
    const transit = resources.filter(r => r.status === 'IN_TRANSIT').length;
    return { tracked, available, low, reserved, transit };
  }, [resources]);

  // Find dynamic pressure requests linking this resource name
  const linkedRequests = useMemo(() => {
    if (!selectedResource) return [];
    return requests.filter(
      req => req.itemNeeded.toLowerCase().includes(selectedResource.name.split(' ')[0].toLowerCase()) && req.status === 'PENDING'
    );
  }, [selectedResource, requests]);

  // Low stock warning alerts
  const lowStockResources = useMemo(() => {
    return resources.filter(r => r.status === 'LOW');
  }, [resources]);

  // Stock status bars helper
  const getCapacityPercent = (quantity: number, category: string) => {
    // Arbitrary threshold bounds for status bar presentation
    const maxLimits: Record<string, number> = {
      WATER: 25000,
      FOOD: 10000,
      MEDICAL: 500,
      SHELTER_SUPPLIES: 1000,
      CLOTHING: 2000,
      RESCUE_EQUIPMENT: 200,
    };
    const max = maxLimits[category] || 5000;
    return Math.min(Math.round((quantity / max) * 100), 100);
  };

  return (
    <div className={styles.container}>
      {/* ── 1. Page Header ── */}
      <header className={styles.pageHeader}>
        <div className={styles.headerTitles}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap', marginBottom: '8px' }}>
            <span className={styles.eyebrow} style={{ marginBottom: 0 }}>RESOURCE COORDINATION</span>
            <PageGuideTrigger />
          </div>
          <h1 className={styles.title}>Relief Resource Registry</h1>
          <p className={styles.lead}>Track available supplies, response equipment, depot storage nodes, and operational readiness networks.</p>
        </div>
        <div className={styles.headerActions}>
          <div className={styles.liveStatus}>
            <span className={styles.statusDot} />
            <span className={styles.statusLabel}>LIVE INVENTORY</span>
          </div>
          <button className={styles.addBtn} onClick={() => alert('Feature coming: Register Resource Supply Depot.')}>
            <Plus size={13} />
            <span>REGISTER RESOURCE</span>
          </button>
        </div>
      </header>

      {/* ── 2. Statistics Strip ── */}
      <section className={styles.statsStrip}>
        <div className={styles.statCell}>
          <span className={styles.statNum}>{summary.tracked}</span>
          <span className={styles.statLabel}>Tracked Resources</span>
        </div>
        <div className={styles.statDivider} />
        <div className={styles.statCell}>
          <span className={`${styles.statNum} ${styles.successAccent}`}>{summary.available}</span>
          <span className={styles.statLabel}>Available Items</span>
        </div>
        <div className={styles.statDivider} />
        <div className={styles.statCell}>
          <span className={`${styles.statNum} ${styles.criticalAccent}`}>{summary.low}</span>
          <span className={styles.statLabel}>Low Stock Alert</span>
        </div>
        <div className={styles.statDivider} />
        <div className={styles.statCell}>
          <span className={`${styles.statNum} ${styles.warningAccent}`}>{summary.reserved}</span>
          <span className={styles.statLabel}>Reserved Pool</span>
        </div>
        <div className={styles.statDivider} />
        <div className={styles.statCell}>
          <span className={styles.statNum}>{summary.transit}</span>
          <span className={styles.statLabel}>In Transit</span>
        </div>
      </section>

      {/* ── 3. Filters & Search Control Bar ── */}
      <section className={styles.filterBar}>
        <div className={styles.searchWrapper}>
          <Search size={14} className={styles.searchIcon} />
          <input 
            type="text" 
            placeholder="Search resources, depots, categories..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className={styles.filterPills}>
          {['ALL', 'WATER', 'FOOD', 'MEDICAL', 'SHELTER_SUPPLIES', 'RESCUE_EQUIPMENT'].map(pill => (
            <button
              key={pill}
              className={`${styles.filterPill} ${categoryFilter === pill ? styles.filterPillActive : ''}`}
              onClick={() => setCategoryFilter(pill)}
            >
              {pill.replace('_', ' ')}
            </button>
          ))}
          <div className={styles.pillDivider} />
          {['ALL STATUS', 'AVAILABLE', 'LOW', 'RESERVED', 'DEPLETED', 'IN_TRANSIT'].map(pill => {
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
        
        {/* Left Side: Resource Registry Table */}
        <div className={styles.registryColumn}>
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>RESOURCE ID</th>
                  <th>MATERIAL DESCRIPTION</th>
                  <th>CATEGORY</th>
                  <th>AVAILABLE STOCK</th>
                  <th>STORAGE DEPOT</th>
                  <th>STATUS</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filteredResources.length === 0 ? (
                  <tr>
                    <td colSpan={7} className={styles.emptyRow}>
                      <AlertCircle size={22} className={styles.emptyIcon} />
                      <p>NO ACTIVE RESOURCE ENTRIES</p>
                      <span>Adjust filters or search parameters.</span>
                    </td>
                  </tr>
                ) : (
                  filteredResources.map(res => {
                    const isSelected = selectedResourceId === res.id;
                    const fillPct = getCapacityPercent(res.quantity, res.category);
                    return (
                      <tr 
                        key={res.id} 
                        className={`${styles.tableRow} ${isSelected ? styles.rowSelected : ''}`}
                        onClick={() => setSelectedResourceId(res.id)}
                      >
                        <td className="tech-code font-bold">{res.id}</td>
                        <td className={styles.nameCol}>
                          <div className={styles.itemTitleArea}>
                            <span className={styles.resNameLabel}>{res.name}</span>
                            <span className={styles.resContactText}>POC: {res.contactPerson}</span>
                          </div>
                        </td>
                        <td className="tech-code font-medium">{res.category}</td>
                        <td>
                          <div className={styles.stockCol}>
                            <span className={styles.stockText}><strong>{res.quantity.toLocaleString()}</strong> {res.unit}</span>
                            <div className={styles.stockCapacityBar}>
                              <div 
                                className={`${styles.stockCapacityFill} ${res.status === 'LOW' ? styles.fillLow : ''}`} 
                                style={{ width: `${fillPct}%` }}
                              />
                            </div>
                          </div>
                        </td>
                        <td className={styles.depotCol}>{res.locationName}</td>
                        <td>
                          <span className={`${styles.statusLabel} ${styles['status_' + res.status]}`}>
                            {res.status.replace('_', ' ')}
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

        {/* Right Side: Ledger Context Panel */}
        <div className={styles.ledgerColumn}>
          {selectedResource ? (
            <div className={styles.ledgerContent}>
              <div className={styles.ledgerHeader}>
                <div className={styles.titleArea}>
                  <div className={styles.metaRow}>
                    <span className="tech-code font-bold">{selectedResource.id}</span>
                    <span className={`${styles.statusLabel} ${styles['status_' + selectedResource.status]}`}>
                      {selectedResource.status.replace('_', ' ')}
                    </span>
                  </div>
                  <h3 className={styles.ledgerTypeLabel}>
                    {selectedResource.name}
                  </h3>
                  <p className={styles.ledgerLocation}>
                    <MapPin size={11} className={styles.mapPinIcon} /> {selectedResource.locationName}
                  </p>
                </div>
                <button className={styles.closeLedgerBtn} onClick={() => setSelectedResourceId(null)}>
                  <X size={15} />
                </button>
              </div>

              {/* Resource specifications */}
              <div className={styles.detailsGrid}>
                <h4 className={styles.sectionTitle}>RESOURCE COORDINATES</h4>
                <div className={styles.gridData}>
                  <div className={styles.gridRow}>
                    <span className={styles.gridLabel}>QUANTITY IN DEPOT</span>
                    <span><strong>{selectedResource.quantity.toLocaleString()}</strong> {selectedResource.unit}</span>
                  </div>
                  <div className={styles.gridRow}>
                    <span className={styles.gridLabel}>CATEGORY INDEX</span>
                    <span>{selectedResource.category}</span>
                  </div>
                  <div className={styles.gridRow}>
                    <span className={styles.gridLabel}>STORAGE CONTACT</span>
                    <span>{selectedResource.contactPerson} ({selectedResource.contactNumber})</span>
                  </div>
                </div>
              </div>

              {/* Demand Pressure Alerts */}
              <div className={styles.detailsGrid}>
                <h4 className={styles.sectionTitle}>DEMAND PRESSURE METRICS</h4>
                {linkedRequests.length > 0 ? (
                  <div className={styles.pressurePanel}>
                    <div className={styles.pressureHeader}>
                      <AlertTriangle size={14} className={styles.pressureIcon} />
                      <span>{linkedRequests.length} ACTIVE DEMAND CORRELATIONS</span>
                    </div>
                    <div className={styles.linkedRequestsList}>
                      {linkedRequests.map(req => (
                        <div key={req.id} className={styles.linkedRequestItem}>
                          <span className={styles.lrZone}>{req.zoneName}</span>
                          <span className={styles.lrQty}>{req.quantity.toLocaleString()} {req.unit}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className={styles.noPressureBanner}>
                    ✓ No active demand pressure logged
                  </div>
                )}
              </div>

              {/* Connection dispatch actions */}
              <div className={styles.ledgerActions}>
                {linkedRequests.length > 0 ? (
                  <button className={styles.primaryActionBtn} onClick={() => alert('Feature coming: Match Resource to active Demand.')}>
                    MATCH TO DEMAND
                  </button>
                ) : (
                  <div className={styles.allNominalBanner}>
                    Resource registry is fully allocated
                  </div>
                )}
              </div>

            </div>
          ) : (
            <div className={styles.emptyLedger}>
              <Package size={24} className={styles.ledgerIcon} />
              <h4>RESOURCE COORDINATES</h4>
              <p>Select any active relief resource from the registry list to inspect stock capacity percentages, storage points of contact, and linked civilian demand pressure.</p>
            </div>
          )}
        </div>

      </div>

      {/* ── 5. Resource Network / Depot Distribution map visualization ── */}
      <section className={styles.depotNetworkSection}>
        <h4 className={styles.sectionTitle}>RESOURCE DEPOT DISTRIBUTION</h4>
        <div className={styles.depotGrid}>
          <div className={styles.depotCard}>
            <span className={styles.depotTitle}>East Delhi Depot</span>
            <span className={styles.depotMeta}>15,000 L Clean Water · Healthy Stock</span>
          </div>
          <div className={styles.depotCard}>
            <span className={styles.depotTitle}>Central Warehouse</span>
            <span className={styles.depotMeta}>4,500 Food Packets · 3 Categories</span>
          </div>
          <div className={styles.depotCard}>
            <span className={styles.depotTitle}>South Depot</span>
            <span className={`${styles.depotMeta} ${styles.criticalAccent}`}>85 Trauma Kits · LOW STOCK</span>
          </div>
          <div className={styles.depotCard}>
            <span className={styles.depotTitle}>West Depot</span>
            <span className={styles.depotMeta}>320 Emergency Tents · Available</span>
          </div>
        </div>
      </section>

      {/* ── 6. Low stock Alerts banner ── */}
      {lowStockResources.length > 0 && (
        <section className={styles.lowStockBanner}>
          <AlertTriangle size={15} />
          <span>ALERT: {lowStockResources.map(r => r.name).join(', ')} currently flagged under LOW STOCK limits.</span>
        </section>
      )}

      <PageGuidebook guideKey="resources" />
    </div>
  );
};

const X = ({ size }: { size?: number }) => (
  <svg width={size || 15} height={size || 15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 6 6 18M6 6l12 12" />
  </svg>
);

export default Resources;
