import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { 
  Search, Plus, MapPin, 
  Shield, Check, 
  AlertCircle, X, Send, ChevronRight, AlertTriangle
} from 'lucide-react';
import { useOperationalState } from '../../context/OperationalStateContext';
import { MapView } from '../../components/map/MapView';
import type { Severity } from '../../types/common';
import styles from './Incidents.module.css';

const incidentTypeLabel: Record<string, string> = {
  FLOOD: 'Flood Relief Operations',
  FIRE: 'Fire Suppression & Rescue',
  EARTHQUAKE: 'Seismic Rescue Ops',
  MEDICAL_EMERGENCY: 'Urgent Medical Assistance',
  STRUCTURAL_COLLAPSE: 'Search & Rescue Collapse',
  RESOURCE_SHORTAGE: 'Supply Shortage Alert',
};

const severityColor: Record<string, string> = {
  CRITICAL: '#EF4444',
  HIGH: '#F97316',
  MEDIUM: '#EAB308',
  LOW: '#10B981',
};

export const Incidents: React.FC = () => {
  const { 
    incidents, resources, vehicles, shelters,
    addManualIncident, updateIncidentStatus, setIncidentPriority 
  } = useOperationalState();

  // --- Search & Filters State ---
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<string>('ALL');

  // --- UI Selection & Panels ---
  const [selectedIncidentId, setSelectedIncidentId] = useState<string | null>(null);
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [activeSubAction, setActiveSubAction] = useState<'NONE' | 'VERIFY' | 'PRIORITY' | 'DISPATCH'>('NONE');

  // --- Manual Incident Form State ---
  const [manualType, setManualType] = useState('FLOOD');
  const [manualSeverity, setManualSeverity] = useState<Severity>('HIGH');
  const [manualLocation, setManualLocation] = useState('');
  const [manualLat, setManualLat] = useState('28.6139');
  const [manualLng, setManualLng] = useState('77.2090');
  const [manualAffected, setManualAffected] = useState('0');
  const [manualDesc, setManualDesc] = useState('');
  const [manualReporter, setManualReporter] = useState('');
  const [manualContact, setManualContact] = useState('');
  const [manualSource, setManualSource] = useState('HEADQUARTERS');

  // --- Real-time highlight tracker ---
  const [newlyAddedIds, setNewlyAddedIds] = useState<Set<string>>(new Set());

  // Track selected incident object
  const selectedIncident = useMemo(() => {
    return incidents.find(inc => inc.id === selectedIncidentId) || null;
  }, [incidents, selectedIncidentId]);

  // Operational metrics
  const summary = useMemo(() => {
    const active = incidents.filter(i => i.status !== 'RESOLVED');
    const critical = incidents.filter(i => i.severity === 'CRITICAL' && i.status !== 'RESOLVED');
    const awaiting = incidents.filter(i => i.status === 'REPORTED' || i.status === 'VERIFIED' || i.status === 'PRIORITIZED');
    const under = incidents.filter(i => i.status === 'RESOURCE_MATCHED' || i.status === 'DISPATCHED' || i.status === 'UNDER_RESPONSE');
    const resolvedToday = incidents.filter(i => i.status === 'RESOLVED');
    return {
      active: active.length,
      critical: critical.length,
      awaiting: awaiting.length,
      under: under.length,
      resolved: resolvedToday.length,
    };
  }, [incidents]);

  // Filtered & Sorted Incidents
  const filteredAndSortedIncidents = useMemo(() => {
    let result = [...incidents];

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(inc => 
        inc.id.toLowerCase().includes(q) ||
        inc.location.toLowerCase().includes(q) ||
        inc.type.toLowerCase().includes(q) ||
        inc.status.toLowerCase().includes(q) ||
        inc.description.toLowerCase().includes(q)
      );
    }

    if (activeFilter !== 'ALL') {
      if (activeFilter === 'CRITICAL' || activeFilter === 'HIGH' || activeFilter === 'MEDIUM' || activeFilter === 'LOW') {
        result = result.filter(inc => inc.severity === activeFilter);
      } else if (activeFilter === 'AWAITING RESPONSE') {
        result = result.filter(inc => inc.status === 'REPORTED' || inc.status === 'VERIFIED' || inc.status === 'PRIORITIZED');
      } else if (activeFilter === 'UNDER RESPONSE') {
        result = result.filter(inc => inc.status === 'RESOURCE_MATCHED' || inc.status === 'DISPATCHED' || inc.status === 'UNDER_RESPONSE');
      } else if (activeFilter === 'RESOLVED') {
        result = result.filter(inc => inc.status === 'RESOLVED');
      }
    }

    const severityWeight = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
    return result.sort((a, b) => {
      if (a.status === 'RESOLVED' && b.status !== 'RESOLVED') return 1;
      if (b.status === 'RESOLVED' && a.status !== 'RESOLVED') return -1;

      const wA = severityWeight[a.severity] || 0;
      const wB = severityWeight[b.severity] || 0;
      if (wA !== wB) return wB - wA;

      return new Date(b.time).getTime() - new Date(a.time).getTime();
    });
  }, [incidents, searchQuery, activeFilter]);

  const handleCreateManual = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualLocation || !manualDesc || !manualReporter) {
      alert('Please fill in required fields: Location, Situation, and Reporter Name.');
      return;
    }

    const lat = parseFloat(manualLat);
    const lng = parseFloat(manualLng);
    if (isNaN(lat) || isNaN(lng)) {
      alert('Invalid coordinates.');
      return;
    }

    const newId = addManualIncident({
      type: manualType,
      severity: manualSeverity,
      location: manualLocation,
      coordinates: { lat, lng },
      description: manualDesc,
      reporterName: manualReporter,
      reporterContact: manualContact || 'HQ-COMMS',
      source: manualSource || 'OPERATOR-HQ',
      peopleAffected: parseInt(manualAffected) || 0,
      requiredResources: [
        { itemNeeded: 'DRINKING WATER', quantity: 200, unit: 'L', priority: 'HIGH' },
        { itemNeeded: 'BASIC FOOD PACKETS', quantity: 50, unit: 'Packs', priority: 'MEDIUM' }
      ]
    });

    setNewlyAddedIds(prev => {
      const copy = new Set(prev);
      copy.add(newId);
      return copy;
    });

    setTimeout(() => {
      setNewlyAddedIds(prev => {
        const copy = new Set(prev);
        copy.delete(newId);
        return copy;
      });
    }, 2000);

    setIsManualModalOpen(false);
    setSelectedIncidentId(newId);
    setActiveSubAction('NONE');

    setManualLocation('');
    setManualDesc('');
    setManualReporter('');
    setManualContact('');
    setManualAffected('0');
  };

  return (
    <div className={styles.container}>
      
      {/* ── 1. Page Header ── */}
      <header className={styles.pageHeader}>
        <div className={styles.headerTitles}>
          <span className={styles.eyebrow}>INCIDENT MANAGEMENT</span>
          <h1 className={styles.title}>Incident Response Registry</h1>
          <p className={styles.lead}>Monitor, verify, prioritize and coordinate active regional disaster responses.</p>
        </div>
        <div className={styles.headerActions}>
          <div className={styles.liveStatus}>
            <span className={styles.statusDot} />
            <span className={styles.statusLabel}>LIVE INCIDENT FEED</span>
          </div>
          <button className={styles.addBtn} onClick={() => setIsManualModalOpen(true)}>
            <Plus size={13} />
            <span>MANUAL INCIDENT</span>
          </button>
        </div>
      </header>

      {/* ── 2. Statistics Strip ── */}
      <section className={styles.statsStrip}>
        <div className={styles.statCell}>
          <span className={styles.statNum}>{summary.active}</span>
          <span className={styles.statLabel}>Active Incidents</span>
        </div>
        <div className={styles.statDivider} />
        <div className={styles.statCell}>
          <span className={`${styles.statNum} ${styles.criticalAccent}`}>{summary.critical}</span>
          <span className={styles.statLabel}>Critical Threats</span>
        </div>
        <div className={styles.statDivider} />
        <div className={styles.statCell}>
          <span className={`${styles.statNum} ${styles.warningAccent}`}>{summary.awaiting}</span>
          <span className={styles.statLabel}>Awaiting Response</span>
        </div>
        <div className={styles.statDivider} />
        <div className={styles.statCell}>
          <span className={`${styles.statNum} ${styles.successAccent}`}>{summary.under}</span>
          <span className={styles.statLabel}>Under Response</span>
        </div>
        <div className={styles.statDivider} />
        <div className={styles.statCell}>
          <span className={styles.statNum}>{summary.resolved}</span>
          <span className={styles.statLabel}>Resolved Today</span>
        </div>
      </section>

      {/* ── 3. Filters & Search Control Bar ── */}
      <section className={styles.filterBar}>
        <div className={styles.searchWrapper}>
          <Search size={14} className={styles.searchIcon} />
          <input 
            type="text" 
            placeholder="Search by ID, type, location..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className={styles.filterPills}>
          {['ALL', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'AWAITING RESPONSE', 'UNDER RESPONSE', 'RESOLVED'].map(pill => (
            <button
              key={pill}
              className={`${styles.filterPill} ${activeFilter === pill ? styles.filterPillActive : ''}`}
              onClick={() => setActiveFilter(pill)}
            >
              {pill}
            </button>
          ))}
        </div>
      </section>

      {/* ── 4. Main Two-Column Workspace ── */}
      <div className={styles.splitWorkspace}>
        
        {/* Left Side: Incident Registry Table */}
        <div className={styles.registryColumn}>
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>INCIDENT</th>
                  <th>LOCATION</th>
                  <th>SEVERITY</th>
                  <th>REPORTED</th>
                  <th>IMPACT</th>
                  <th>STATUS</th>
                  <th>ASSIGNED UNIT</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filteredAndSortedIncidents.length === 0 ? (
                  <tr>
                    <td colSpan={8} className={styles.emptyRow}>
                      <AlertCircle size={22} className={styles.emptyIcon} />
                      <p>NO ACTIVE REGISTRY MATCHES</p>
                      <span>Adjust filters or search parameters.</span>
                    </td>
                  </tr>
                ) : (
                  filteredAndSortedIncidents.map(inc => {
                    const isNew = newlyAddedIds.has(inc.id);
                    const isSelected = selectedIncidentId === inc.id;
                    return (
                      <tr 
                        key={inc.id} 
                        className={`${styles.tableRow} ${isNew ? styles.rowHighlight : ''} ${isSelected ? styles.rowSelected : ''}`}
                        onClick={() => {
                          setSelectedIncidentId(inc.id);
                          setActiveSubAction('NONE');
                        }}
                      >
                        <td className={styles.typeCol}>
                          <span className={styles.incId}>{inc.id}</span>
                          <span className={styles.incLabel}>{inc.type.replace(/_/g, ' ')}</span>
                        </td>
                        <td className={styles.locCol}>{inc.location}</td>
                        <td>
                          <span className={styles.sevIndicator} style={{ color: severityColor[inc.severity] }}>
                            ● {inc.severity}
                          </span>
                        </td>
                        <td className="tech-code">
                          {new Date(inc.time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })}
                        </td>
                        <td className={styles.impactCol}>{inc.peopleAffected ?? inc.displacedCount ?? '—'} affected</td>
                        <td>
                          <span className={`${styles.statusLabel} ${styles['status_' + inc.status]}`}>
                            {inc.status.replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td className={styles.assignedCol}>{inc.assignedVehicle || inc.assignedTeam || '—'}</td>
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

        {/* Right Side: Operational Detail View */}
        <div className={styles.ledgerColumn}>
          {selectedIncident ? (
            <div className={styles.ledgerContent}>
              
              {/* Header */}
              <div className={styles.ledgerHeader}>
                <div className={styles.titleArea}>
                  <div className={styles.metaRow}>
                    <span className="tech-code font-bold">{selectedIncident.id}</span>
                    <span className={`${styles.statusLabel} ${styles['status_' + selectedIncident.status]}`}>
                      {selectedIncident.status.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <h3 className={styles.ledgerTypeLabel}>
                    {incidentTypeLabel[selectedIncident.type] || selectedIncident.type.replace(/_/g, ' ')}
                  </h3>
                  <p className={styles.ledgerLocation}>
                    <MapPin size={11} /> {selectedIncident.location}
                  </p>
                </div>
                <button className={styles.closeLedgerBtn} onClick={() => setSelectedIncidentId(null)}>
                  <X size={15} />
                </button>
              </div>

              {/* Lifecycle Progress */}
              <div className={styles.lifecycleGrid}>
                {['REPORTED', 'VERIFIED', 'PRIORITIZED', 'RESOURCE_MATCHED', 'DISPATCHED', 'UNDER_RESPONSE', 'RESOLVED'].map((step, idx) => {
                  const statusOrder: Record<string, number> = {
                    REPORTED: 0, VERIFIED: 1, PRIORITIZED: 2, RESOURCE_MATCHED: 3, DISPATCHED: 4, UNDER_RESPONSE: 5, RESOLVED: 6, ACTIVE: 2
                  };
                  const currentIdx = statusOrder[selectedIncident.status] ?? 0;
                  const stepIdx = idx;
                  const isCompleted = stepIdx <= currentIdx;
                  const isCurrent = stepIdx === currentIdx;
                  
                  return (
                    <div key={step} className={`${styles.lifecycleNode} ${isCompleted ? styles.nodeCompleted : ''} ${isCurrent ? styles.nodeCurrent : ''}`}>
                      <div className={styles.nodeIcon}>
                        {isCompleted ? <Check size={8} /> : <span>{stepIdx + 1}</span>}
                      </div>
                      <span className={styles.nodeLabel}>{step.replace(/_/g, ' ')}</span>
                    </div>
                  );
                })}
              </div>

              {/* Context Actions */}
              <div className={styles.ledgerActions}>
                <Link
                  to={`/operations/incidents/${selectedIncident.id}/response`}
                  className={styles.primaryActionBtn}
                  style={{ textDecoration: 'none', textAlign: 'center', display: 'block', backgroundColor: '#E86F16' }}
                >
                  OPEN RESPONSE WORKSPACE →
                </Link>

                {selectedIncident.status === 'REPORTED' && activeSubAction !== 'VERIFY' && (
                  <button className={styles.primaryActionBtn} onClick={() => setActiveSubAction('VERIFY')}>
                    VERIFY INCIDENT
                  </button>
                )}

                {selectedIncident.status === 'VERIFIED' && activeSubAction !== 'PRIORITY' && (
                  <button className={styles.primaryActionBtn} onClick={() => setActiveSubAction('PRIORITY')}>
                    SET PRIORITY
                  </button>
                )}

                {selectedIncident.status === 'PRIORITIZED' && (
                  <button 
                    className={styles.primaryActionBtn} 
                    onClick={() => updateIncidentStatus(selectedIncident.id, 'RESOURCE_MATCHED')}
                  >
                    FIND RESOURCES
                  </button>
                )}

                {selectedIncident.status === 'RESOURCE_MATCHED' && (
                  <button 
                    className={styles.primaryActionBtn}
                    onClick={() => {
                      const avail = vehicles.find(v => v.status === 'AVAILABLE');
                      if (avail) {
                        updateIncidentStatus(selectedIncident.id, 'DISPATCHED');
                        alert(`Simulation: Dispatching vehicle ${avail.name} to target location.`);
                      } else {
                        updateIncidentStatus(selectedIncident.id, 'DISPATCHED');
                      }
                    }}
                  >
                    DISPATCH UNITS
                  </button>
                )}

                {(selectedIncident.status === 'DISPATCHED' || selectedIncident.status === 'UNDER_RESPONSE') && (
                  <div className={styles.actionRowGroup}>
                    {selectedIncident.status === 'DISPATCHED' && (
                      <button 
                        className={styles.primaryActionBtn} 
                        onClick={() => updateIncidentStatus(selectedIncident.id, 'UNDER_RESPONSE')}
                      >
                        SET UNDER RESPONSE
                      </button>
                    )}
                    <button 
                      className={`${styles.primaryActionBtn} ${styles.actionSuccess}`}
                      onClick={() => updateIncidentStatus(selectedIncident.id, 'RESOLVED')}
                    >
                      MARK RESOLVED
                    </button>
                  </div>
                )}

                {selectedIncident.status === 'RESOLVED' && (
                  <div className={styles.resolvedBanner}>
                    <Shield size={12} /> Response Resolved
                  </div>
                )}

                {/* Sub Action Panels */}
                {activeSubAction === 'VERIFY' && (
                  <div className={styles.subActionPanel}>
                    <h4 className={styles.subActionTitle}>Verify Incident Validity</h4>
                    <div className={styles.verifyMetaList}>
                      <div><span>Type:</span> {selectedIncident.type.replace(/_/g, ' ')}</div>
                      <div><span>Location:</span> {selectedIncident.location}</div>
                      <div><span>Reporter:</span> {selectedIncident.reporterName}</div>
                      <div><span>Affected:</span> {selectedIncident.peopleAffected ?? 'Pending'}</div>
                    </div>
                    <div className={styles.subActionBtnGroup}>
                      <button 
                        className={`${styles.subActionBtn} ${styles.actionSuccess}`}
                        onClick={() => {
                          updateIncidentStatus(selectedIncident.id, 'VERIFIED');
                          setActiveSubAction('NONE');
                        }}
                      >
                        VERIFY &amp; CONTINUE
                      </button>
                      <button 
                        className={`${styles.subActionBtn} ${styles.actionDanger}`}
                        onClick={() => {
                          alert('Flagged for review.');
                          setActiveSubAction('NONE');
                        }}
                      >
                        FLAG
                      </button>
                    </div>
                  </div>
                )}

                {activeSubAction === 'PRIORITY' && (
                  <div className={styles.subActionPanel}>
                    <h4 className={styles.subActionTitle}>Update Priority</h4>
                    <div className={styles.priorityGridSelector}>
                      {['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map(lvl => (
                        <button 
                          key={lvl}
                          className={styles.prioritySelectCell}
                          onClick={() => {
                            setIncidentPriority(selectedIncident.id, lvl as Severity);
                            setActiveSubAction('NONE');
                          }}
                        >
                          <span style={{ color: severityColor[lvl] }}>● {lvl}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Geographic Small Preview */}
              <div className={styles.geoPreview}>
                <h4 className={styles.sectionTitle}>GEOGRAPHIC CONTEXT</h4>
                <div className={styles.smallMapWrapper}>
                  <MapView 
                    incidents={[selectedIncident]}
                    resources={resources}
                    vehicles={vehicles}
                    shelters={shelters}
                    selectedIncident={selectedIncident}
                    layerFilters={{
                      incidents: true,
                      resources: false,
                      vehicles: false,
                      shelters: false,
                      routes: false
                    }}
                  />
                </div>
              </div>

              {/* Overview Details Grid */}
              <div className={styles.detailsGrid}>
                <h4 className={styles.sectionTitle}>OPERATIONAL METRICS</h4>
                <div className={styles.gridData}>
                  <div className={styles.gridRow}>
                    <span className={styles.gridLabel}>REPORTED</span>
                    <span className="tech-code">{new Date(selectedIncident.reportedAt || selectedIncident.time).toLocaleTimeString()}</span>
                  </div>
                  <div className={styles.gridRow}>
                    <span className={styles.gridLabel}>PEOPLE AFFECTED</span>
                    <span>{selectedIncident.peopleAffected ?? 'Pending Verification'}</span>
                  </div>
                  <div className={styles.gridRow}>
                    <span className={styles.gridLabel}>COORDINATES</span>
                    <span className="tech-code">{selectedIncident.coordinates.lat.toFixed(4)}° N, {selectedIncident.coordinates.lng.toFixed(4)}° E</span>
                  </div>
                </div>
              </div>

              {/* Situation assessment */}
              <div className={styles.detailsGrid}>
                <h4 className={styles.sectionTitle}>SITUATION ASSESSMENT</h4>
                <p className={styles.situationText}>{selectedIncident.description}</p>
              </div>

            </div>
          ) : (
            <div className={styles.emptyLedger}>
              <AlertTriangle size={24} className={styles.ledgerIcon} />
              <h4>LIVE INCIDENT LEDGER</h4>
              <p>Select any active registry row item to inspect geographic location context, threat prioritization levels, deployment ETA timelines, and resource dispatch actions.</p>
            </div>
          )}
        </div>

      </div>

      {/* --- + MANUAL INCIDENT LOG MODAL --- */}
      {isManualModalOpen && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>Log Manual Operational Incident</h3>
              <button className={styles.closeLedgerBtn} onClick={() => setIsManualModalOpen(false)}>
                <X size={18} />
              </button>
            </div>
            
            <form onSubmit={handleCreateManual} className={styles.modalForm}>
              <div className={styles.formGrid}>
                <div className={styles.formGroup}>
                  <label>Incident Type *</label>
                  <select value={manualType} onChange={(e) => setManualType(e.target.value)}>
                    <option value="FLOOD">Flood Relief Operations</option>
                    <option value="FIRE">Fire Suppression &amp; Rescue</option>
                    <option value="EARTHQUAKE">Seismic Rescue Ops</option>
                    <option value="MEDICAL_EMERGENCY">Urgent Medical Assistance</option>
                    <option value="STRUCTURAL_COLLAPSE">Search &amp; Rescue Collapse</option>
                    <option value="RESOURCE_SHORTAGE">Supply Shortage Alert</option>
                  </select>
                </div>
                
                <div className={styles.formGroup}>
                  <label>Severity Level *</label>
                  <select 
                    value={manualSeverity} 
                    onChange={(e) => setManualSeverity(e.target.value as Severity)}
                  >
                    <option value="CRITICAL">● CRITICAL</option>
                    <option value="HIGH">● HIGH</option>
                    <option value="MEDIUM">● MEDIUM</option>
                    <option value="LOW">● LOW</option>
                  </select>
                </div>

                <div className={styles.formGroup} style={{ gridColumn: 'span 2' }}>
                  <label>Location Area Name *</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Sector 12 Park Inundated Zone, Delhi"
                    value={manualLocation}
                    onChange={(e) => setManualLocation(e.target.value)}
                    required
                  />
                </div>

                <div className={styles.formGroup}>
                  <label>Latitude *</label>
                  <input 
                    type="text" 
                    value={manualLat}
                    onChange={(e) => setManualLat(e.target.value)}
                    required
                  />
                </div>

                <div className={styles.formGroup}>
                  <label>Longitude *</label>
                  <input 
                    type="text" 
                    value={manualLng}
                    onChange={(e) => setManualLng(e.target.value)}
                    required
                  />
                </div>

                <div className={styles.formGroup}>
                  <label>Estimated People Affected</label>
                  <input 
                    type="number" 
                    value={manualAffected}
                    onChange={(e) => setManualAffected(e.target.value)}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label>Incident Source Channel</label>
                  <input 
                    type="text" 
                    value={manualSource}
                    onChange={(e) => setManualSource(e.target.value)}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label>Reporter Name *</label>
                  <input 
                    type="text" 
                    placeholder="Duty Officer or Civilian Name"
                    value={manualReporter}
                    onChange={(e) => setManualReporter(e.target.value)}
                    required
                  />
                </div>

                <div className={styles.formGroup}>
                  <label>Reporter Contact / Phone</label>
                  <input 
                    type="text" 
                    placeholder="Phone or COMMS-channel ID"
                    value={manualContact}
                    onChange={(e) => setManualContact(e.target.value)}
                  />
                </div>

                <div className={styles.formGroup} style={{ gridColumn: 'span 2' }}>
                  <label>Situation Assessment &amp; Details *</label>
                  <textarea 
                    rows={4}
                    placeholder="Provide details about trapped people, immediate resource requirements, or water levels..."
                    value={manualDesc}
                    onChange={(e) => setManualDesc(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className={styles.formActions}>
                <button 
                  type="button" 
                  className={styles.cancelFormBtn} 
                  onClick={() => setIsManualModalOpen(false)}
                >
                  Cancel
                </button>
                <button type="submit" className={styles.submitFormBtn}>
                  <Send size={12} /> Log Incident
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default Incidents;
