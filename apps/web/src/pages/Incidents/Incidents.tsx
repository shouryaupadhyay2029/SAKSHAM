import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { 
  Search, Plus, MapPin, 
  Shield, Check, 
  AlertCircle, X, Send, ChevronRight, AlertTriangle,
  Phone, MessageSquare, User
} from 'lucide-react';
import { useOperationalState } from '../../context/OperationalStateContext';
import { useAuth } from '../../context/AuthContext';
import { MapView } from '../../components/map/MapView';
import type { Severity } from '../../types/common';
import { useTranslation } from 'react-i18next';
import { DynamicText } from '../../components/ui/DynamicText';
import styles from './Incidents.module.css';
import { PageGuideTrigger, PageGuidebook } from '../../components/ui/PageGuide';
import { ShaderBackground } from '../../components/ui/ShaderBackground';
import { AddressPicker } from '../../components/ui/AddressPicker';

const severityColor: Record<string, string> = {
  CRITICAL: '#EF4444',
  HIGH: '#F97316',
  MEDIUM: '#EAB308',
  LOW: '#10B981',
};

export const Incidents: React.FC = () => {
  const { t } = useTranslation();
  const { 
    incidents, resources, vehicles, shelters,
    addManualIncident, updateIncidentStatus, setIncidentPriority
  } = useOperationalState();

  const { isAuthenticated, hasRole } = useAuth();
  const isOfficer = isAuthenticated && (hasRole('OPERATOR') || hasRole('REGIONAL_AUTHORITY') || hasRole('ADMIN'));

  console.log('[INCIDENT DEBUG] incidents received by page:', incidents);
  console.log('[INCIDENT DEBUG] incidents count:', incidents.length);

  // --- Search & Filters State ---
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<string>('ALL');

  // --- UI Selection & Panels ---
  const [selectedIncidentId, setSelectedIncidentId] = useState<string | null>(null);
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [activeSubAction, setActiveSubAction] = useState<'NONE' | 'VERIFY' | 'PRIORITY' | 'DISPATCH'>('NONE');

  // --- Verify action state ---
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [verifyError, setVerifyError] = useState<string | null>(null);

  // --- Manual Incident Form State ---
  const [manualType, setManualType] = useState('FLOOD');
  const [manualSeverity, setManualSeverity] = useState<Severity>('HIGH');
  const [manualLocation, setManualLocation] = useState('');
  const [manualLat, setManualLat] = useState('28.6139');
  const [manualLng, setManualLng] = useState('77.2090');
  const [manualConfirmed, setManualConfirmed] = useState(false);
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

  const handleVerifyIncident = async (incidentId: string) => {
    setVerifyLoading(true);
    setVerifyError(null);
    try {
      await updateIncidentStatus(incidentId, 'VERIFIED');
    } catch (err: any) {
      console.error('[VERIFY] Failed to persist VERIFIED status:', err);
      setVerifyError('Unable to verify incident. The backend did not accept the transition. Please try again.');
    } finally {
      setVerifyLoading(false);
    }
  };

  const handleCreateManual = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualLocation || !manualDesc || !manualReporter) {
      alert('Please fill in required fields: Location, Situation, and Reporter Name.');
      return;
    }
    if (!manualConfirmed) {
      alert('Please search/select and confirm the location on the map before submitting.');
      return;
    }

    const lat = parseFloat(manualLat);
    const lng = parseFloat(manualLng);
    if (isNaN(lat) || isNaN(lng)) {
      alert('Invalid coordinates.');
      return;
    }

    const newId = await addManualIncident({
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
    setManualConfirmed(false);
  };

  return (
    <div className={styles.container}>
      
      <header className={`${styles.pageHeader} shaderHeaderWrapper`}>
        <ShaderBackground className="absolute inset-0" />
        <div className={styles.headerTitles}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap', marginBottom: '8px' }}>
            <span className={styles.eyebrow} style={{ marginBottom: 0 }}>{t('incidents.title')}</span>
            <PageGuideTrigger />
          </div>
          <h1 className={`${styles.title} reveal-block`} data-reveal-color="#EF4444">{t('incidents.title')}</h1>
          <p className={styles.lead}>{t('incidents.subtitle')}</p>
        </div>
        <div className={styles.headerActions}>
          <div className={styles.liveStatus}>
            <span className={styles.statusDot} />
            <span className={styles.statusLabel}>LIVE INCIDENT FEED</span>
          </div>
          <button className={styles.addBtn} onClick={() => setIsManualModalOpen(true)}>
            <Plus size={13} />
            <span>{t('incidents.logNewIncident')}</span>
          </button>
        </div>
      </header>

      {/* ── 2. Statistics Strip ── */}
      <section className={styles.statsStrip}>
        <div className={styles.statCell}>
          <span className={styles.statNum}>{summary.active}</span>
          <span className={styles.statLabel}>{t('common.active')}</span>
        </div>
        <div className={styles.statDivider} />
        <div className={styles.statCell}>
          <span className={`${styles.statNum} ${styles.criticalAccent}`}>{summary.critical}</span>
          <span className={styles.statLabel}>{t('incidents.severityCritical')}</span>
        </div>
        <div className={styles.statDivider} />
        <div className={styles.statCell}>
          <span className={`${styles.statNum} ${styles.warningAccent}`}>{summary.awaiting}</span>
          <span className={styles.statLabel}>{t('common.pending')}</span>
        </div>
        <div className={styles.statDivider} />
        <div className={styles.statCell}>
          <span className={`${styles.statNum} ${styles.successAccent}`}>{summary.under}</span>
          <span className={styles.statLabel}>{t('common.active')}</span>
        </div>
        <div className={styles.statDivider} />
        <div className={styles.statCell}>
          <span className={styles.statNum}>{summary.resolved}</span>
          <span className={styles.statLabel}>{t('common.completed')}</span>
        </div>
      </section>

      {/* ── 3. Filters & Search Control Bar ── */}
      <section className={styles.filterBar}>
        <div className={styles.searchWrapper}>
          <Search size={14} className={styles.searchIcon} />
          <input 
            type="text" 
            placeholder={t('incidents.searchPlaceholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className={styles.filterPills}>
          {[
            { id: 'ALL', label: t('common.all') },
            { id: 'CRITICAL', label: t('severity.CRITICAL') },
            { id: 'HIGH', label: t('severity.HIGH') },
            { id: 'MEDIUM', label: t('severity.MEDIUM') },
            { id: 'LOW', label: t('severity.LOW') },
            { id: 'AWAITING RESPONSE', label: t('incidents.awaitingResponse') },
            { id: 'UNDER RESPONSE', label: t('incidents.underResponse') },
            { id: 'RESOLVED', label: t('status.RESOLVED') }
          ].map(pill => (
            <button
              key={pill.id}
              className={`${styles.filterPill} ${activeFilter === pill.id ? styles.filterPillActive : ''}`}
              onClick={() => setActiveFilter(pill.id)}
            >
              {pill.label}
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
                  <th>{t('incidents.incident')}</th>
                  <th>{t('common.location')}</th>
                  <th>{t('common.severity')}</th>
                  <th>{t('incidents.reported')}</th>
                  <th>{t('incidents.impact')}</th>
                  <th>{t('common.status')}</th>
                  <th>{t('incidents.assignedUnit')}</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filteredAndSortedIncidents.length === 0 ? (
                  <tr>
                    <td colSpan={8} className={styles.emptyRow}>
                      <AlertCircle size={22} className={styles.emptyIcon} />
                      <p>{t('common.noResultsFound')}</p>
                      <span>{t('incidents.subtitle')}</span>
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
                            ● {t(`severity.${inc.severity}`) || inc.severity}
                          </span>
                        </td>
                        <td className="tech-code">
                          {new Date(inc.time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' })}
                        </td>
                        <td className={styles.impactCol}>{inc.peopleAffected ?? inc.displacedCount ?? '—'}</td>
                        <td>
                          <span className={`${styles.statusLabel} ${styles['status_' + inc.status]}`}>
                            {t(`status.${inc.status}`) || inc.status.replace(/_/g, ' ')}
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
          <ShaderBackground style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0.85, pointerEvents: 'none', zIndex: 0 }} />
          {selectedIncident ? (
            <div className={styles.ledgerContent}>
              
              {/* Header */}
              <div className={styles.ledgerHeader}>
                <div className={styles.titleArea}>
                  <div className={styles.metaRow}>
                    <span className="tech-code font-bold" style={{ color: '#FAF8F3' }}>{selectedIncident.id}</span>
                    <span className={`${styles.statusLabel} ${styles['status_' + selectedIncident.status]}`}>
                      {t(`status.${selectedIncident.status}`) || selectedIncident.status.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <h3 className={styles.ledgerTypeLabel}>
                    {selectedIncident.type.replace(/_/g, ' ')}
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
                    REPORTED: 0,
                    VERIFIED: 1,
                    PRIORITIZED: 2,
                    AWAITING_MATCH: 2,
                    RESOURCE_MATCHED: 3,
                    MATCHED: 3,
                    DISPATCHED: 4,
                    UNDER_RESPONSE: 5,
                    RESOLVED: 6,
                    ACTIVE: 2
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
                      <span className={styles.nodeLabel}>{t(`status.${step}`) || step.replace(/_/g, ' ')}</span>
                    </div>
                  );
                })}
              </div>

              {/* Context Actions */}
              <div className={styles.ledgerActions}>
                <Link
                  to={`/operations/incidents/${selectedIncident.id}`}
                  className={styles.primaryActionBtn}
                  style={{ textDecoration: 'none', textAlign: 'center', display: 'block', backgroundColor: '#E86F16' }}
                >
                  {t('common.view')} →
                </Link>

                {/* ── OFFICER-ONLY ACTIONS ── */}
                {isOfficer ? (
                  <>
                    {selectedIncident.status === 'REPORTED' && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <button
                          id="btn-verify-incident"
                          className={styles.primaryActionBtn}
                          disabled={verifyLoading}
                          onClick={() => {
                            setVerifyError(null);
                            handleVerifyIncident(selectedIncident.id);
                          }}
                        >
                          {verifyLoading ? 'VERIFYING…' : t('status.VERIFIED')}
                        </button>
                        {verifyError && (
                          <span style={{ color: '#EF4444', fontSize: '11px', lineHeight: 1.4 }}>
                            ⚠ {verifyError}
                          </span>
                        )}
                      </div>
                    )}

                    {selectedIncident.status === 'VERIFIED' && activeSubAction !== 'PRIORITY' && (
                      <button className={styles.primaryActionBtn} onClick={() => setActiveSubAction('PRIORITY')}>
                        {t('common.priority')}
                      </button>
                    )}

                    {selectedIncident.status === 'VERIFIED' && activeSubAction === 'PRIORITY' && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%' }}>
                        <span style={{ fontSize: '11px', fontWeight: 800, color: 'rgba(250, 248, 243, 0.6)', letterSpacing: '0.05em' }}>
                          ASSIGN SEVERITY LEVEL:
                        </span>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                          {['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map(sev => (
                            <button
                              key={sev}
                              className={styles.primaryActionBtn}
                              style={{
                                backgroundColor: sev === 'CRITICAL' ? '#EF4444' : sev === 'HIGH' ? '#F97316' : sev === 'MEDIUM' ? '#EAB308' : '#10B981',
                                padding: '8px 10px',
                                fontSize: '11px',
                                fontWeight: 'bold',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: 'pointer'
                              }}
                              onClick={() => {
                                // Close the panel immediately — optimistic update is instant
                                setActiveSubAction('NONE');
                                // Fire-and-forget backend persist (errors handled silently inside)
                                setIncidentPriority(selectedIncident.id, sev as Severity).catch(() => {});
                              }}
                            >
                              ● {sev}
                            </button>
                          ))}
                        </div>
                        <button
                          className={styles.primaryActionBtn}
                          style={{ backgroundColor: 'rgba(250,248,243,0.1)', color: '#FAF8F3', border: '1px solid rgba(250,248,243,0.2)' }}
                          onClick={() => setActiveSubAction('NONE')}
                        >
                          CANCEL
                        </button>
                      </div>
                    )}

                    {selectedIncident.status === 'PRIORITIZED' && (
                      <button 
                        className={styles.primaryActionBtn} 
                        onClick={() => updateIncidentStatus(selectedIncident.id, 'RESOURCE_MATCHED')}
                      >
                        {t('matching.runMatcher')}
                      </button>
                    )}

                    {selectedIncident.status === 'RESOURCE_MATCHED' && (
                      <button 
                        className={styles.primaryActionBtn}
                        onClick={() => {
                          const avail = vehicles.find(v => v.status === 'AVAILABLE');
                          if (avail) {
                            updateIncidentStatus(selectedIncident.id, 'DISPATCHED');
                          } else {
                            updateIncidentStatus(selectedIncident.id, 'DISPATCHED');
                          }
                        }}
                      >
                        {t('dashboard.dispatchFleet')}
                      </button>
                    )}

                    {(selectedIncident.status === 'DISPATCHED' || selectedIncident.status === 'UNDER_RESPONSE') && (
                      <div className={styles.actionRowGroup}>
                        {selectedIncident.status === 'DISPATCHED' && (
                          <button 
                            className={styles.primaryActionBtn} 
                            onClick={() => updateIncidentStatus(selectedIncident.id, 'UNDER_RESPONSE')}
                          >
                            {t('status.UNDER_RESPONSE')}
                          </button>
                        )}
                        <button 
                          className={`${styles.primaryActionBtn} ${styles.actionSuccess}`}
                          onClick={() => updateIncidentStatus(selectedIncident.id, 'RESOLVED')}
                        >
                          {t('status.RESOLVED')}
                        </button>
                      </div>
                    )}

                    {selectedIncident.status === 'RESOLVED' && (
                      <div className={styles.resolvedBanner}>
                        <Shield size={12} /> {t('status.RESOLVED')}
                      </div>
                    )}
                  </>
                ) : (
                  /* Civilian / unauthenticated: show lock notice */
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '10px 12px',
                    background: 'rgba(250, 248, 243, 0.06)',
                    border: '1px solid rgba(250, 248, 243, 0.12)',
                    borderRadius: '6px',
                    fontSize: '11px',
                    color: 'rgba(250, 248, 243, 0.5)',
                    fontWeight: 700,
                    letterSpacing: '0.05em',
                  }}>
                    <Shield size={12} style={{ flexShrink: 0 }} />
                    OFFICER LOGIN REQUIRED
                  </div>
                )}
              </div>

              {/* Geographic Small Preview */}
              <div className={styles.geoPreview}>
                <h4 className={styles.sectionTitle}>{t('common.location')}</h4>
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
                <h4 className={styles.sectionTitle}>{t('common.details')}</h4>
                <div className={styles.gridData}>
                  <div className={styles.gridRow}>
                    <span className={styles.gridLabel}>{t('incidents.reported')}</span>
                    <span className="tech-code" style={{ color: '#FAF8F3' }}>{new Date(selectedIncident.reportedAt || selectedIncident.time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' })}</span>
                  </div>
                  <div className={styles.gridRow}>
                    <span className={styles.gridLabel}>{t('incidents.impact')}</span>
                    <span style={{ color: '#FAF8F3' }}>{selectedIncident.peopleAffected ?? '—'}</span>
                  </div>
                  <div className={styles.gridRow}>
                    <span className={styles.gridLabel}>{t('common.location')}</span>
                    <span className="tech-code" style={{ color: '#FAF8F3' }}>{selectedIncident.coordinates.lat.toFixed(4)}° N, {selectedIncident.coordinates.lng.toFixed(4)}° E</span>
                  </div>
                </div>
              </div>

              {/* Situation assessment */}
              <div className={styles.detailsGrid}>
                <h4 className={styles.sectionTitle}>{t('common.description')}</h4>
                <DynamicText text={selectedIncident.description} className={styles.situationText} as="p" />
              </div>

              {/* Reporter Contact Card */}
              {(selectedIncident.reporterName || selectedIncident.reporterContact || selectedIncident.reporterPhone) && (
                <div className={styles.detailsGrid}>
                  <h4 className={styles.sectionTitle} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <User size={12} style={{ color: '#E86F16' }} /> REPORTER CONTACT
                  </h4>
                  <div className={styles.gridData}>
                    {selectedIncident.reporterName && (
                      <div className={styles.gridRow}>
                        <span className={styles.gridLabel}>Name</span>
                        <span style={{ color: '#FAF8F3', fontWeight: 600 }}>{selectedIncident.reporterName}</span>
                      </div>
                    )}
                    {(selectedIncident.reporterPhone || selectedIncident.reporterContact) && (
                      <div className={styles.gridRow}>
                        <span className={styles.gridLabel}>Phone</span>
                        <span className="tech-code" style={{ color: '#FAF8F3' }}>
                          {(() => {
                            const ph = selectedIncident.reporterPhone || selectedIncident.reporterContact || '';
                            return ph.length >= 7 ? ph.slice(0, 3) + ' ****' + ph.slice(-3) : ph || '—';
                          })()}
                        </span>
                      </div>
                    )}
                  </div>
                  {/* Action buttons */}
                  <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                    <a
                      href={`tel:${selectedIncident.reporterPhone || selectedIncident.reporterContact || ''}`}
                      style={{
                        flex: 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        padding: '8px 12px',
                        background: 'rgba(16, 185, 129, 0.15)',
                        border: '1px solid rgba(16, 185, 129, 0.4)',
                        borderRadius: '6px',
                        color: '#10B981',
                        fontSize: '11px',
                        fontWeight: 700,
                        letterSpacing: '0.08em',
                        textDecoration: 'none',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                      }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(16, 185, 129, 0.28)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'rgba(16, 185, 129, 0.15)')}
                    >
                      <Phone size={11} /> CALL
                    </a>
                    <a
                      href={`sms:${selectedIncident.reporterPhone || selectedIncident.reporterContact || ''}`}
                      style={{
                        flex: 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        padding: '8px 12px',
                        background: 'rgba(234, 179, 8, 0.15)',
                        border: '1px solid rgba(234, 179, 8, 0.4)',
                        borderRadius: '6px',
                        color: '#EAB308',
                        fontSize: '11px',
                        fontWeight: 700,
                        letterSpacing: '0.08em',
                        textDecoration: 'none',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                      }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(234, 179, 8, 0.28)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'rgba(234, 179, 8, 0.15)')}
                    >
                      <MessageSquare size={11} /> SMS
                    </a>
                  </div>
                </div>
              )}

            </div>
          ) : (
            <div className={styles.emptyLedger}>
              <div className={styles.emptyLedgerContent}>
                <AlertTriangle size={32} className={styles.emptyIcon} />
                <h4>{t('incidents.liveLedger')}</h4>
                <p>{t('incidents.subtitle')}</p>
              </div>
            </div>
          )}
        </div>

      </div>

      {/* --- + MANUAL INCIDENT LOG MODAL --- */}
      {isManualModalOpen && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>{t('incidents.createModalTitle')}</h3>
              <button className={styles.closeLedgerBtn} onClick={() => setIsManualModalOpen(false)}>
                <X size={18} />
              </button>
            </div>
            
            <form onSubmit={handleCreateManual} className={styles.modalForm}>
              <div className={styles.formGrid}>
                <div className={styles.formGroup}>
                  <label>{t('incidents.type')} *</label>
                  <select value={manualType} onChange={(e) => setManualType(e.target.value)}>
                    <option value="FLOOD">{t('incidents.typeFlood')}</option>
                    <option value="FIRE">{t('incidents.typeFire')}</option>
                    <option value="EARTHQUAKE">{t('incidents.typeEarthquake')}</option>
                    <option value="MEDICAL_EMERGENCY">{t('incidents.typeMedical')}</option>
                    <option value="STRUCTURAL_COLLAPSE">{t('incidents.typeLandslide')}</option>
                  </select>
                </div>
                
                <div className={styles.formGroup}>
                  <label>{t('common.severity')} *</label>
                  <select 
                    value={manualSeverity} 
                    onChange={(e) => setManualSeverity(e.target.value as Severity)}
                  >
                    <option value="CRITICAL">● {t('severity.CRITICAL')}</option>
                    <option value="HIGH">● {t('severity.HIGH')}</option>
                    <option value="MEDIUM">● {t('severity.MEDIUM')}</option>
                    <option value="LOW">● {t('severity.LOW')}</option>
                  </select>
                </div>

                <div className={styles.formGroup} style={{ gridColumn: 'span 2' }}>
                  <label>{t('common.location')} &amp; Map Verification *</label>
                  <AddressPicker 
                    onChange={(data, confirmed) => {
                      setManualLocation(data.address);
                      setManualLat(String(data.lat));
                      setManualLng(String(data.lng));
                      setManualConfirmed(confirmed);
                    }}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label>{t('incidents.affectedCount')}</label>
                  <input 
                    type="number" 
                    value={manualAffected}
                    onChange={(e) => setManualAffected(e.target.value)}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label>{t('incidents.commander')}</label>
                  <input 
                    type="text" 
                    value={manualSource}
                    onChange={(e) => setManualSource(e.target.value)}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label>{t('common.assignedTo')} *</label>
                  <input 
                    type="text" 
                    placeholder="Duty Officer Name"
                    value={manualReporter}
                    onChange={(e) => setManualReporter(e.target.value)}
                    required
                  />
                </div>

                <div className={styles.formGroup}>
                  <label>{t('common.notes')}</label>
                  <input 
                    type="text" 
                    placeholder="Contact info"
                    value={manualContact}
                    onChange={(e) => setManualContact(e.target.value)}
                  />
                </div>

                <div className={styles.formGroup} style={{ gridColumn: 'span 2' }}>
                  <label>{t('common.description')} *</label>
                  <textarea 
                    rows={4}
                    placeholder="..."
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
                  {t('common.cancel')}
                </button>
                <button type="submit" className={styles.submitFormBtn}>
                  <Send size={12} /> {t('common.submit')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <PageGuidebook guideKey="incidents" />
    </div>
  );
};

export default Incidents;
