import React, { useState, useMemo } from 'react';
import { Search, ChevronRight, Package, MapPin, AlertTriangle, AlertCircle, Plus, Send, X as CloseIcon } from 'lucide-react';
import { useOperationalState, normalizeResource } from '../../context/OperationalStateContext';
import { useTranslation } from 'react-i18next';
import styles from './Resources.module.css';
import { PageGuideTrigger, PageGuidebook } from '../../components/ui/PageGuide';
import { ShaderBackground } from '../../components/ui/ShaderBackground';
import { AddressPicker } from '../../components/ui/AddressPicker';
import apiClient from '../../services/apiClient';

export const Resources: React.FC = () => {
  const { t } = useTranslation();
  const { resources, requests, setResources } = useOperationalState();
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedResourceId, setSelectedResourceId] = useState<string | null>(null);

  // --- Add Resource Modal State ---
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [depotName, setDepotName] = useState('');
  const [resourceName, setResourceName] = useState('');
  const [qty, setQty] = useState('1000');
  const [unit, setUnit] = useState('Units');
  const [category, setCategory] = useState('WATER');
  const [poc, setPoc] = useState('');
  const [locationData, setLocationData] = useState<{ address: string; lat: number; lng: number } | null>(null);
  const [locationConfirmed, setLocationConfirmed] = useState(false);

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
      <header className={`${styles.pageHeader} shaderHeaderWrapper`}>
        <ShaderBackground className="absolute inset-0" />
        <div className={styles.headerTitles}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap', marginBottom: '8px' }}>
            <span className={styles.eyebrow} style={{ marginBottom: 0 }}>RESOURCE COORDINATION</span>
            <PageGuideTrigger />
          </div>
          <h1 className={`${styles.title} reveal-block`} data-reveal-color="#10B981">{t('resources.title')}</h1>
          <p className={styles.lead}>{t('resources.subtitle')}</p>
        </div>
        <div className={styles.headerActions}>
          <div className={styles.liveStatus}>
            <span className={styles.statusDot} />
            <span className={styles.statusLabel}>LIVE INVENTORY</span>
          </div>
          <button className={styles.addBtn} onClick={() => setIsAddModalOpen(true)}>
            <Plus size={13} />
            <span>{t('resources.addResource')}</span>
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
            placeholder={t('resources.searchPlaceholder')}
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
              {pill === 'ALL' ? t('common.all') : pill.replace('_', ' ')}
            </button>
          ))}
          <div className={styles.pillDivider} />
          {[
            { id: 'ALL', label: t('common.all') },
            { id: 'AVAILABLE', label: t('status.AVAILABLE') },
            { id: 'LOW', label: t('status.LOW_STOCK') },
            { id: 'RESERVED', label: t('status.ASSIGNED') },
            { id: 'DEPLETED', label: t('status.DEPLETED') }
          ].map(pill => (
            <button
              key={pill.id}
              className={`${styles.filterPill} ${statusFilter === pill.id ? styles.filterPillActive : ''}`}
              onClick={() => setStatusFilter(pill.id)}
            >
              {pill.label}
            </button>
          ))}
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
                  <th>{t('resources.resourceId')}</th>
                  <th>{t('common.description')}</th>
                  <th>{t('resources.category')}</th>
                  <th>{t('resources.stockLevel')}</th>
                  <th>{t('resources.depotLocation')}</th>
                  <th>{t('common.status')}</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filteredResources.length === 0 ? (
                  <tr>
                    <td colSpan={7} className={styles.emptyRow}>
                      <AlertCircle size={22} className={styles.emptyIcon} />
                      <p>{t('common.noResultsFound')}</p>
                      <span>{t('resources.subtitle')}</span>
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
                            {t(`status.${res.status}`) || res.status.replace('_', ' ')}
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
          <ShaderBackground style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0.85, pointerEvents: 'none', zIndex: 0 }} />
          {selectedResource ? (
            <div className={styles.ledgerContent}>
              <div className={styles.ledgerHeader}>
                <div className={styles.titleArea}>
                  <div className={styles.metaRow}>
                    <span className="tech-code font-bold" style={{ color: '#FAF8F3' }}>{selectedResource.id}</span>
                    <span className={`${styles.statusLabel} ${styles['status_' + selectedResource.status]}`}>
                      {t(`status.${selectedResource.status}`) || selectedResource.status.replace('_', ' ')}
                    </span>
                  </div>
                  <h3 className={styles.ledgerTypeLabel}>{selectedResource.name || selectedResource.category.replace('_', ' ')}</h3>
                  <p className={styles.ledgerLocation}>
                    <MapPin size={11} className={styles.mapPinIcon} /> {selectedResource.locationName}
                  </p>
                </div>
                <button className={styles.closeLedgerBtn} onClick={() => setSelectedResourceId(null)}>
                  <X size={15} />
                </button>
              </div>

              {/* Data Grid */}
              <div className={styles.detailsGrid}>
                <h4 className={styles.sectionTitle}>{t('common.details')}</h4>
                <div className={styles.gridData}>
                  <div className={styles.gridRow}>
                    <span className={styles.gridLabel}>{t('resources.depot')}</span>
                    <span style={{ fontWeight: 700, color: '#FAF8F3' }}>{selectedResource.locationName}</span>
                  </div>
                  <div className={styles.gridRow}>
                    <span className={styles.gridLabel}>{t('resources.quantity')}</span>
                    <span className="tech-code" style={{ color: '#FAF8F3' }}>{selectedResource.quantity.toLocaleString()} {selectedResource.unit}</span>
                  </div>
                  <div className={styles.gridRow}>
                    <span className={styles.gridLabel}>{t('common.location')}</span>
                    <span className="tech-code" style={{ color: '#FAF8F3' }}>{selectedResource.coordinates.lat.toFixed(4)}° N, {selectedResource.coordinates.lng.toFixed(4)}° E</span>
                  </div>
                </div>
              </div>

              {/* Demand Pressure linked block */}
              <div className={styles.detailsGrid}>
                <h4 className={styles.sectionTitle}>{t('resources.demandPressure')}</h4>
                {linkedRequests.length > 0 ? (
                  <div className={styles.pressurePanel}>
                    <div className={styles.pressureHeader}>
                      <AlertTriangle size={13} className={styles.pressureIcon} />
                      <span>{linkedRequests.length} {t('resources.linkedDemand')}</span>
                    </div>
                    <div className={styles.linkedRequestsList}>
                      {linkedRequests.map(r => (
                        <div key={r.id} className={styles.linkedRequestItem}>
                          <span className={styles.lrZone}>{r.zoneName}</span>
                          <span className={styles.lrQty}>{r.itemNeeded} ({r.quantity})</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className={styles.noPressureBanner}>
                    ✓ {t('resources.allNominal')}
                  </div>
                )}
              </div>

              {/* Action */}
              <div className={styles.ledgerActions}>
                <button className={styles.primaryActionBtn}>
                  {t('resources.allocateDispatched')} →
                </button>
                {selectedResource.status === 'LOW' && (
                  <div className={styles.lowStockBanner} style={{ marginTop: 8 }}>
                    <AlertTriangle size={14} />
                    <span>{t('resources.criticalReplenish')}</span>
                  </div>
                )}
              </div>

            </div>
          ) : (
            <div className={styles.emptyLedger}>
              <div className={styles.emptyLedgerContent}>
                <Package size={32} className={styles.emptyIcon} />
                <h4>RESOURCE COORDINATES</h4>
                <p>Select any active relief resource from the registry list to inspect stock capacity percentages, storage points of contact, and linked civilian demand pressure.</p>
              </div>
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

      {/* --- + REGISTER RESOURCE / DEPOT MODAL --- */}
      {isAddModalOpen && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>Register Resource Supply Depot</h3>
              <button className={styles.closeLedgerBtn} onClick={() => setIsAddModalOpen(false)}>
                <CloseIcon size={18} />
              </button>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!depotName || !resourceName || !qty || !unit || !poc) {
                  alert('Please fill in all required fields.');
                  return;
                }
                if (!locationData || !locationConfirmed) {
                  alert('Please select and confirm the depot location coordinates on the map.');
                  return;
                }
                try {
                  const payload = {
                    materialName: resourceName,
                    description: `Stock: ${resourceName} Depot`,
                    category: category,
                    availableQuantity: parseFloat(qty) || 0,
                    reservedQuantity: 0.0,
                    unit: unit,
                    storageDepot: depotName,
                    location: locationData.address,
                    latitude: locationData.lat,
                    longitude: locationData.lng,
                    status: 'AVAILABLE',
                    pointOfContact: poc,
                  };
                  const res = await apiClient.createResource(payload);
                  if (res && res.data) {
                    setResources(prev => [normalizeResource(res.data), ...prev]);
                    setIsAddModalOpen(false);
                    setDepotName('');
                    setResourceName('');
                    setQty('1000');
                    setUnit('Units');
                    setPoc('');
                    setLocationData(null);
                    setLocationConfirmed(false);
                  }
                } catch (err: any) {
                  alert(`Failed to register resource depot: ${err.message}`);
                }
              }}
              className={styles.modalForm}
            >
              <div className={styles.formGrid}>
                <div className={styles.formGroup}>
                  <label>Depot Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. East Delhi Depot"
                    value={depotName}
                    onChange={(e) => setDepotName(e.target.value)}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label>Resource Category *</label>
                  <select value={category} onChange={(e) => setCategory(e.target.value)}>
                    <option value="WATER">Water Supplies</option>
                    <option value="FOOD">Food Supplies</option>
                    <option value="MEDICAL">Medical Equipment</option>
                    <option value="SHELTER_SUPPLIES">Shelter Supplies</option>
                    <option value="CLOTHING">Clothing &amp; Beds</option>
                    <option value="RESCUE_EQUIPMENT">Rescue Equipment</option>
                  </select>
                </div>

                <div className={styles.formGroup}>
                  <label>Resource Name / Material *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Clean Water Tank, Trauma Kit"
                    value={resourceName}
                    onChange={(e) => setResourceName(e.target.value)}
                  />
                </div>

                <div className={styles.formGroup} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <div>
                    <label>Quantity *</label>
                    <input
                      type="number"
                      required
                      value={qty}
                      onChange={(e) => setQty(e.target.value)}
                    />
                  </div>
                  <div>
                    <label>Unit *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. L, Packs, Units"
                      value={unit}
                      onChange={(e) => setUnit(e.target.value)}
                    />
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <label>Point of Contact (POC) Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Inspector Amit Sharma"
                    value={poc}
                    onChange={(e) => setPoc(e.target.value)}
                  />
                </div>

                <div className={styles.formGroup} style={{ gridColumn: 'span 2' }}>
                  <label>Depot Location &amp; Map Coordinates *</label>
                  <AddressPicker
                    onChange={(data, confirmed) => {
                      setLocationData(data);
                      setLocationConfirmed(confirmed);
                    }}
                  />
                </div>
              </div>

              <div className={styles.formActions}>
                <button
                  type="button"
                  className={styles.cancelFormBtn}
                  onClick={() => setIsAddModalOpen(false)}
                >
                  Cancel
                </button>
                <button type="submit" className={styles.submitFormBtn}>
                  <Send size={12} /> Register Depot
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

const X = ({ size }: { size?: number }) => (
  <svg width={size || 15} height={size || 15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 6 6 18M6 6l12 12" />
  </svg>
);

export default Resources;
